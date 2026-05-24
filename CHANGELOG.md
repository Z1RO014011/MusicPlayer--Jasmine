# Jasmine 开发日志

> React + Electron + TypeScript 桌面音乐播放器 | 毕业论文项目

---

## v1.0 — 项目初始化与基础架构

### 项目骨架
- Vite + React 18 + TypeScript 脚手架搭建
- Spotify 暗黑风格 UI 布局：侧边栏 + 主内容区 + 底部播放条
- 全局状态管理 PlayerContext
- 组件化架构：Sidebar / PlayerBar / HomeView / SearchView / LibraryView / PlaylistDetail

### 播放器核心
- HTML5 Audio 实现播放/暂停、上一首/下一首、进度拖拽、音量调节
- 播放模式：随机播放、循环模式（关闭 / 全部循环 / 单曲循环）
- 全局单一 `<audio>` 元素，避免多实例冲突

### 音乐导入与持久化
- 多文件上传，自动读取音频时长和元数据
- IndexedDB 存储音频文件数据
- localStorage 持久化元数据（歌单、歌曲信息、播放状态）
- 启动时自动恢复上次状态

### 歌单系统
- 创建/删除/重命名歌单
- 从音乐库添加/移除歌曲
- 歌单封面渐变色

### 搜索
- 本地搜索歌曲和歌单
- 实时过滤匹配结果

### 全屏播放界面
- NowPlayingView 全屏播放界面
- 动态模糊渐变背景（从当前歌曲封面取色）

### 键盘快捷键
- Space 播放/暂停、→ 下一首、← 上一首
- Shift+→ 快进、Shift+← 后退
- ↑ 音量+、↓ 音量-、S 切随机、R 切循环

### 部署
- GitHub Pages 部署配置
- gh-pages 自动发布

---

## v1.1 — 歌词 & 歌单封面 & 分享

### LRC 歌词系统
- 支持 LRC 格式歌词解析与滚动同步显示
- 自动居中当前播放行，绿色高亮
- 允许手动滚动歌词
- 编辑歌词功能：粘贴 LRC 文本，保存后立即生效
- 有歌词的歌曲默认显示歌词

### 歌单封面编辑
- 上传自定义图片作为歌单封面
- 渐变色选择器（预置多种渐变色）
- 封面编辑弹窗 UI

### 歌曲分享
- 一键生成精美分享卡片（含封面、歌名、艺术家）
- 分享卡片下载为 PNG 图片

### 其他修复
- 音量拖拽修复
- Windows ICO 图标转换
- 歌词滚动冲突修复、空行处理
- 进度条拖拽优化

---

## v1.2 — Apple Music 风格歌词 & 国际化

### 歌词模式升级
- Apple Music 风格歌词显示（transform translateY 方案替代 scroll）
- ResizeObserver 精确计算容器高度，动态 padding 实现居中
- 解决 flex 链路歌词溢出问题

### 国际化 (i18n)
- 中/英文界面切换
- 完整翻译覆盖：导航、播放器、搜索、歌单、设置等所有文案
- 语言偏好持久化到 localStorage

### UI 优化
- Lucide 图标替换
- 整体 UI 打磨

---

## v1.3 — 在线音乐 & 发现页

### 网易云音乐集成
- 集成 NeteaseCloudMusicApi 本地 API 服务
- 在线搜索歌曲、歌单、艺人、专辑
- 在线播放（获取音频 URL + 批量预加载）
- 歌词获取

### 发现页面
- 搜索标签页：在线搜索 + 歌曲/艺人/专辑/歌单分类结果
- 推荐标签页：推荐歌单 + 分类浏览（热门/风格分类）
- 排行榜标签页：各大榜单入口

### 网易云登录
- 二维码扫码登录
- 登录状态检测与自动恢复
- Cookie 持久化，登录后可获取高音质音频

### 收藏专辑
- 从发现页收藏/取消收藏专辑
- 专辑详情查看歌曲列表

### 播放队列
- QueueView 查看和管理播放队列
- 添加到队列按钮

---

## v1.4 — UI 重构 & 个性化推荐（当前版本）

### 导航重构 (2026-05-13)
- 将"收藏专辑"从侧边栏移入音乐库页面，作为第三个标签页（歌单 / 歌曲 / 收藏专辑）
- 侧边栏第一项从"首页"改为"我的音乐"（指向音乐库）
- 默认启动视图改为"发现"页面
- 导航顺序：发现 → 我的音乐 → 搜索 → 设置
- "导入音乐"和"创建歌单"按钮从侧边栏移入音乐库页面

### 发现页改进
- 搜索标签页新增"热门搜索"词条（调用网易云 `/search/hot/detail`）
- 推荐歌单接口从 `/top/playlist` 升级为 `/personalized`
- 登录后推荐标签页切换为 `/recommend/resource` 个性化推荐
- 修复歌单卡片显示"0 首歌曲"的问题，改用 API 推荐语/播放量

### "我喜欢的音乐"优化
- 点赞/取消点赞时自动更新歌单封面为最新添加的歌曲封面
- 封面编辑按钮重构：从右上角上传图标改为左下角铅笔图标 + 毛玻璃效果

### 歌曲列表交互
- 所有歌曲列表新增爱心按钮（专辑列与时长列之间），一键收藏/取消
- 涉及页面：音乐库、歌单详情、发现页、本地搜索
- 修复 grid 列数与新增爱心列不匹配导致的布局问题

### 本地歌曲 & 无歌词提示
- 音乐库新增"本地歌曲"标签页，只展示导入的本地音乐（区分于在线歌曲）
- NowPlayingView 中无歌词的歌曲居中显示"暂时没有歌词"提示

### 播放历史
- 播放歌曲时自动记录到播放历史（按天去重，最多保留 500 条）
- 音乐库新增"我听过的"标签页，按今天/昨天/本周/更早分组展示
- 点击分组中的歌曲即可播放该组所有歌曲
- 数据持久化到 localStorage

### 品牌更新
- 应用名从 "Jasmine Music Player" 改为 "Jasmine"
- 更新 package.json (name / productName / appId)
- 侧边栏 Logo 改为 "Jasmine"

---

## v2.0 — 多音源架构 & 桌面发布（2026-05-18）

### 多音源抽象层
- 抽象 MusicSource 接口，支持多种音乐源接入
- 网易云音源实现（NeteaseMusicApi）
- YouTube 音源依赖已加入，后续版本接入 UI 与音源注册
- 音源注册表已建立，当前默认使用网易云音源

### 桌面应用增强
- Electron preload 脚本，安全暴露 API 到渲染进程
- 主进程音频下载（绕过 CORS 限制）
- IPC 通信机制

### 构建与发布
- macOS 双架构支持（Intel x64 + Apple Silicon arm64）
- Windows x64 安装包
- electron-builder 构建配置完善

---

## 技术架构

| 技术 | 用途 |
|------|------|
| Vite 6 | 构建工具 |
| React 18 | UI 框架 |
| TypeScript | 类型安全 |
| Electron 41 | 桌面应用 |
| IndexedDB | 音频文件存储 |
| localStorage | 元数据 + 歌词 + 音频URL缓存 + Cookie |
| NeteaseCloudMusicApi | 网易云音乐 API 本地服务 |
| music-metadata | 音频文件元数据解析 |
| youtubei.js | YouTube 音源依赖（待接入） |

### 项目结构

```
src/
├── main.tsx                  # 入口
├── App.tsx                   # 主布局 + 视图路由 + 键盘快捷键
├── App.css                   # 全部样式（暗黑风格）
├── types.ts                  # TypeScript 类型定义
├── data.ts                   # 渐变色数组
├── electron.d.ts             # Electron API 类型声明
├── lib/
│   ├── db.ts                 # IndexedDB + localStorage 持久化
│   ├── neteaseApi.ts         # 网易云 API 封装
│   ├── lyrics.ts             # LRC 歌词解析
│   └── sources/              # 音源抽象层
│       ├── types.ts          # MusicSource 接口
│       ├── netease.ts        # 网易云音源实现
│       └── index.ts          # 音源注册
├── i18n/
│   ├── I18nContext.tsx       # 国际化上下文
│   └── translations.ts      # 中英文翻译
├── context/
│   └── PlayerContext.tsx     # 全局播放状态管理
├── hooks/
│   └── useKeyboardShortcuts.ts
└── components/
    ├── Sidebar.tsx           # 侧边栏导航
    ├── PlayerBar.tsx         # 底部播放条
    ├── NowPlayingView.tsx    # 全屏播放界面 + 歌词
    ├── HomeView.tsx          # 首页（已废弃，重定向到 LibraryView）
    ├── SearchView.tsx        # 本地搜索
    ├── LibraryView.tsx       # 音乐库（歌单/歌曲/收藏专辑）
    ├── PlaylistDetail.tsx    # 歌单详情
    ├── LyricsView.tsx        # 歌词显示组件
    ├── DiscoverView.tsx      # 发现页（在线搜索/推荐/排行榜）
    ├── AlbumListView.tsx     # 收藏专辑视图（已内嵌至 LibraryView）
    ├── HistoryView.tsx       # 播放历史
    ├── SettingsView.tsx      # 设置页
    ├── QueueView.tsx         # 播放队列
    └── CreatePlaylistModal.tsx
```
