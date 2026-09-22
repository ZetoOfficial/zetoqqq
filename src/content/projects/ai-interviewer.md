---
title: 'AI Interviewer'
summary: 'A platform that runs technical interviews with an LLM, scores them against a competency model, and hands a draft of the feedback to a human.'
date: 2026-06-01
stack: ['Python', 'FastAPI', 'LangGraph', 'PostgreSQL', 'Redis', 'WebRTC', 'LiveKit']
url: 'https://ai-interviewer.zetoqqq.ru'
draft: false
---

Built with a team for AI Product Hack.

The interesting problem was not generating the report — it was that the
interview could not end until the report was ready, which made every session
hostage to the slowest model call. I moved report generation into background
jobs with retries and a reconciler that finds and restarts work orphaned by a
crash, so finishing the interview and producing the write-up stopped being the
same event.

Around that: a competency profile scored 0–10 with weighted blocks, a draft of
the candidate's feedback that a human confirms rather than writes, OpenAI
ASR/TTS adapters behind a config, and an LLM client that caches the structured
output call.

<!-- TODO: Pavel — say what you would do differently. That is the part people
     actually want to read. -->
