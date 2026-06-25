# Talk2Sql v3.13.0 — Ariadne Brain 🧵🧠

**Ariadne now thinks like an SI / Enterprise / Solution Architect — and guides you, both ways.**

## What's new

**The architect rules engine.**
A deterministic reasoning layer over everything you've built — the dependency graph, Probe→Learn→Build priorities, domain loops, live detection, scope, and discovery. It works out:
- where you are (phase position + readiness);
- your **next moves**, with the architect's *why now* (prerequisites met, unblocks these dependents, N P1 items open);
- what's **blocked** and the exact prerequisites it's waiting on;
- an **EA-grade audit** — foundation gate, CX → SCM Item Master (PIM), ICM needs OM + AR + HCM workforce + sales resources, clean TCA first, detection drift, discovery gaps.

It's offline, never fabricates, and always cites the rule.

**Architect Guidance panel + agentic questions.**
At the top of Ariadne: phase + readiness, next moves, a **🔍 Run review** audit — and when scope or key discovery answers are missing, **Ariadne asks you**, with quick-pick answers that configure the app. The conversation runs both ways.

**Ask Ariadne.**
"What do I do first?" · "Why is ICM blocked?" · "Show my critical path" · "What does CX need?" — answered from the dependency and flow rules, citing the why.

**Claude, optionally.**
Connect your Anthropic API key and Ask-Ariadne answers with senior-architect reasoning, grounded in a live snapshot of your state. Without a key, the rules engine answers. Your key is stored **encrypted in your OS keychain** — it never touches the renderer, the code, or any log. AI guidance stays in the advisor panel; it never appears in the SQL grid or claims to be live pod data.

## Fixed — graph interaction
- **Left-click a box now opens its end-to-end loop.** The hover panel had been docked over the right-side nodes and was eating their clicks — fixed.
- **Right-click opens the connection popup at the node** (prerequisites and dependents, status-colored), right where you're looking. Hover just highlights the node's edges now.

## Connecting Claude
Open the Ariadne advisor → **⚙ Connect Claude** → paste your `sk-ant-…` key → Save. The status pill shows 🟢 when connected; **Disconnect** clears it from the keychain.

## Unchanged
Scope-driven roadmap, connection maps, end-to-end loop SQL, probe-the-pod, live edges, prioritization, full-screen, dependency engine, anti-fabrication guard. Parse checks and `npm test` pass.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
