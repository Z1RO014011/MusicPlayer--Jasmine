# Jasmine

[English](README_EN.md) | 中文

全功能桌面音乐播放器，基于 **Vite + React 18 + TypeScript + Electron** 构建。

## 功能

- **在线音乐** — 网易云音乐集成，在线搜索歌曲/歌单/艺人/专辑，扫码登录获取高音质
- **发现页** — 热门搜索、个性化推荐、排行榜浏览
- **音源抽象** — 已抽象 MusicSource 接口，当前注册网易云音源；YouTube 依赖已预留但尚未接入 UI/注册表
- **本地音乐** — 多文件导入，自动读取元数据，IndexedDB 持久化存储
- **歌词显示** — Apple Music 风格 LRC 歌词滚动同步，支持编辑歌词
- **歌单管理** — 创建/删除/重命名歌单，自定义封面（上传图片或渐变色）
- **播放控制** — 播放/暂停、上下曲、进度拖拽、音量调节、播放队列
- **播放模式** — 随机播放、循环模式（关闭/全部循环/单曲循环）
- **播放历史** — 自动记录播放历史，按时间分组展示
- **国际化** — 中/英文界面切换
- **歌曲分享** — 一键生成分享卡片，下载为 PNG
- **键盘快捷键** — Space / → / ← / ↑ / ↓ / S / R / Shift+→ / Shift+←
- **暗黑主题** — Jasmine 专属深色玻璃质感 UI

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开 `http://127.0.0.1:5173/music-player/`。

`npm run dev` 会同时启动前端和本地网易云 API 服务，因此在线搜索、扫码登录、歌词和在线播放可以直接使用。

如果只需要启动前端界面，使用：

```bash
npm run dev:frontend
```

> 在线功能依赖本地网易云 API 服务，默认地址为 `http://127.0.0.1:3000`。桌面模式会自动启动该服务。

### 桌面应用（下载安装包）

无需安装 Node.js，直接下载对应系统的安装包运行：

| 系统 | 下载 | 说明 |
|------|------|------|
| macOS (Apple Silicon) | [Jasmine-2.0.0-arm64.dmg](https://github.com/Z1RO014011/DeepSeekV4-flash-MusicPlayer/releases/download/v2.0.0/Jasmine-2.0.0-arm64.dmg) | DMG 安装包 |
| macOS (Apple Silicon) | [Jasmine-2.0.0-arm64-mac.zip](https://github.com/Z1RO014011/DeepSeekV4-flash-MusicPlayer/releases/download/v2.0.0/Jasmine-2.0.0-arm64-mac.zip) | ZIP 便携版 |
| macOS (Intel x64) | [Jasmine-2.0.0.dmg](https://github.com/Z1RO014011/DeepSeekV4-flash-MusicPlayer/releases/download/v2.0.0/Jasmine-2.0.0.dmg) | DMG 安装包 |
| macOS (Intel x64) | [Jasmine-2.0.0-mac.zip](https://github.com/Z1RO014011/DeepSeekV4-flash-MusicPlayer/releases/download/v2.0.0/Jasmine-2.0.0-mac.zip) | ZIP 便携版 |
| Windows (x64) | [Jasmine Setup 2.0.0.exe](https://github.com/Z1RO014011/DeepSeekV4-flash-MusicPlayer/releases/download/v2.0.0/Jasmine%20Setup%202.0.0.exe) | NSIS 安装包 |

> 首次打开 macOS 需在 **系统设置 → 隐私与安全性** 中点"仍要打开"。

### 开发者模式（从源码运行）

```bash
npm install
npm run electron:dev
```

构建安装包：

```bash
npm run electron:build        # 当前平台
npm run electron:build:all    # 全平台
```

构建产物在 `release/` 目录。

## 技术栈

| 技术 | 用途 |
|------|------|
| Vite 6 | 构建工具 |
| React 18 | UI 框架 |
| TypeScript | 类型安全 |
| Electron 41 | 桌面应用 |
| IndexedDB | 音频文件存储 |
| localStorage | 元数据 + 歌词 + 缓存 |
| NeteaseCloudMusicApi | 网易云音乐 API |
| youtubei.js | YouTube 音源依赖（待接入） |
| music-metadata | 音频元数据解析 |

## 项目结构

```
src/
├── main.tsx                  # 入口
├── App.tsx                   # 主布局 + 视图路由 + 快捷键
├── App.css                   # 全部样式（暗黑风格）
├── types.ts                  # TypeScript 类型定义
├── data.ts                   # 渐变色数组
├── electron.d.ts             # Electron API 类型声明
├── lib/
│   ├── db.ts                 # IndexedDB + localStorage 持久化
│   ├── neteaseApi.ts         # 网易云 API 封装
│   ├── lyrics.ts             # LRC 歌词解析
│   └── sources/              # 音源抽象层
├── i18n/                     # 国际化
├── context/                  # 全局状态管理（PlayerContext）
├── hooks/                    # 自定义 Hooks
└── components/               # UI 组件
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

## 快捷键

| 按键 | 功能 |
|------|------|
| `Space` | 播放/暂停 |
| `→` | 下一首 |
| `←` | 上一首 |
| `Shift + →` | 快进 5 秒 |
| `Shift + ←` | 后退 5 秒 |
| `↑` | 音量 +10% |
| `↓` | 音量 -10% |
| `S` | 切换随机播放 |
| `R` | 切换循环模式 |

## 开发日志

详见 [CHANGELOG.md](./CHANGELOG.md)。
