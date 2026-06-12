# CupRider ⚽🏍️

**"Motocross meets the Pitch"** — Ride any World Cup curve like a motocross track.

A Stonkrider-inspired browser game using football data (FIFA rankings, player goals, match xG) as racing tracks.

## Quick Start

```bash
# Option 1: Simple static server
cd cuprider
npx serve .

# Option 2: Use any static file server
python -m http.server 8080
```

Open `http://localhost:8080` in your browser.

## Deployment to Cloudflare Pages

1. Push this folder to a Git repo
2. Connect to Cloudflare Pages
3. Build command: (none needed, it's static)
4. Output directory: `/` (root)
5. Done! Your site is live.

## Tech Stack

- **Vanilla JS** — No framework, zero dependencies, instant load
- **Canvas 2D** — Game engine with simple physics
- **DM Sans** — Google Fonts
- **Ionicons** — Icon library
- **PWA Ready** — Web manifest included

## Football Data APIs (for real data)

- **API-Football** (api-football.com) — Real-time match stats, xG, lineups
- **Football-Data.org** — Free tier, historical match data
- **FIFA World Ranking** — Public CSV datasets
- **StatsBomb Open Data** — Free xG and event data (GitHub)
- **World Cup Historical** — Kaggle datasets

## File Structure

```
cuprider/
├── index.html              # Main page
├── src/
│   ├── style.css           # Full design system
│   └── app.js              # App logic + Canvas game engine
└── public/
    ├── manifest.webmanifest
    └── data/
        ├── featured-tracks.json    # Trending football tracks
        └── legendary-crashes.json  # Legendary World Cup collapses
```

## Controls

- **↑ / W / Space / Tap** — Jump
- **↓ / S** — Brake

## Features

- 🔥 Trending Tracks (FIFA rankings, player goals)
- 💀 Legendary Crashes (Brazil 7-1, Italy DNQ, etc.)
- 🏆 Daily Challenge
- ⚽ Goal effects when riding big data spikes
- 📈 Cross-promotion with Stonkrider (stock mode link)
- 🏟️ FIFA World Cup 2026 mode teaser
- 📱 Mobile-first, touch controls
- 🎮 Full Canvas 2D game with physics

## Customize

- Add real API data by replacing JSON files in `/public/data/`
- Track format: `{ symbol, name, flag, difficulty, dataPoints: [{date, close}...] }`
- Colors in CSS custom properties (`:root` in style.css)

## License

MIT — Built independently, inspired by [Stonkrider](https://stonkrider.com)
