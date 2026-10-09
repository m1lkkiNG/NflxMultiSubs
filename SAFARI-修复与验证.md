> 2026-10-09 更新：当前版本为 3.0.3-safari.4，App 与扩展显示名已恢复为 **NflxMultiSubs**，构建输出为 `NflxMultiSubs.app`。保留原测试 Bundle ID 以延续已有设置；它不表示已获得正式签名。安装入口会备份并迁移同 ID 的旧名称 App。下文 LOCAL.2/LOCAL.3 为历史验证记录。

# NflxMultiSubs Safari 本地修复版

本地测试版 3.0.3-LOCAL.3，2026-10-08。最低使用 Safari 18（本机 Safari 27.0.1）。未上架，未公证，使用独立 bundle ID `local.nflxmultisubs.safari.repair`，不继承原作者的签名或设置存储。

## 基线与核查

| 来源 | 已核查提交 |
| --- | --- |
| gmertes/master，3.0.3，修复基线 | `9d96a300fac24eb8d500e9a5d6fe279686f875a7` |
| 新版 Netflix 兼容修复 | `9608bc3f72a1efaf1957875434d7cd2b2375b6d5` |
| AuroraWright v3.0.2 / safari_support | `6f11178d577182bcbce06da1564f74ad12a5a036` |
| AuroraWright safari-web-extension，原生容器来源 | `4ba84dbeb0049ce87e6eed9a43312f4fdea86f26` |
| dannvix/master，参考 | `c41b8b2179326c18782749a1f9effefa58c682fe` |

Chrome 商店在核查时显示 3.0.3，更新时间 2026-06-13，更新说明为新版 Netflix 播放器修复。Aurora release API 显示 v3.0.2 发布于 2025-09-19T12:07:17Z。比较依据是提交与文件差异，不是版本号。没有把原 Safari 二进制反编译为源码；关于该 release 的代码分析针对对应 tag。

来源：[维护版](https://github.com/gmertes/NflxMultiSubs)、[上游播放器修复](https://github.com/gmertes/NflxMultiSubs/commit/9608bc3f72a1efaf1957875434d7cd2b2375b6d5)、[Safari release](https://github.com/AuroraWright/NflxMultiSubs/releases/tag/v3.0.2)、[Chrome 商店](https://chromewebstore.google.com/detail/nflxmultisubs-2021-netfli/jepfhfjlkgobooomdgpcjikalfpcldmm)。

选择 gmertes 当前代码是因为其中已有 Safari manifest/webpack 目标，同时包含新版字段和提前注入修复。旧 Xcode 分支只复用原生容器、图标与工程结构，全部扩展资源重新生成，清除旧作者的团队配置及个人 Xcode 状态。原始项目未重写。

## 代码层面已确认的故障

- Aurora v3.0.2 的 content script 等 `window.load` 后才注入页面核心，可能错过播放清单。
- 该 tag 缺少 `textTracks/timedtexttracks`、`downloadables/ttDownloadables`、轨道 ID、音视频轨道和推荐字幕 ID 的新旧兼容。
- Safari 页面脚本直接依赖扩展 API；隔离内容脚本与页面执行环境的 API 不同。现在 Safari 与 Firefox 使用受来源检查的内容脚本转发，后台正确接受内部连接。
- 上游下载先发 HEAD，且多个异步错误没有传递出去，可能永久 LOADING。现在直接 GET，检查状态，限时请求，依次尝试候选 CDN，解析失败也能换源，失败可再次选择。
- 缺失推荐轨道、空下载地址、图片尺寸缺失、多个 CSS class、旧影片异步回调、Off 不清除旧字幕等边界会导致异常或显示错误，已加入处理。

这些是源码缺陷与可重现的测试结果；用户先前那一次空列表的具体触发原因，因没有当时日志，仍不能确认。

## 注入、通信、请求和隐私

Safari 使用 manifest 中的 `world: MAIN` 和 `document_start` 直接执行核心脚本，内容转发脚本保持隔离世界。无需动态 script 标签、内联脚本、eval 或放宽 CSP；不需要页面加载扩展资源，因此 Safari manifest 不再声明 externally_connectable 和 web_accessible_resources。仅授予 `storage` 和 `https://www.netflix.com/*`。

实测当前影片的字幕页面请求已成功，解析出 371 条。字幕仍由页面 fetch Netflix 清单给出的 HTTPS 地址，`credentials: omit`，不发送 Cookie。没有全网代理权限，也没有关闭 Safari 跨源限制。如果实际 CDN 不允许页面请求，将记录 REQUEST_FAILED；这属于仍需真实影片核验的环节，不能从编译结果推断成功。保留上游 DFXP/TTML 文本及 ZIP 图片字幕格式；未知 profile 明确记录，不假装已支持。

诊断仅包含固定事件名、数量、HTTP 状态、耗时、视频尺寸及播放状态，不输出完整清单、Cookie、令牌或字幕 URL。请只分享诊断摘要，不导出 Network/HAR，不复制整个 `__NflxMultiSubs` 管理对象。

不替换 video，不修改 MediaSource、EME/FairPlay、清晰度选择、视频轨道、编码器或 DRM 请求。字幕依据原生 video.currentTime 叠加。保留原有手动 `[` / `]` 倍速快捷键；画质对比时保持 1x。

## 构建与恢复构建环境

本机：Apple Silicon；macOS/Safari 27.0.1；Xcode 26.5 (17F42)；Node 24.19.0。

安装正常 Node.js/npm 后，在源码根目录执行：

```sh
./utils/build-safari-local.sh
```

脚本使用锁定依赖，运行回归测试、webpack、同步 Xcode 资源、Debug 原生构建和 ad-hoc 签名检查，输出 `dist/NflxMultiSubs Safari Local.app`。也可用 Xcode 打开 `safari_web_extension/MultiSubs/NflxMultiSubs.xcodeproj`，选择 `NflxMultiSubs (macOS)` scheme。无需覆盖任何现有开发者身份。若自行选择个人开发者团队，请只修改该独立工程。

本机遇到并处理：

1. `DVTDownloads` / `IDESimulatorFoundation` 版本不匹配：用户执行 `sudo xcodebuild -runFirstLaunch` 后恢复。
2. Documents/iCloud 的文件提供器会给构建目录附加 FinderInfo，导致签名失败。因此构建脚本把 DerivedData 放在临时目录。交付 ZIP 来自已经验签的临时目录。若复制到同步文件夹后被附加元数据，优先在本地 Applications 解压使用。

## 安装、启用与恢复旧版

推荐使用新交付的 `NflxMultiSubs-LOCAL3-安装包.zip`，不要直接打开其中的 payload.zip。启动 App 显示的网页是正常的设置引导，不是播放器。旧版按钮没有显示系统错误，新版会显示错误码。

1. 退出 Safari 和本地测试 App。解压安装包，进入文件夹，双击 `安装或修复.command`，按回车继续。
2. 安装入口验证包、备份已有同 ID 本地版，安装到 `~/Applications/NflxMultiSubs Safari Local.app` 并向系统注册；会注销本任务已知临时构建副本。不会修改 Aurora 旧版或 Safari 安全选项。
3. 打开 Safari → 设置 → 高级 → 显示网页开发者功能；设置 → 开发者 → 允许未签名的扩展。按系统提示使用触控 ID/Mac 密码认证。
4. Safari → 设置 → 扩展 → 启用一个 **NflxMultiSubs Safari Local**，只允许 netflix.com。若旧版仍启用，取消旧版勾选，避免重复 Hook。
5. 刷新 Netflix，由用户登录和开始播放。原字幕在 Netflix 菜单选择；第二字幕在 Secondary Subtitles 选择。工具栏按钮可调整字幕设置。

Safari 每次退出都会重置“允许未签名的扩展”，下次启动需要重新开启，不必重装。来源：[Apple 开发文档](https://developer.apple.com/documentation/safariservices/building-a-safari-app-extension)。开启后若列表尚未刷新，关闭并重新打开设置窗口，不要立即反复退出 Safari。若仍缺少扩展，反馈安装终端的注册结果或引导页错误码。

之前的两个本地测试条目来自不同位置的同一应用副本注册，不是分别负责主字幕和副字幕。另有 Downloads 中的 Aurora 3.0.2 旧版，未修改。重启后消失可由未签名开关重置解释；再次允许后仍缺失的原因尚未确认，不能把两者混为一谈。

安装入口备份位置：`~/Library/Application Support/NflxMultiSubs Safari Local/Backups/`。需要稳定日用分发时可由用户自己的开发者身份签名；本交付不冒用第三方签名。

恢复：取消本地测试版的勾选，重新启用旧版并刷新 Netflix。可关闭“允许未签名的扩展”和“显示网页开发者功能”，删除本地测试 App。旧 App 和旧版的设置存储没有被覆盖。该测试版新设置保存在其独立扩展存储中。

## 安全诊断

在 Netflix 页面打开 Safari 开发 → 显示网页检查器 → 控制台，执行：

```js
JSON.stringify(window.__NflxMultiSubsDiagnostics?.() ?? {status: 'PAGE_CORE_MISSING'}, null, 2)
```

| 结果/事件 | 定位 |
| --- | --- |
| PAGE_CORE_MISSING | 核心没有在页面环境运行；检查扩展、网站授权、刷新和 MAIN 注入 |
| CONTENT_READY（内容脚本控制台）但页面缺少 PAGE_HOOK_READY | 隔离脚本运行，页面核心未运行 |
| PAGE_HOOK_READY，但播放后没有 MANIFEST_CAPTURED | Hook 没捕获清单，可能注入太晚或播放器改变了解析方式 |
| MANIFEST_TRACK_FIELDS_MISSING | 捕获对象缺少支持的字幕字段 |
| TRACKS_BUILT 的 ready 为 0 | 无可下载轨道、未 hydrate 或未知格式；看 PROFILE_UNSUPPORTED |
| SUBTITLE_REQUEST_FAILED / HTTP_FAILED | 网络/CORS/CSP/超时或 HTTP 错误；不含 URL |
| SUBTITLE_PARSE_FAILED | 下载完成但不是支持的 TTML/ZIP 或数据损坏 |
| SUBTITLE_READY，但没有 MENU_RENDERED / SUBTITLE_RENDERED | 菜单或渲染阶段问题；看 overlayConnected 和视频状态 |
| SETTINGS_RECEIVED | 页面已收到扩展存储的设置 |

`video.width/height` 是实际 video 解码尺寸线索，不是 HDR 证明。诊断不包含影片名称与 signed URL。

## 验收与证据要求

构建与模拟测试通过不等于 Netflix 已可用。实际验收请按下表记录同一影片与 Safari 环境：

| 项目 | 检查方式 |
| --- | --- |
| 可用字幕语言 | 菜单显示影片有下载资源的语言；分别测试中文主/英文副、英文主/中文副 |
| 同步 | 正常播放、暂停、快进、后退后文本随 currentTime 更新 |
| 路由与缓存 | 直接刷新播放页、从首页点播放、回首页重进、连续下一集 |
| 布局 | 普通窗口及 Netflix 播放器全屏；主副字幕可见且不挡控制按钮 |
| 持久化 | 选择“记住上次语言”，修改字体/位置，刷新后检查，再重启 Safari 检查 |
| 4K | 先关闭本扩展播放同一片源，稳定后记录 Netflix 播放统计的真实分辨率/码率；启用后同样等待并比较。可尝试 Netflix 快捷键 Control-Option-Shift-D（播放器可能改变支持） |
| HDR | 对照同片源、同设备/显示器、系统 HDR 设置及播放器实际 HDR/视频轨道统计；只有详情页标识、屏幕支持 HDR 或 3840×2160 均不足以证明 HDR 流 |

若基线也无法达到 4K/HDR，记录“基线条件不满足/证据不足”，不能归为扩展通过或失败。原生 video 的实际尺寸可以辅助确认分辨率；不可由此推断色彩传递函数/动态范围。

最新本机执行结果见同目录 `VALIDATION.md`。

## LOCAL.3 后续验证

用户已确认结束控制后画面正常、可选主副字幕；LOCAL.2 间距偏大。LOCAL.3 改为实际字幕块之间约 4 CSS px，并在底部空间不足时调整位置。保留 gmertes 的叠加渲染方案及字体设置，不改动播放器或 DRM。

LOCAL.3 已完成构建、16 项测试及安装包校验，尚待用户执行安装入口并目视确认间距。诊断版本应为 `3.0.3-LOCAL.3`。本次没有重新远程控制 Netflix。
