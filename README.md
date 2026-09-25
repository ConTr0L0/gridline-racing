# Gridline Racing

Gridline Racing 是一款非官方 F1 赛事伴侣，提供赛程、实时赛况入口、比赛结果、积分榜，以及车手、车队与赛道资料。应用使用 Expo、React Native 和 TypeScript 构建，可在 Web 和 Android 上运行。

## 功能

- 浏览 2026 赛历、比赛周末场次和赛道资料。
- 通过 OpenF1 同步赛程、场次成绩和车手/车队积分；网络不可用时显示已缓存的数据与连接状态。
- 从应用内入口打开 Formula 1 官方实时计时页面。实时计时由 F1 官网提供，并在外部浏览器中打开。
- 查看车手、车队和赛道资料，以及车手和车队详情。
- 收藏车手、车队和赛事；收藏与部分同步数据保存在本机。
- 使用 SVG 车队标志。标志来源见 [`assets/team-logos/SOURCES.md`](assets/team-logos/SOURCES.md)。

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

## 数据与项目说明

- 赛季与比赛数据来自 [OpenF1](https://openf1.org/)；赛道图片和部分资料链接指向 [Formula1.com](https://www.formula1.com/)。
- 数据同步需要网络。上游数据不可用或限制访问时，应用会尝试展示本机缓存，并提供重试入口。
- 官方实时计时会离开应用打开 F1 官网；登录状态由官网管理。
- 本项目为非官方个人项目，与 Formula 1、FIA 或任何车队均无隶属关系。

## 许可与标志

仓库中的软件许可见 [`LICENSE`](LICENSE)。车队名称、标志及其他第三方资料仍归相应权利方所有；相关标志来源列于 [`assets/team-logos/SOURCES.md`](assets/team-logos/SOURCES.md)。软件许可不改变这些第三方资料各自适用的权利或条款。
