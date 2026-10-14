# CLAUDE.md

Project instructions for Claude Code. The shared rules for every coding agent
live in AGENTS.md and are imported here, so keep edits there rather than
duplicating them.

@AGENTS.md

## Claude Code specifics

- Work on a feature branch and only open a pull request when asked.
- Prefer small, verifiable steps: run `pnpm typecheck` and
  `pnpm exec biome ci .` after each meaningful change, not only at the end.
- If a task needs Supabase credentials, a decision from the team (issues
  labelled `needs group decision`), or a change in the `phlask-map` repo,
  stop and say so instead of guessing.
- Personal settings belong in `.claude/settings.local.json`, which is
  git-ignored. Don't commit them.
