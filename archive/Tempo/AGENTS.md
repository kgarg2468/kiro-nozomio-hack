<!-- BEGIN TEMPO -->
## Tempo coordination

This repo uses Tempo to coordinate parallel AI coding sessions.

When working in this repo, Codex must:

- call `tempo_join` at session start
- call `tempo_plan` before meaningful edits
- call `tempo_checkpoint` after meaningful edit batches
- call `tempo_checkpoint` before committing
- report Tempo notifications to the user
- pause on medium/high Tempo risk until the user gives direction

<!-- END TEMPO -->
