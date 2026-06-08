# 大歌单播放问题 — 排查记录

## 现象
网易云"我喜欢的音乐"歌单（2000+ 首），点击歌曲后：
- 进度条停留在 0
- 无声音
- 小歌单（< 1000 首）正常播放

## 排查过程

### 尝试 1：不传 queue（playSong(song) 无 context）
`handlePlayNeteaseSong` 调用 `playSong({ ...song, audioUrl })` 不带 context。
→ `PLAY_SONG` reducer 走到 "No explicit queue" 分支，queue 设为 `[action.song]`
→ 仍无法播放

### 尝试 2: 传 50 首窗口
传 ~50 首 song 作为 queue，playSong 带 context
→ 仍无法播放

### 当前状态

`handlePlayNeteaseSong` 现在的逻辑：
1. 调用 `/song/url` 获取单首歌的 audioUrl
2. 调用 `playSong(s)` 作为 standalone 播放

**可能原因**：

1. **`initAudio` 中的 `stateRef.current.currentSong` 赋值**：`song.audioUrl` 是直接在传入的 song 对象上赋值的，但 `stateRef` 中的 song 对象可能不是同一个引用。即使调用了 `stateRef.current.currentSong.audioUrl = url`，`stateRef` 中的 song 对象的 `audioUrl` 和 playlist 中对应 song 对象的 `audioUrl` 不是同一引用。

2. **`useEffect` 中的 loaded/audioUrl 监听**：`useEffect([loaded, state.currentSong?.audioUrl, ...])` 只有当 `state.currentSong.audioUrl` 改变时才会触发加载。但 `PLAY_SONG` reducer 返回的 `currentSong` 是一个新 copy，其 `audioUrl` 是否被正确传入需要确认。

3. **`initAudio` 是否被调用**：如果 `playSong` 的 callback 中调用了 `initAudio(song)`，但传入的 song 对象没有 `audioUrl`（因为 `fetchUrl` 是异步的），那么 `initAudio` 会进入 lazy-fetch 分支——再次调用 `/song/url`。如果这个第二次调用的 url 与 playSong 中获取的 url 是不同时机、可能存在竞态条件。

## 下一步

需要在浏览器控制台添加日志，确认：
- `handlePlayNeteaseSong` 中 `getSongAudioUrl` 是否返回了有效 url
- `initAudio` 是否被调用、传入的 song 是否有 `audioUrl`
- `useEffect([loaded, state.currentSong?.audioUrl])` 是否检测到了 audioUrl 变化
