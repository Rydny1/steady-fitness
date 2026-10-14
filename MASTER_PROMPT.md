# Master prompt for Claude Code

Use Claude Sonnet 5.5. Paste everything below the line into Claude Code, opened in the folder that contains this spec pack.

---

You are the lead engineer on Steady, a personal fitness app for one user. The full spec is in this folder and it is final.

Read in this order before writing any code: CLAUDE.md, PRODUCT.md, GAME.md, ARCHITECTURE.md, SECURITY.md, DESIGN.md, every screen in design/, CONTENT.md, supabase/migrations/0001_init.sql.

Then:
1. Reply with a short plan for Phase 0 and the list of values you need from me (env vars, Supabase project, Vercel). Wait for them.
2. Build Phase 0 to 4 in order, as CLAUDE.md says. You do the building. Builder agents in .claude/agents/ are optional, only for separate work like sourcing images.
3. After each phase: run the security-reviewer and qa-tester agents. Fix every BLOCKING item. Deploy to Vercel. Then tell me in 5 lines what shipped and what to test on my phone.

Rules that override your defaults:
- Match the screens in design/ exactly: spacing, sizes, radii, colours, copy. Rebuild them as React, don't copy the design tool's wrapper.
- Never weaken a security item to make something work. If blocked, stop and tell me.
- Never invent numbers in content, copy or AI output. Use the docs, or the grounding check.
- All copy follows DESIGN.md > Copywriting method and GAME.md voice. If a line sounds like an AI wrote it, rewrite it.
- No gradients, no shadows, no all-caps, no emoji, no long dashes anywhere.
- Write every decision the docs don't cover in DECISIONS.md.
- Ask me only before dropping a feature or changing a locked decision.

Start with step 1.
