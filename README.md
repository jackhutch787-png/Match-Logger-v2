# LL Match Logger v2.3 — FotMob Fixture Parser Test

This test build switches the Fixtures screen from Sky Sports scraping to FotMob structured match data.

## Test scope
- Daily fixtures from FotMob
- Hard whitelist: Premier League, Championship, League One, League Two, WSL, EFL Trophy, Carabao Cup, UEFA Europa League, UEFA Europa Conference League
- UK kick-off times from FotMob `status.utcTime`
- FotMob match ID retained on every fixture for future lineup retrieval
- Existing logging workflow retained

Lineup retrieval has deliberately not been switched to FotMob in this parser-test build. First confirm fixture coverage, competition filtering and kick-off times.
