# LL Match Logger v2.4

Gallery-focused football logger.

## v2.4 changes
- Keeps the proven FotMob fixture parser from v2.3.
- Get Line-ups uses the selected fixture's stored FotMob match ID and FotMob matchDetails lineup data.
- Validates the returned match and requires 11 starters for both teams before populating.
- Home and away starting XIs and substitutes are displayed side-by-side with no internal lineup scrolling at the app's normal desktop size.
- Larger interface typography, with larger/high-contrast timecodes in the event log.
- Clip number, EVS and Notes fields can be typed continuously without rerendering the row on every keystroke.
- Manual Team Sheets remain available as fallback.
- Fixtures remain the opening screen.

Build using the existing GitHub Actions workflow.
