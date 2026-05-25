# 技术变更记录

更新时间：2026-05-24

## 一、状态管理变更

文件：`src/context/PlayerContext.tsx`

### 新增 `getNextQueueIndex`

用途：

- 统一计算下一首歌曲索引。
- 处理顺序播放、随机播放、单曲循环、列表循环。
- 避免多个地方重复实现下一首逻辑。

改进效果：

- 播放器行为更稳定。
- 歌曲自然结束、点击下一首、预加载下一首都使用同一套逻辑。

### 修改 `PLAY_SONG`

修改前：

- 没有显式队列时，可能继续沿用旧队列。
- 用户从搜索结果中点击歌曲后，下一首可能跳回旧歌单。

修改后：

- 有显式队列时，使用传入队列作为当前上下文。
- 没有显式队列时，将当前歌曲作为单曲队列。

### 新增 `PLAY_NEXT`

用途：

- 支持“下一首播放”功能。
- 将歌曲插入当前播放歌曲之后。
- 如果当前没有歌曲，则直接播放该歌曲。

### 新增 `CLEAR_QUEUE`

用途：

- 支持“清空队列”功能。
- 清空时保留当前歌曲，避免中断播放。

## 二、组件变更

### `src/components/DiscoverView.tsx`

主要变化：

- 在线歌曲列表新增“下一首播放”按钮。
- 在线搜索结果播放时传入当前搜索结果作为播放上下文。
- 登录成功图标颜色改为主题变量 `var(--accent)`。

### `src/components/QueueView.tsx`

主要变化：

- 引入 `clearQueue`。
- 队列歌曲数量大于 1 时显示“清空队列”按钮。

### `src/components/SearchView.tsx`

主要变化：

- 本地搜索结果播放时传入完整搜索结果作为队列上下文。

### `src/components/Sidebar.tsx`

主要变化：

- 使用项目自己的 `icon.png` 作为侧边栏图标。
- 替换导航 SVG，降低旧风格相似度。

## 三、样式变更

### `src/index.css`

主要变化：

- 重设主题变量。
- 改造全局背景。
- 调整滚动条和文字选中样式。

### `src/App.css`

主要变化：

- 侧边栏玻璃风格。
- 主内容区玻璃风格。
- 播放器底栏样式升级。
- 搜索框、卡片、列表、按钮、标签页样式统一。
- 新增 `.queue-clear-btn`。
- 优化歌曲列表操作按钮区域，支持多个按钮并排显示。

## 四、国际化变更

文件：`src/i18n/translations.ts`

新增键：

- `discover.playNext`
- `queue.clear`

中文：

- `下一首播放`
- `清空队列`

英文：

- `Play Next`
- `Clear Queue`

## 五、文档变更

文件：

- `README.md`
- `README_EN.md`

主要变化：

- 将原有 Spotify 风格描述改为 Jasmine 暗色玻璃界面描述。
- 更新开发启动说明，明确 `npm run dev` 会同时启动前端和本地网易云 API 服务。

## 六、开发脚本变更

文件：`package.json`

主要变化：

- `npm run dev`：同时启动 Vite 前端和本地网易云 API 服务。
- `npm run dev:frontend`：只启动 Vite 前端，用于不需要在线功能的界面调试。
- `npm run api:dev`：单独启动本地网易云 API 服务。

修复效果：

- 浏览器开发预览中，在线搜索不再因为 API 服务未启动而直接失败。
- 保留纯前端启动方式，方便只调 UI 时使用。

## 七、在线搜索错误提示

文件：

- `src/components/DiscoverView.tsx`
- `src/i18n/translations.ts`

主要变化：

- 新增搜索错误状态 `searchError`。
- 搜索请求失败时显示明确错误提示。
- 清空搜索框时同步清空错误状态。
- 新增中英文文案 `discover.searchServiceError`。

## 八、验证命令

已执行：

```bash
npm run build
```

结果：

- TypeScript 编译通过。
- Vite 构建通过。
- 生成 `dist/` 构建产物。

本地预览地址：

```text
http://127.0.0.1:5173/music-player/
```

在线搜索验证：

```text
http://127.0.0.1:3000/cloudsearch?keywords=周杰伦&limit=2
```

结果：

- API 返回 `code: 200`。
- 浏览器页面搜索“周杰伦”返回 30 条歌曲结果。

## 九、播放状态记忆

文件：

- `src/context/PlayerContext.tsx`

主要变化：

- 新增 `PLAYBACK_STATE_KEY`，用于保存播放会话。
- 新增 `PersistedPlaybackState`，定义需要持久化的播放状态。
- 新增 `savePlaybackState` 和 `loadPlaybackState`。
- 新增 `RESTORE_PLAYBACK_STATE` reducer action。
- 应用启动加载本地音乐、歌单和历史后，恢复上一次播放状态。
- 关键状态变化时立即保存，包括当前歌曲、队列、音量、随机播放和循环模式。
- 播放进度使用 2 秒间隔快照保存。
- 页面关闭或刷新前触发即时保存。
- 恢复在线歌曲时不复用过期 `audioUrl`，避免旧链接失效。
- 恢复本地歌曲时优先匹配重新加载后的本地歌曲对象，避免旧 blob URL 失效。

验证结果：

- 播放在线搜索结果后刷新页面，底部播放器恢复当前歌曲。
- 当前进度恢复到刷新前的时间点。
- 歌曲总时长显示正常。
- 构建通过。
