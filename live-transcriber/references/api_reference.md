# 48.cn 口袋 API 接口参考

## 直播详情 API

### 请求

```
POST https://pocketapi.48.cn/live/api/v1/live/getLiveOne
```

### Headers

| Header | 值 | 说明 |
|--------|------|------|
| Content-Type | application/json | 必须 |
| os | android | 必须，标识客户端类型 |

### 请求体

```json
{
  "liveId": "1260009988753788928"
}
```

### 响应结构

```json
{
  "status": 200,
  "success": true,
  "message": "OK",
  "content": {
    "liveId": "直播ID",
    "roomId": "房间ID",
    "onlineNum": 761,
    "type": 1,
    "liveType": 1,
    "review": true,
    "needForward": false,
    "systemMsg": "",
    "msgFilePath": "弹幕LRC文件URL",
    "playStreamPath": "m3u8播放地址",
    "user": {
      "userId": "用户ID",
      "userName": "SNH48-成员名",
      "userAvatar": "/avatar/路径.jpg",
      "level": 3
    },
    "topUser": [],
    "mute": false,
    "liveMode": 0,
    "pictureOrientation": 0,
    "isCollection": 0,
    "mergeStreamUrl": "",
    "coverPath": "/封面路径.jpg",
    "title": "直播标题",
    "ctime": "毫秒时间戳",
    "announcement": "",
    "specialBadge": [],
    "monthCardBadge": {},
    "agentId": "0",
    "showPageantry": 0
  }
}
```

### 关键字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `liveId` | string | 直播唯一标识，从分享URL的 `id` 参数获取 |
| `playStreamPath` | string | m3u8 播放地址，可直接用 ffmpeg 下载 |
| `review` | boolean | 是否为回放（true=已结束的直播回放） |
| `ctime` | string | 直播创建时间（毫秒Unix时间戳） |
| `msgFilePath` | string | 弹幕/字幕 LRC 文件 URL |
| `onlineNum` | number | 在线观看人数 |
| `pictureOrientation` | number | 画面方向（0=竖屏） |
| `liveMode` | number | 直播模式（0=普通） |
| `type` | number | 类型（1=普通直播） |
| `liveType` | number | 直播类型（1=普通） |

## URL 格式

### 直播分享页

```
https://h5.48.cn/2019appshare/memberLiveShare/index.html?id={liveId}
```

### m3u8 流地址格式

```
https://idol-vod.48.cn/{userId}/{date}/{path}/{liveId}-{hash}.m3u8
```

### TS 分片格式

```
https://idol-vod.48.cn/fragments/{cdn-node}/{stream-id}/{start_ts}-{end_ts}.ts
```

### 资源 CDN 前缀

- 头像/封面: `https://source.48.cn`
- 视频: `https://idol-vod.48.cn`

## 注意事项

1. **无需鉴权**: `getLiveOne` 接口不需要登录或 token
2. **时效性**: m3u8 地址有时效性，直播回放可能随时下线
3. **VOD vs Live**: 回放视频 m3u8 包含 `#EXT-X-ENDLIST`，直播中则不包含
4. **不连续标记**: `#EXT-X-DISCONTINUITY` 表示直播中断/重连点
5. **画面方向**: SNH48 直播通常为竖屏 540×960

## 其他可用 API（未验证）

| API | 方法 | 说明 |
|-----|------|------|
| `/live/api/v1/live/getLiveOne` | POST | 获取单个直播详情 |
| `/live/api/v1/live/getLiveList` | POST | 获取直播列表 |
| `/live/api/v1/live/getLiveInfo` | POST | 获取直播信息 |
