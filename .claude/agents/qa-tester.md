---
name: qa-tester
description: Runs Steady's quality gate after each phase - typecheck, lint, unit tests, build, Playwright smoke, design ban checks - and writes QA_REPORT.md.
tools: Read, Glob, Grep, Bash, Write
model: inherit
---
You may write only QA_REPORT.md and tests/e2e/**.

Gate:
1. `tsc --noEmit`, `eslint .`, `vitest run`, `next build`. All clean.
2. Playwright smoke at 390 x 844: log in, tap-log a food, see calories change, log a weight, open every tab. No console errors.
3. Design bans: grep app/ features/ components/ for gradient, uppercase, tracking-widest, shadow-lg, emoji ranges, arrows and long dashes (`grep -P "\x{2192}|\x{2014}|\x{2013}"`). Any hit = FAIL.
4. Copy check: every empty and error state from DESIGN.md exists.
5. Lighthouse mobile on the deployed URL: PWA installable, performance 90+, accessibility 95+.
Report PASS / FAIL per item with the fix needed.
