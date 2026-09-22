# Деплой zetoqqq.ru: runbook

Этот документ — для плохого дня. Здесь только команды и то, что они должны
вывести. Если написанное разошлось с реальностью — реальность важнее,
проверяйте `.github/workflows/deploy.yml` в репозитории и
`/etc/nginx/sites-available/zetoqqq.ru` на сервере.

**Сервер:** `89.110.93.237`, Ubuntu 24.04, 1 vCPU / 1.9 GiB RAM, диск 50 ГБ.
**Домен:** `zetoqqq.ru` (плюс `www`, который редиректит на apex).
**Пользователь деплоя:** `deploy`, ключ — `~/.ssh/zetoqqq-deploy` на машине владельца.
**Каталог сайта:** `/var/www/zetoqqq.ru`.

```bash
ssh -i ~/.ssh/zetoqqq-deploy deploy@89.110.93.237
```

Под root (свой личный ключ, для правки nginx — у `deploy` нет sudo):

```bash
ssh zetoqqq.ru
```

---

## 0. Сервер общий. Это важно

На этой машине живёт не только этот сайт. Один nginx на хосте держит порты
80/443 и обслуживает сразу несколько проектов:

| Домен | Что это | Куда проксирует |
|---|---|---|
| `zetoqqq.ru` | **этот сайт**, статика с диска | `/var/www/zetoqqq.ru/current` |
| `zetoqqq.ru/hh_ok` | `hhok.service`, чужой Go-бинарь | `127.0.0.1:8080` |
| `tax-residency-calculator.zetoqqq.ru` | docker, GHCR | `127.0.0.1:8091` |
| `wedding.zetoqqq.ru` | docker, GHCR | `127.0.0.1:8081`, `:8082` |
| `code.zetoqqq.ru` | rustpad | `127.0.0.1:3030` |

Отсюда два следствия, которые стоит держать в голове:

1. **Ошибка в nginx-конфиге кладёт не только этот сайт, а все пять.** Поэтому
   любая правка — только через `nginx -t` до `systemctl reload nginx` (см. раздел 5).
2. **`/hh_ok` не имеет отношения к сайту и был здесь раньше него.** Это
   OAuth-callback стороннего сервиса. В vhost есть отдельный `location = /hh_ok`,
   который нельзя терять при правках. Smoke test в CI специально проверяет, что
   этот роут жив.

---

## 1. Что где живёт

```
/var/www/zetoqqq.ru/
├── releases/
│   ├── 1fc01ee/          ← распакованный dist/ одной сборки
│   ├── 387a980/
│   └── ...               ← хранятся 5 последних
└── current -> releases/1fc01ee
```

`root` в nginx указывает на `current`. Деплой — это залить новый каталог в
`releases/` и переставить симлинк. Отсюда два свойства: переключение
атомарно (см. ниже) и откат не требует пересборки.

Чего в этой схеме **нет** и не должно появиться: базы, секретов, `.env`. Сайт —
чистая статика, весь конфиг живёт в репозитории.

| Что | Кто пишет |
|---|---|
| `/var/www/zetoqqq.ru/releases/*`, `current` | только CI |
| `/etc/nginx/sites-available/zetoqqq.ru` | **только вручную под root**, CI его не трогает |
| TLS-сертификаты (`/etc/letsencrypt/`) | certbot сам, по таймеру |

---

## 2. Как выкатывается

Пайплайн — `.github/workflows/deploy.yml`, два джоба.

1. **`test`** — `npm ci`, `npx astro check` (тайпчек), `npm run test:unit`.
2. **`deploy`** — только на `master`: `npm run build`, `rsync` каталога `dist/`
   в `releases/<короткий SHA коммита>`, переключение симлинка `current`, удаление
   старых релизов, затем smoke test по `https://zetoqqq.ru`.

**Обычный путь:** push в `master` → оба джоба по цепочке → если зелено, сайт
обновился. Ручных шагов нет.

**Ручной запуск:** Actions → workflow **Deploy** → **Run workflow** → ветка
`master`, поле `release` оставить пустым.

**E2E-тесты в пайплайн не входят.** `npm test` локально гоняет и unit, и
Playwright; CI гоняет только unit — установка браузеров стоила бы минуты на
каждый прогон. Перед крупными изменениями вёрстки прогоняйте `npm run test:e2e`
руками.

### Почему переключение атомарно

Наивный `ln -sfn` на уже существующий симлинк не атомарен: под капотом это
`unlink` + `symlink`, и между ними есть окно, в котором `current` не существует —
запрос, попавший в это окно, получит 404. Поэтому workflow создаёт
`current.tmp` и делает `mv -T current.tmp current`: это `rename(2)`, который
атомарен на уровне ядра. Промежуточного состояния не существует.

### Что означает зелёный пайплайн

Smoke test проверяет, что `/`, `/projects/`, `/blog/` и `/rss.xml` отвечают 200,
что `/` отдаёт настоящий HTML (а не пустой 200 — ровно так выглядела заглушка,
стоявшая на домене до появления сайта, и проверки одного лишь кода ответа было
бы недостаточно), и что `/hh_ok` по-прежнему отвечает.

Чего он **не** проверяет: что вёрстка не разъехалась, что ссылки ведут куда
надо и что контент тот, который вы ожидали. Зелёный деплой — это «файлы на
месте и отдаются», не «сайт выглядит правильно». После заметных изменений
откройте сайт глазами.

---

## 3. Как откатиться

Откат здесь дешёвый: пересобирать ничего не нужно, все последние релизы уже
лежат на сервере.

Посмотреть, что доступно (самый свежий сверху, звёздочкой отмечен текущий):

```bash
ssh -i ~/.ssh/zetoqqq-deploy deploy@89.110.93.237 \
  'cd /var/www/zetoqqq.ru/releases && ls -1t && echo "--- current:" && readlink -f ../current'
```

Дальше: Actions → **Deploy** → **Run workflow** → ветка `master` → в поле
`release` вписать имя каталога релиза → Run workflow.

Джоб `test` при заполненном `release` пропускается целиком, сборка тоже — CI
просто переставляет симлинк на уже лежащий каталог и прогоняет smoke test.
Занимает секунды.

Если вписать релиз, которого на сервере нет, деплой упадёт **до** того, как
что-либо тронет, и напечатает список доступных каталогов. Текущий релиз при
этом остаётся на месте.

**Совсем аварийный вариант**, если GitHub недоступен, — переставить симлинк руками:

```bash
ssh -i ~/.ssh/zetoqqq-deploy deploy@89.110.93.237
cd /var/www/zetoqqq.ru
ln -sfn /var/www/zetoqqq.ru/releases/<нужный> current.tmp && mv -T current.tmp current
readlink -f current
```

Перезагружать nginx после этого не нужно: `root` указывает на симлинк, и nginx
разрешает его на каждом запросе.

### Про `!cancelled()` в условии джоба

Условие `deploy` выглядит так:

```
!cancelled() && github.ref == 'refs/heads/master'
             && (needs.test.result == 'success' || inputs.release != '')
```

`!cancelled()` здесь не украшение. GitHub Actions неявно подставляет `success()`
к любому `if:`, который сам не начинается со status-функции, а `success()`
требует успеха **всех** upstream-джобов. При откате `test` пропускается, а
`skipped` — это не `success`, и без `!cancelled()` джоб `deploy` не запустился
бы вообще. При этом ручная отмена прогона кнопкой Cancel по-прежнему
останавливает деплой, как и задумано.

---

## 4. Когда что-то сломалось

**Сайт отдаёт 404 на всё.** Скорее всего симлинк указывает в никуда:

```bash
ssh -i ~/.ssh/zetoqqq-deploy deploy@89.110.93.237 \
  'ls -la /var/www/zetoqqq.ru/ && ls /var/www/zetoqqq.ru/current/ | head'
```

Ожидаемый вывод — `current -> /var/www/zetoqqq.ru/releases/<sha>` и список
файлов сборки (`index.html`, `_astro`, `blog`, `projects`, ...). Если
`readlink` показывает несуществующий каталог — переставьте симлинк руками
(раздел 3).

**Сайт отдаёт пустой 200 вместо страниц.** Это поведение старой заглушки,
значит кто-то вернул прежний vhost. Сравните с бэкапами в `/root/`:

```bash
ssh zetoqqq.ru 'ls -la /root/nginx-zetoqqq.ru.bak.*'
```

**Логи nginx** (под root; отдельного лог-файла у сайта нет, всё в общих):

```bash
ssh zetoqqq.ru 'tail -50 /var/log/nginx/error.log'
ssh zetoqqq.ru 'tail -50 /var/log/nginx/access.log'
```

**Деплой падает на «Permission denied (publickey)».** Проверьте, что публичный
ключ на месте:

```bash
ssh zetoqqq.ru 'grep -c zetoqqq-site /home/deploy/.ssh/authorized_keys'
```

Ожидается `1`. Если `0` — ключ потерялся, см. раздел 6.

**Кончился диск.** На машине копится докерный мусор от соседних проектов —
это самая вероятная причина странных отказов:

```bash
ssh zetoqqq.ru 'df -h / && docker system df'
ssh zetoqqq.ru 'docker builder prune -af && docker image prune -af'
```

`docker builder prune` безопасен: это кэш сборки, он пересоберётся. `image
prune -af` удалит образы, на которые не ссылается ни один контейнер — соседние
проекты переживут, они перекачают образ при следующем `docker compose pull`.

---

## 5. Как поменять nginx-конфиг

У `deploy` нет sudo — это намеренно: у CI не должно быть прав ронять чужие
сайты на этой машине. Правки конфига только руками под root, и только в таком
порядке:

```bash
ssh zetoqqq.ru
cp /etc/nginx/sites-available/zetoqqq.ru /root/nginx-zetoqqq.ru.bak.$(date +%Y%m%d-%H%M%S)
vim /etc/nginx/sites-available/zetoqqq.ru
nginx -t && systemctl reload nginx
```

**`nginx -t` перед reload — не формальность.** Конфиг общий на все пять сайтов
на этой машине; `reload` с битым конфигом nginx отвергнет, но `restart` — нет,
и тогда упадёт всё. Пользуйтесь `reload`.

Помните про `location = /hh_ok` (раздел 0) — его легко потерять при
переписывании файла.

---

## 6. Ключи и секреты

Пайплайну нужны три секрета репозитория (Settings → Secrets → Actions):

| Секрет | Значение |
|---|---|
| `SERVER_HOST` | `89.110.93.237` |
| `SERVER_USER` | `deploy` |
| `SERVER_SSH_KEY` | приватный ключ `~/.ssh/zetoqqq-deploy` целиком, вместе со строками `BEGIN`/`END` |

Ключ выделенный, только для этого репозитория (у соседних проектов на той же
машине свой, `github-actions-deploy`). Компрометация одного репозитория не даёт
доступа от имени остальных.

Если ключ нужно перевыпустить:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/zetoqqq-deploy -C github-actions-zetoqqq-site
ssh-copy-id -i ~/.ssh/zetoqqq-deploy.pub deploy@89.110.93.237   # или вручную под root
gh secret set SERVER_SSH_KEY -R ZetoOfficial/zetoqqq < ~/.ssh/zetoqqq-deploy
```

Старую строку из `/home/deploy/.ssh/authorized_keys` после этого удалите.

**Про верификацию хоста.** Workflow берёт ключ хоста через `ssh-keyscan`, то
есть доверяет ему при первом подключении (TOFU), а не сверяет с заранее
закреплённым отпечатком. Для статического личного сайта это осознанный размен
на простоту: IP и так публичен через DNS, а красть с сервера нечего. Если
когда-нибудь это перестанет устраивать — закрепите ключ хоста четвёртым
секретом вместо `ssh-keyscan`.

---

## 7. TLS

Сертификат Let's Encrypt на `zetoqqq.ru` + `www.zetoqqq.ru`, выпущен certbot'ом,
продлевается сам — `certbot.timer` активен. Руками трогать ничего не нужно.

Проверить срок:

```bash
echo | openssl s_client -connect zetoqqq.ru:443 -servername zetoqqq.ru 2>/dev/null \
  | openssl x509 -noout -dates
```

Если до истечения меньше 30 дней и таймер по какой-то причине не сработал:

```bash
ssh zetoqqq.ru 'systemctl status certbot.timer && certbot renew --dry-run'
```
