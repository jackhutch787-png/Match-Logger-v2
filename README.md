# LL Match Logger v2.2

Sky Sports-based Windows football live logging application.

## v2.2 corrections
- Opens on **Matches / Fixtures** by default.
- Hard whitelist of exactly nine competitions; unsupported headings terminate the active section so WSL2/Irish/Scottish/etc. cannot inherit a supported label.
- Preserves scheduled kick-off times from Sky and, for completed fixtures where the daily scores page only shows FT, resolves the fixture through the relevant Sky team page to recover the original kick-off.
- Resolves a real Sky match/Teams link lazily from the selected fixture when the daily fixture card has no usable href.
- Imports line-ups only when 11 starters are found for each side. Manual Team Sheets remains available as fallback.

## Supported competitions
- Premier League
- Championship
- League One
- League Two
- WSL
- EFL Trophy
- Carabao Cup
- UEFA Europa League
- UEFA Europa Conference League

## Build
Keep the existing GitHub Actions workflow at `.github/workflows/build-windows.yml` and run **Build Windows App**.
