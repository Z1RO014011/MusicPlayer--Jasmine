# Jasmine

[中文](README.md) | English

A full-featured desktop music player built with **Vite + React 18 + TypeScript + Electron**.

## Features

- **Online Music** — Netease Cloud Music search, playlists, artists, albums, QR login, lyrics, and playback
- **Discover** — Hot searches, recommendations, playlist categories, and charts
- **Source Abstraction** — MusicSource interface is in place; Netease is currently registered. `youtubei.js` is reserved for future YouTube integration but is not wired into the UI/source registry yet.
- **Local Music** — Import multiple audio files, read metadata, and persist audio data in IndexedDB
- **Lyrics Display** — Apple Music-style LRC sync, scrolling highlight, and lyric editing
- **Playlist Management** — Create, delete, rename playlists; upload an image or pick a gradient cover
- **Playback Controls** — Play/pause, previous/next, seek, volume, and playback queue
- **Playback Modes** — Shuffle and repeat (off / all / one)
- **Playback History** — Automatically records listening history and groups it by time
- **Internationalization** — Chinese and English UI
- **Song Sharing** — Generate beautiful share cards, download as PNG
- **Keyboard Shortcuts** — Space / → / ← / ↑ / ↓ / S / R / Shift+→ / Shift+←
- **Dark Theme** — Jasmine's own dark glass UI

## Quick Start

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/music-player/` in your browser.

`npm run dev` starts both the frontend and the local Netease API service, so online search, QR login, lyrics, and streaming work out of the box.

If you only need the frontend UI, use:

```bash
npm run dev:frontend
```

> Online features depend on the local Netease API service at `http://127.0.0.1:3000`. Electron mode starts that service automatically.
>
> If the frontend is not started together with the NetEase API via `npm run dev`, and the API is hosted separately, set `VITE_NETEASE_API_BASE_URL` before starting the frontend, for example: `VITE_NETEASE_API_BASE_URL=http://your-api-host:3000 npm run dev:frontend`.

### Desktop App (Download Installer)

No Node.js required — download and run the installer for your platform:

| Platform | Download | Notes |
|----------|----------|-------|
| macOS (Apple Silicon) | [Jasmine-2.1.0-arm64.dmg](https://github.com/Z1RO014011/MusicPlayer--Jasmine-/releases/download/v2.1.0/Jasmine-2.1.0-arm64.dmg) | DMG installer |
| macOS (Apple Silicon) | [Jasmine-2.1.0-arm64-mac.zip](https://github.com/Z1RO014011/MusicPlayer--Jasmine-/releases/download/v2.1.0/Jasmine-2.1.0-arm64-mac.zip) | ZIP portable |
| macOS (Intel x64) | [Jasmine-2.1.0.dmg](https://github.com/Z1RO014011/MusicPlayer--Jasmine-/releases/download/v2.1.0/Jasmine-2.1.0.dmg) | DMG installer |
| macOS (Intel x64) | [Jasmine-2.1.0-mac.zip](https://github.com/Z1RO014011/MusicPlayer--Jasmine-/releases/download/v2.1.0/Jasmine-2.1.0-mac.zip) | ZIP portable |
| Windows (x64) | [Jasmine.Setup.2.1.0.exe](https://github.com/Z1RO014011/MusicPlayer--Jasmine-/releases/download/v2.1.0/Jasmine.Setup.2.1.0.exe) | NSIS installer |

> No Linux AppImage is uploaded for v2.1.0 yet. See the [Release page](https://github.com/Z1RO014011/MusicPlayer--Jasmine-/releases/tag/v2.1.0) for all current assets.

> After downloading, open and run directly. On first launch, macOS users need to go to **System Settings → Privacy & Security** and click "Open Anyway".

### Developer Mode (Run from Source)

```bash
npm install
npm run electron:dev
```

Or build the installer:

```bash
npm run electron:build        # current platform
npm run electron:build:all    # all configured platforms
```

Build artifacts are in the `release/` directory.

## Tech Stack

| Tech | Purpose |
|------|---------|
| Vite 6 | Build tool |
| React 18 | UI framework |
| TypeScript | Type safety |
| Electron 41 | Desktop app shell |
| IndexedDB | Audio file storage |
| localStorage | Metadata, lyrics, cookies, and URL cache |
| NeteaseCloudMusicApi | Local Netease Cloud Music API service |
| youtubei.js | Reserved YouTube dependency, not yet integrated |
| music-metadata | Audio metadata parsing |

## Project Structure

```
src/
├── main.tsx                  # Entry point
├── App.tsx                   # Main layout + view routing + shortcuts
├── App.css                   # All styles
├── types.ts                  # TypeScript type definitions
├── data.ts                   # Gradient presets
├── electron.d.ts             # Electron API declarations
├── lib/
│   ├── db.ts                 # IndexedDB + localStorage persistence
│   ├── metadata.ts           # Local audio metadata parser
│   ├── neteaseApi.ts         # Netease API wrapper
│   ├── lyrics.ts             # LRC parser
│   ├── share.ts              # Share card generation
│   └── sources/              # Music source abstraction
├── i18n/                     # Translations
├── context/                  # Global state management
├── hooks/                    # Custom hooks
└── components/
    ├── Sidebar.tsx
    ├── PlayerBar.tsx
    ├── NowPlayingView.tsx
    ├── DiscoverView.tsx
    ├── SearchView.tsx
    ├── LibraryView.tsx
    ├── PlaylistDetail.tsx
    ├── LyricsView.tsx
    ├── QueueView.tsx
    ├── HistoryView.tsx
    ├── AlbumListView.tsx
    ├── SettingsView.tsx
    └── CreatePlaylistModal.tsx
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `→` | Next track |
| `←` | Previous track |
| `Shift + →` | Forward 5 seconds |
| `Shift + ←` | Backward 5 seconds |
| `↑` | Volume +10% |
| `↓` | Volume -10% |
| `S` | Toggle shuffle |
| `R` | Toggle repeat mode |

## AI Development Experience

This project was entirely generated by **DeepSeek V4 Flash** through conversational interaction. Here's a summary of the collaborative process.

### Workflow

1. **Make a request** — Describe the desired feature (e.g., "build a Spotify-style music player")
2. **AI generates code** — AI generates complete file code in one pass
3. **Build file by file** — From project scaffold to individual components, generated one file at a time
4. **Iterate and improve** — Submit new requirements or modifications, AI updates the corresponding code
5. **Run and verify** — Test as you go; report any issues directly to AI for fixes

### Key Milestones

| Phase | Content |
|-------|---------|
| Scaffolding | Vite + React + TS initialization |
| Basic UI | Spotify dark theme layout (sidebar + player bar + main content area) |
| Playback Logic | HTML5 Audio for play/pause/seek/volume |
| Import Feature | Multi-file upload + auto-detect audio duration |
| Playlist System | Create/delete/rename/add/remove songs |
| Persistence | localStorage + IndexedDB saves everything |
| Fullscreen UI | NowPlayingView with dynamic blurred gradient background |
| Shortcuts | Keyboard controls for playback, volume, shuffle, repeat |
| Deployment | GitHub Pages + gh-pages |

### Real-World Issues & Fixes

| Issue | Solution |
|-------|----------|
| Browser blocks autoplay | Removed Web Audio API, switched to `<audio>` element + user gesture trigger |
| Where to store audio files | IndexedDB for file data, localStorage for metadata |
| Data lost on refresh | Restore all state from localStorage/IndexedDB on load |
| Multiple audio sources playing simultaneously | Single global `<audio>` element, switch src |
| Messy filenames | Auto-extract filename as song title on import, editable in UI |

### Takeaways

- **AI excels at scaffolding from scratch**: Let AI produce a complete, runnable version first, then iterate on top of it — far more efficient than asking step by step
- **Be specific with requirements**: The more precise the description ("240px sidebar on the left, three nav items"), the more accurate the AI output
- **AI is great at CSS**: Spotify-style CSS details (gradients, blurs, border-radius, shadows) were handled by AI in one shot, saving a huge amount of styling time
- **Bug fixes are fast**: Just throw the error message at AI — it usually locates and fixes the issue quickly
- **Human oversight is still needed**: AI-generated code occasionally has redundancies or minor bugs; running the dev server to validate is essential
- **The entire project from zero to GitHub release was completed entirely through conversation**, without writing a single line of code by hand

### For Those Who Want to Try

This project proves that **building a fully functional web application with AI is entirely feasible**. You don't need to be proficient in React or TypeScript — you just need to:
1. Know what features you want
2. Be able to clearly describe your requirements to AI
3. Know how to run `npm install && npm run dev` to verify
4. Copy any error messages back to AI when you encounter issues

Give it a try — you can do it too. 🚀
