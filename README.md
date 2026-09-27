# LL Match Logger — Windows Desktop App v1.2.4

This is **v1.2.4** of LL Match Logger, the standalone Windows desktop build for football live logging.

## What changed in v1.2.4

- **Line-up retrieval now follows Sky Sports' own Teams link from the match centre.** The app no longer guesses the Teams URL from Sky's fixture URL.
- **Old/invalid cached team sheets are discarded** when a fixture is opened, so a previous bad parse cannot remain on screen.
- The Sky Teams parser is restricted to the actual **Teams** section and stops at **Match Officials**.
- Sky's player format of shirt number → player name is handled, including event-minute lines between players.
- Captain markers are removed from player names.
- An automatic import is accepted only when both sides contain exactly 11 starters.
- Fixture parsing from the working v1.2.1 build is retained.

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

## Build on GitHub

1. Replace the repository's `index.html`, `package.json`, and `README.md` with these files.
2. Keep the existing `.github/workflows/build-windows.yml` workflow.
3. Commit the changes.
4. Go to **Actions → Build Windows App → Run workflow**.
5. Download the `LL-Match-Logger-Windows` artifact.
6. Extract it and run `LL-Match-Logger-1.2.4-portable.exe`.

The app itself displays **v1.2.4** in the interface so the version being tested is unambiguous.
