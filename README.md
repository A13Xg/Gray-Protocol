# Gray Protocol

> v1.0.0-alpha — A headless, high-performance idle game engine

A modular idle game engine built with **Vue 3**, **TypeScript**, and **Vite**. Features:

- **Big-number scaling** via [break_eternity.js](https://github.com/Patashu/break_eternity.js)
- **Multi-resource system** — Money, Crypto, Parity, and Compute
- **Dual-path reputation architecture** — Bug Bounty vs Illegal Script
- **10 FPS game loop** with offline catch-up (capped at 24 h)
- **Persistent saves** — localStorage + Base64 export/import with NaN validation
- Optimised for static deployment on GitHub Pages

## Project Structure

```
src/
  core/
    config.ts       – TICK_RATE, OFFLINE_CAP, INITIAL_RESOURCES
    state.ts        – shallowReactive game state tree
    engine.ts       – resource engine, game loop, offline catch-up
    persistence.ts  – save/load & Base64 export/import
  utils/
    formatter.ts    – big-number formatter (1k–1B → letter notation ≥ 1e15)
  App.vue           – UI: System Log, Resources, Actions, Data Bridge
```

## Development

```bash
npm install
npm run dev       # dev server
npm run build     # production build (zero TS errors)
npm run preview   # preview production build
```
