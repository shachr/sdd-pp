## REMOVED Requirements

### Requirement: Stats command flag
**Reason**: The stats command is released; it no longer needs the TEXTKIT_STATS_CLI flag.
**Migration**: Stop setting TEXTKIT_STATS_CLI; `textkit stats` is always available.
