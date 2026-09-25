# LL Match Logger — Windows Desktop App v1.2.3

This is **v1.2.3** of LL Match Logger, the standalone Windows desktop build for football live logging.

## What changed in v1.2.3

- **Line-up parsing has been rewritten around Sky Sports' actual Teams section.** The parser ignores navigation, league tables and other team names before the Teams section.
- It identifies the two match teams from Sky's team image markers, so Sky labels such as **B'mouth** do not break matching with the fixture's **Bournemouth** name.
- It reads Sky's `shirt number → player name` structure for the 11 starters and separates the **Substitutes** block correctly.
- Captain markers and match-event minute lines are ignored rather than being treated as player names.
- The app refuses to save an automatic import unless both teams have exactly 11 starters, preventing a partial/incorrect import from being presented as successful.
- Sky fixture parsing from v1.2.1 is retained.
- No browser CORS proxy is required.
- No Node.js installation is required on the work laptop.

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
2. Keep `.github/workflows/build-windows.yml`.
3. Commit the changes.
4. Actions → **Build Windows App** → **Run workflow**.
5. Download the `LL-Match-Logger-Windows` artifact.
6. Extract it and run `LL-Match-Logger-1.2.3-portable.exe`.

The app itself also displays **v1.2.3** in the interface so the version being tested is unambiguous.


## v1.2.3
Line-up retrieval now opens the Sky Sports Teams-tab URL (`/teams/<match-id>`) before parsing. v1.2.2 was parsing the base match-centre URL, which can omit the Teams section. The in-app error banner now shows the parsed starter counts if a future Sky markup change causes a failure.
