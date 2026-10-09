# 本机验证记录

时间：2026-10-08；macOS/Safari 27.0.1，Apple Silicon，Xcode 26.5，Node 24.19.0。

- 已完成：源码远端和 SHA 对比、独立分支 `fix/safari-subtitles`。
- 已完成：16 个 Node/jsdom 针对性回归测试，全通过。
- 已完成：Chrome/Firefox/Safari webpack 生产构建，全通过。
- 已完成：复用并更新的 Safari Xcode 工程，Debug 构建成功。
- 已完成：本地 ad-hoc 签名；临时构建目录和用户 Applications 副本 `codesign --verify --deep --strict` 通过。未公证、非原作者签名。
- 已在 Safari 实际检查：用户授权并完成系统认证后开启未签名扩展；安装在用户 Applications 的测试版被 Safari 识别、启用，工具栏出现按钮。
- 已在 Safari 实测（间距修订前）：MAIN 脚本启动；设置消息已接收；捕获播放清单；4 个可下载语言（简中、繁中、英文、英文 CC）和 Off 显示；真实下载并解析 371 条；叠加层已连接且有渲染记录。
- 已在 Safari 实测（间距修订前）：中文主字幕与英文第二字幕同屏，读取到含义对应的两行。用户反馈间距太近/略有重合，因此不能将布局判为通过。
- 视频尺寸证据：扩展开启时原生 videoWidth/videoHeight = 3840×2160，readyState 4，playbackRate 1。没有关闭扩展的同片源基线对比，也没有 HDR 流证据，因此不能宣称全部 4K/HDR 验收通过。
- 用户确认：结束控制后视频恢复正常，可选择主副字幕。用户反馈 LOCAL.2 间距过大。此反馈不能单独确认黑屏的底层原因。
- LOCAL.2 新增：按实际 DOM 边界保留至少 12px／画面高度 2.5% 的主副字幕间隔，底部不足时向上移动主字幕；播放器容器替换后重建叠加层。模拟几何与 DOM 测试通过。用户随后反馈间距过大。
- LOCAL.3：目标间距改为 4 CSS px，同时收紧过大间距；16 项测试、webpack 和 Xcode 构建通过。安装包解压、应用标识、签名校验通过；安装脚本 --check 通过。用户随后实际安装并确认“间距正常，完美了”。但退出 Safari 后扩展仍消失，需要重跑安装入口，因此重启安装流程未通过。
- 安装诊断：用户 Applications 中 LOCAL.2 签名有效；Downloads 中另有 Aurora v3.0.2，未改动。工具环境调用 pluginkit 返回 Connection invalid，无法据此确定当前系统注册状态。LOCAL.3 安装入口在用户终端中注册固定路径并输出结果。
- 仍待用户配合验证：正式签名版本的安装与重启、反向中英组合、暂停/快进/后退的逐项同步、普通/Netflix 全屏、刷新/下一集、设置跨刷新与重启持久化、4K/HDR 基线对比。此前点击与观察不足以把这些标为通过。

测试覆盖：新旧字段；缺失数组；URL 形态；TTML tick/clock/s/ms；GET 重试与错误脱敏；无扩展 API 的页面启动；异常清单不破坏 JSON.parse；坏轨道；重复激活和下载失败重试；菜单多 CSS class；Off 清屏；旧影片异步结果不覆盖下一集；图像 ZIP 清单和资源检查；Safari 消息来源过滤和启动排队；后台设置存储。

限制：jsdom 不是 Safari/WebKit，模拟测试不能验证 FairPlay、真实网络 CORS/CSP、GPU/视频画质和视觉布局。编译通过不等于 Netflix 端到端通过。

安全摘要见 `SAFARI-LIVE-EVIDENCE.json`。最新交付版本为 3.0.3-LOCAL.3（Safari manifest 3.0.3.3，原生 build 20261008.3）。

## 2026-10-09 名称恢复

- App、Safari manifest、主 App/扩展的 CFBundleDisplayName 和启动页统一恢复为 NflxMultiSubs。版本 3.0.3-safari.4 / Safari 3.0.3.4 / native build 20261009.4。
- 保留测试 Bundle ID 和已有设置身份；旧名称只用于安装迁移及历史记录。没有因此获得正式签名。
- 16 项测试、Chrome/Firefox/Safari webpack 及 Xcode Debug 构建通过；临时目录中的 App 签名完整性通过，主 App 和扩展显示名、打包 manifest 名称/版本已逐项核对。
- 本次未替换正在使用的 App，也未再次控制 Netflix；当前代码保持此前用户确认正常的 4px 字幕间距。

- GitHub fork：m1lkkiNG/NflxMultiSubs，parent 已由 GitHub API 确认是 gmertes/NflxMultiSubs。源码发布不等于 Developer ID 签名或 Apple 公证完成。
