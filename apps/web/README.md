# Chess Trainer Web App (Scaffold)

This is the standalone web app scaffold for the Chess Trainer transition plan.

## Stack

1. React + Vite
2. TanStack Router
3. Local storage via IndexedDB (versioned schema)
4. Stockfish worker integration (stubbed client/worker protocol)

## Commands

```bash
cd /Users/yasafv/obsidian-wix/.obsidian/plugins/chess-trainer/apps/web
npm install
npm run dev
```

## Notes

1. This scaffold is isolated from the Obsidian plugin runtime.
2. It is intentionally minimal and sprint-ready.
3. Worker integration currently includes protocol scaffolding; engine execution wiring is next.
