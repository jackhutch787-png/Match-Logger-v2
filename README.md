# LL Match Logger — Windows Desktop App v1.2.5

This is **v1.2.5** of LL Match Logger, the standalone Windows desktop build for football live logging.

## What changed in v1.2.5

- **Line-up retrieval now resolves Sky's real Teams URL in the Electron/Sky renderer**, instead of relying on a guessed match ID.
- The Teams-link resolver checks both the rendered DOM and the returned HTML for Sky's canonical `/teams/<match-id>` link.
- The Sky page readiness check now waits for match-centre Teams links and Teams pages as well as Scores & Fixtures.
- The lineup parser remains restricted to the actual Teams section and requires exactly 11 starters for both sides before accepting an import.
- Slightly increased interface text sizes across the logger, fixture list, controls and event log for readability.
- The working Sky fixture parser is retained unchanged.


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

1. Replace the repository's `index.html`, `main.js`, `preload.js`, `package.json`, and `README.md` with these files.
2. Keep the existing `.github/workflows/build-windows.yml` workflow.
3. Commit the changes.
4. Go to **Actions → Build Windows App → Run workflow**.
5. Download the `LL-Match-Logger-Windows` artifact.
6. Extract it and run `LL-Match-Logger-1.2.5-portable.exe`.

The app itself displays **v1.2.5** in the interface so the version being tested is unambiguous.
