# F1 Gridline

F1 Gridline 是一款非官方 F1 赛事伴侣，提供赛程、实时赛况入口、比赛结果、积分榜，以及车手、车队与赛道资料。应用使用 Expo、React Native 和 TypeScript 构建，可在 Web 和 Android 上运行。

## 功能

- 浏览 2026 赛历、比赛周末场次和赛道资料。
- 通过 OpenF1 同步赛程、场次成绩和车手/车队积分；网络不可用时显示已缓存的数据与连接状态。
- 在 APP 实时页显示由 FastF1 WebSocket 桥接服务推送的车手名次、圈速、圈数和赛道状态。
- 保留 F1 官方 Live Lite 页面入口，供桥接服务不可用时查看。
- 查看车手、车队和赛道资料，以及车手和车队详情。
- 收藏车手、车队和赛事；收藏与部分同步数据保存在本机。
- 使用 SVG 车队标志。标志来源见 [`assets/team-logos/SOURCES.md`](assets/team-logos/SOURCES.md)。

## 下载

- Android APK：[EAS 安装页](https://expo.dev/accounts/contr0l/projects/f1-season-guide/builds/d05cb6c8-a5d4-4282-8425-ae727dc4208f)
- [查看 GitHub Release](https://github.com/ConTr0L0/gridline-racing/releases)

此 EAS 安装链接有效至 2026-11-01；到期后需要重新构建并更新链接。

## 本地运行

需要安装 Node.js 和 npm。克隆仓库后，在项目根目录运行：

```bash
npm install
npm run web
```

启动 Expo 开发服务器：

```bash
npm start
```

连接 Android 设备或模拟器后运行：

```bash
npm run android
```

## 实时计时桥接

实时页连接项目内的 live-service/live_bridge.py。在项目根目录创建被 Git 忽略的 .env.local，填入桥接监听地址、访问密钥和 APP 可访问的 WebSocket 地址：

    F1_TIMING_HOST=0.0.0.0
    F1_TIMING_PORT=8765
    F1_TIMING_ACCESS_KEY=replace-with-a-random-string
    EXPO_PUBLIC_F1_TIMING_URL=ws://192.168.1.20:8765

把 replace-with-a-random-string 换成你自己的随机字符串，建议只用字母和数字；也可运行 python -c "import secrets; print(secrets.token_hex(32))" 生成 64 位十六进制字符串。手机和运行桥接服务的电脑应处于同一网络；真实手机把 WebSocket 地址中的 IP 换成电脑的局域网 IP，Android 模拟器可用 10.0.2.2。打开 APP 的实时页后首次输入同一个访问密钥并连接。Android/iOS 会用系统安全存储加密保存，后续自动恢复连接；点“换密钥”可清除并更换。Web 端不会保存密钥，重新加载后需要再次输入。

安装包若没有内置 `EXPO_PUBLIC_F1_TIMING_URL`，可直接在实时页填写桥接 WebSocket 地址和访问密钥，无需为此重新编译。应用会在本机保存地址，并通过系统安全存储保存密钥。使用实时计时仍需先在可被手机访问的电脑上启动桥接服务。

安装并启动桥接服务：

    python -m pip install -r live-service/requirements.txt
    python live-service/live_bridge.py

修改 .env.local 后，重新启动 Expo 并完整重载 APP。内网开发时只在可信网络使用 ws://；对外提供服务时应使用带有效 TLS 证书的 wss:// 反向代理。不要把桥接密钥放进 EXPO_PUBLIC_ 变量或已发布的客户端代码。

## 数据与项目说明

- 赛季与比赛数据来自 [OpenF1](https://openf1.org/)；赛道图片和部分资料链接指向 [Formula1.com](https://www.formula1.com/)。
- 实时页从本项目的 FastF1 WebSocket 桥接服务读取数据，不调用 F1Dash REST API。
- 数据同步需要网络。上游数据不可用或限制访问时，应用会尝试展示本机缓存，并提供重试入口。
- 实时计时需要启动桥接服务并配置 WebSocket 地址；官方 Live Lite 入口的可用内容、登录要求和网络连接以官网为准。
- 本项目为非官方个人项目，与 Formula 1、FIA 或任何车队均无隶属关系。

## 许可与标志

仓库中的软件许可见 [`LICENSE`](LICENSE)。车队名称、标志及其他第三方资料仍归相应权利方所有；相关标志来源列于 [`assets/team-logos/SOURCES.md`](assets/team-logos/SOURCES.md)。软件许可不改变这些第三方资料各自适用的权利或条款。
