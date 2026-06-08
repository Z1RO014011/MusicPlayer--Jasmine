# 嘻哈垂直方向 — 技术任务清单

> 日期：2026-06-07  
> 基于 Q&A 讨论整理

---

## 即刻（本周，6/7 – 6/14）

| # | 任务 | 涉及文件 | 代码量 | 状态 |
|---|------|---------|--------|:---:|
| 1 | 封装 `/simi/song` 等 12 个新 API | `src/lib/neteaseApi.ts` | ~180行 | ✅ |
| 2 | NowPlaying 增加「相似歌曲」面板 | `NowPlayingView.tsx` + `App.css` + 国际化 | ~100行 | ✅ |
| 3 | 解释标签组件（半透明胶囊标签） | 新组件 + CSS | ~40行 | 🔲 |
| 4 | 解释标签挂到相似歌曲列表 | 任务2 + 任务3 | ~30行 | 🔲 |
| 5 | 手工映射文件 50 条 Rapper → 厂牌 | 新文件 `src/lib/hiphop-knowledge.ts` | ~60行 | 🔲 |
| 6 | 解释标签增加厂牌来源 | 任务4 + 任务5 | ~20行 | 🔲 |
| 7 | 当前行歌词光晕（text-shadow） | `App.css` | 3行 CSS | 🔲 |

---

## 下周（6/14 – 6/21）

| # | 任务 | 涉及文件 | 代码量 | 依赖 |
|---|------|---------|--------|------|
| 8 | 专辑详情页 — 大封面 + 介绍 + 曲目表格 | 新组件 `AlbumDetailView.tsx` | ~200行 | `/album` API（已有） |
| 9 | ~~封装 `/user/playlist` API~~ | 已在任务1中一次性接完 | — | ✅ |
| — | 删除侧边栏网易云歌单入口 | `Sidebar.tsx` | ✅ |
| — | 修复歌单2000首只显示1000首 → `/playlist/detail` + `/song/detail`分批拉取 | `neteaseApi.ts` | ✅ |

---

## 第三周起（6/21 – 6/28）

| # | 任务 | 涉及文件 | 代码量 | 依赖 |
|---|------|---------|--------|------|
| 12 | 封装更多网易云用户 API（听歌记录/收藏/关注） | `src/lib/neteaseApi.ts` | ~40行 | 无 |
| 13 | 用户网易云个人资料面板（等级/粉丝/关注数） | `DiscoverView.tsx` 登录区 | ~60行 | 任务12 |
| 14 | 解释标签增加用户行为来源（你常听的XX） | 推荐标签逻辑 | ~80行 | 任务4, IndexedDB |
| 15 | 种子数据集标注 — 50 首歌的手工标签 | 新数据文件 `src/data/seed-labels.json` | ~200行数据 | 任务5 |

---

## 答辩前时间充裕时

| # | 任务 | 涉及文件 | 代码量 | 难度 |
|---|------|---------|--------|------|
| 16 | 用户行为仪表盘（StatsView 独立 Tab） | 新组件 `StatsView.tsx` + ECharts | ~300行 | 中 |
| 17 | 韵脚检测函数（仅逻辑，不做 UI 标注） | 新文件 `src/lib/rhyme-detector.ts` | ~50行 | 中 |
| 18 | 歌词 TF-IDF 相似度（jieba-wasm） | 新文件 `src/lib/lyric-similarity.ts` | ~80行 | 中 |
| 19 | 韵脚标注 PoC — 左侧竖线颜色方案 | `LyricsView.tsx` + CSS | ~50行 | 任务17 |
| 20 | 无缝切换（Web Audio API） | `PlayerContext.tsx` 重构 | ~250行 | 高 |

---

## 答辩后（Phase 3）

| # | 任务 | 说明 |
|---|------|------|
| 21 | Canvas 音频频谱 | Web Audio API AnalyserNode |
| 22 | 歌词光效（韵脚闪烁 + 副歌亮度） | 依赖韵脚引擎 |
| 23 | CMU 发音词典集成 — 英文押韵 | 静态词典文件 + 英文韵脚检测 |
| 24 | 社区标签系统 | 多用户标注 + 后端存储 |
| 25 | 后端 DB + API 服务 | Node.js + SQLite |
| 26 | 爬虫 → JSON 数据采集管道 | 维基/百度百科厂牌数据 |

---

## 专项：网易云 API 接入清单

已接入的标 ✅，待接入的标 🔲。

| API | 用途 | 状态 |
|-----|------|:---:|
| `/simi/song` | 相似歌曲 → 推荐流 | ✅ |
| `/simi/artist` | 相似歌手 → 歌手页 | ✅ |
| `/artist/detail` | 歌手简介/标签 | ✅ |
| `/artist/desc` | 歌手介绍（长文本） | ✅ |
| `/artist/top/song` | 热门 50 首 | ✅ |
| `/user/playlist` | 用户歌单列表 | ✅ |
| `/user/record` | 听歌记录（周/全部） | ✅ |
| `/user/subcount` | 收藏统计 | ✅ |
| `/user/detail` | 用户等级/关注/粉丝 | ✅ |
| `/user/follows` | 关注歌手列表 | ✅ |
| `/album/sublist` | 收藏专辑列表 | ✅ |
| `/album` | 专辑详情（大图/介绍/公司/时间） | ✅ |
| `/user/event` | 用户动态 | ✅ |
| `/search` | 在线搜索 | ✅ |
| `/song/url` | 音频播放地址 | ✅ |
| `/lyric` | 歌词获取 | ✅ |
| `/recommend/resource` | 每日推荐歌单 | ✅ |
| `/toplist/detail` | 排行榜 | ✅ |

---

## 非代码任务

| # | 任务 | 说明 |
|---|------|------|
| N1 | 安装 `js-pinyin` | `npm i js-pinyin` |
| N2 | 安装 `jieba-wasm`（如需要） | Phase 1 可不装 |
| N3 | 创建 `feat/hiphop-recommendation` 分支 | Git 分支管理 |
| N4 | 50 首嘻哈种子歌曲挑选 | 你收藏的歌单 |
| N5 | 论文「领域知识库构建」小节初稿 | 基于任务5的数据 |
