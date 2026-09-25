# LL Match Logger — Windows Desktop App v1.2.1

This is **v1.2.1** of LL Match Logger, the standalone Windows desktop build for football live logging.

## What changed in v1.2.1

- Sky fixture parsing now supports **scheduled, live, completed and postponed** match formats. This fixes historical dates where Sky shows scores instead of `vs` + kick-off time.

- Uses the Sky Sports Scores & Fixtures page through the desktop Electron process.
- Correctly recognises Sky's branded competition headings such as **EFL League One** and **EFL League Two**.
- Handles Sky's fixture markup where the human-readable `Team A vs Team B` text is stored in the surrounding fixture element rather than directly inside the fixture link.
- Includes a body-text fallback parser for Sky's rendered fixture list.
- Waits for Sky's client-rendered page to populate before parsing, rather than relying on a short fixed delay.
- Restricts fixtures to these competitions:
  - Premier League
  - Championship
  - League One
  - League Two
  - WSL
  - EFL Trophy
  - Carabao Cup
  - UEFA Europa League
  - UEFA Europa Conference League
- No browser CORS proxy is required.
- No Node.js installation is required on the work laptop.

## Build on GitHub

1. Replace the repository's `index.html`, `main.js`, `package.json`, and `README.md` with these files.
2. Keep `.github/workflows/build-windows.yml`.
3. Commit the changes.
4. Actions → **Build Windows App** → **Run workflow**.
5. Download the `LL-Match-Logger-Windows` artifact.
6. Extract it and run:

`LL-Match-Logger-1.2.1-portable.exe`

The app itself also displays **v1.2.1** in the interface so the version being tested is unambiguous.
