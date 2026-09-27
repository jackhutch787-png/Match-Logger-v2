# LL Match Logger v2

Sky Sports-based Windows football live logging application.

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

The fixture importer uses a hard whitelist of these nine competitions. Other Sky Sports football competitions are ignored.

Line-ups are requested per selected fixture from Sky Sports' match/Teams page. Automatic line-ups are accepted only when 11 starters are recovered for both teams; Team Sheets remains available for manual entry.

## Build
Use the existing GitHub Actions workflow: `.github/workflows/build-windows.yml`.
