# Safari 正式发布准备

核查日期：2026-10-08。当前是发布准备分支，尚未生成 Developer ID 正式签名/公证产物，尚未推送 GitHub。

## 当前状态

LOCAL.3 的字幕间距已由用户实测确认；主副字幕可选择，结束远程控制后原生视频正常。用户报告退出 Safari 后扩展消失，须重跑安装入口。现有安装仍为 ad-hoc 本地签名，不能当作正式安装方式。当前工具可见的钥匙串查询返回 0 个可用代码签名身份，不能据此推断用户是否已有付费开发者账号。

Safari 未签名开关会在退出时重置；重开开关后仍需重新注册的问题尚未单独定位。正式签名版必须重新验收“关闭未签名开关 → 安装 → 重启 Safari/系统 → 仍可用”，不能只用签名完成来声称安装问题已解决。

## Aurora v3.0.2 的实际签名

直接下载公开 Release 资产 NflxMultiSubs.zip，未运行原 App。

- release tag：v3.0.2，target_commitish：safari_support，发布日期 2025-09-19。
- ZIP SHA-256：42c308fa21c275f25fb3ecf926c0bb8a9bd00ebf7194cf2f62b67ca904854f2e，与 GitHub API 的 digest 一致。
- 主 App ID：com.aury.NflxMultiSubs。
- 扩展 ID：com.aury.NflxMultiSubs.Extension。
- 两者 Authority：Developer ID Application: Ave Ozkal (LUZK6JBS9B)。
- TeamIdentifier：LUZK6JBS9B。
- Hardened Runtime 已启用，安全时间戳 2025-09-19。
- App 的 codesign 元数据显示 Notarization Ticket=stapled。
- 二进制为 arm64 + x86_64 通用版本。
- 在非 iCloud 临时目录解压后 codesign --verify --deep --strict 通过；stapler validate 在本工具环境返回 kLSDataUnavailableErr，未完成公证在线验证，不能将其记为通过。

发布说明也写明 signed and notarized by Apple。检视的 safari-web-extension 分支工作流只有 Linux/Node 构建，没有展示 Developer ID 私钥或 Safari 公证流水线；能确认产物的签名方式，不能据此断言作者具体用了哪个私有发布脚本。

原证书/私钥不会随 fork 转移；改动旧包会破坏其签名，必须用自己的身份重新签名。

## 推荐 fork 和导入方式

推荐 fork gmertes/NflxMultiSubs 的 master。我们的代码基于 9d96a300fac24eb8d500e9a5d6fe279686f875a7，已包含新版 Netflix 字段修复；原生 Safari 工程另从 Aurora 分支复用。不要重新从旧 Safari v3.0.2 开始再遗漏这些修复。

交付的 NflxMultiSubs-Safari-发布分支.bundle 保留完整 Git 历史，包含 release/safari-distribution 分支。先在 GitHub fork gmertes 仓库，再在本机执行（替换占位符）：

```sh
git clone https://github.com/YOUR_GITHUB_NAME/NflxMultiSubs.git
cd NflxMultiSubs
git fetch /绝对路径/NflxMultiSubs-Safari-发布分支.bundle refs/heads/release/safari-distribution:refs/heads/release/safari-distribution
git switch release/safari-distribution
git push -u origin release/safari-distribution
```

源码遵循仓库 LICENSE；保留已有版权和许可声明，README 说明 fork 来源、Safari 原生工程来源与自己的修改。

本准备分支把继承的 Chrome/Firefox 商店发布工作流改为手动触发，防止创建 Safari Release 时自动尝试发布到上游商店 ID。它不是 Safari 发布流水线；不要直接手动运行，除非先换成自己的商店 ID 和凭据。

## 开发者账号与安装形式

公开源码/提供测试包不需要付费会员。但若要普通用户正常安装、无需允许未签名扩展，按 Apple 官方流程加入 Apple Developer Program，使用自己的 Developer ID Application 证书签名主 App 和扩展并公证。官方会费为每年 99 美元或当地价格。

推荐首次发布使用“签名并公证的 App + ZIP/DMG”。用户解压/拖到应用程序，打开一次，在 Safari 扩展设置启用并允许 netflix.com。无需运行安装修复脚本，也无需开启未签名扩展。Safari 的启用与网站访问授权仍由用户确认。

如果希望双击后出现系统“继续/安装”向导，使用 .pkg：App/appex 仍用 Developer ID Application 签名，安装包另用 Developer ID Installer 签名，并公证最终分发包。只把当前测试版装进 DMG/PKG 不会变成正式签名版本。

## 签名前还需完成的工程配置

当前源码保留可用的本地测试配置，以下是正式版待办，不是已完成状态：

1. 在 Xcode 登录自己的开发者账号、创建/安装自己的 Developer ID Application 身份。私钥和凭据留在本机钥匙串，不提交到 Git。
2. 打开 safari_web_extension/MultiSubs/NflxMultiSubs.xcodeproj，选择 NflxMultiSubs (macOS) scheme。
3. 给 macOS 主 App 和 Extension 两个 target 的 Release 配置设置自己的 Team，移除本地 CODE_SIGN_IDENTITY=-，使用合适的归档/Developer ID 导出签名配置；保留 Hardened Runtime。不要把两个 target 强行设置成同一个 Bundle ID。
4. 使用自己的固定 App ID，例如 io.github.YOUR_NAME.nflxmultisubs；扩展为该 ID 后加 .Extension。同步修改 Shared (App)/ViewController.swift 中 extensionBundleIdentifier，或改为从主 App ID 推导。发布后保持 ID 和签名团队稳定，避免更新被当作另一个扩展。
5. 将 LOCAL 名称、启动页的未签名/安装脚本说明改成正式产品名和正常安装说明；指定正式版本号与递增 build。暂不宣称支持低于当前工程的 macOS 15 / Safari 18。
6. npm ci → npm test → npm run build → npm run sync-safari。不要用 utils/build-safari-local.sh 生成正式产物；该脚本特意使用 ad-hoc 签名。
7. Product → Archive，再用 Organizer 的 Developer ID 分发/公证流程。选择 Release，关闭 Only Active Architecture；若面向 Intel 用户，确认 App 和 appex 都包含 arm64/x86_64。当前交付 LOCAL.3 只验证了本机 arm64。
8. 导出后检验签名、公证票据和 Gatekeeper，再制作 ZIP/DMG 或有 Developer ID Installer 签名的 PKG。签名后不得再改 JS、manifest、图标或启动页面。
9. 完成下列验收后，在自己的 GitHub fork 创建指向该提交的 tag/Release，上传已验证的最终文件和校验值。

## 正式发布验收

- 关闭“允许未签名的扩展”，停用旧本地测试版；从最终分发包安装正式版。
- Safari 能识别并启用；退出重开 Safari、重启 Mac 后仍存在，不需要重跑注册脚本。
- 下载到另一用户账户/干净环境测试首次安装，确认没有依赖本机旧注册状态。
- 中英互换、暂停/快进/后退、刷新、首页进入、下一集、全屏、设置保存逐项检查。
- 本任务只记录过扩展开启时 3840×2160；没有完整同片源基线和 HDR 流证明。Release 不能写“4K/HDR 已全部验证”。
- 保留主视频、FairPlay/EME 和播放器链路不变。

## 官方与原始来源

- [Aurora v3.0.2](https://github.com/AuroraWright/NflxMultiSubs/releases/tag/v3.0.2)
- [Apple Safari Web Extension 分发](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension)
- [Developer ID 证书：Application 与 Installer](https://developer.apple.com/help/account/certificates/create-developer-id-certificates/)
- [Apple Developer Program 费用](https://developer.apple.com/help/account/membership/program-enrollment/)
- [macOS 公证](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
