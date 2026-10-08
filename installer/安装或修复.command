#!/bin/bash
set -euo pipefail
package_dir="$(cd "$(dirname "$0")" && pwd)"
app_name='NflxMultiSubs Safari Local.app'
app_id='local.nflxmultisubs.safari.repair'
ext_id="$app_id.Extension"
check_only="${1:-}"
destination="$HOME/Applications/$app_name"
staging="$(mktemp -d "${TMPDIR:-/tmp/}nms-install.XXXXXX")"
finish() {
  result=$?
  rm -rf "$staging"
  if [[ $result != 0 ]]; then printf '\n安装未完成。请把上面的错误信息发回，不需要发送任何密码。\n'; fi
  if [[ -t 0 && "$check_only" != '--check' ]]; then read -r -p '按回车关闭此窗口…' _reply || true; fi
}
trap finish EXIT
printf 'NflxMultiSubs Safari Local · LOCAL.3\n'
/usr/bin/ditto -x -k "$package_dir/payload.zip" "$staging"
source_app="$staging/$app_name"
source_ext="$source_app/Contents/PlugIns/NflxMultiSubs Extension.appex"
[[ "$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$source_app/Contents/Info.plist")" == "$app_id" ]]
[[ "$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$source_ext/Contents/Info.plist")" == "$ext_id" ]]
/usr/bin/codesign --verify --deep --strict "$source_app"
if [[ "${1:-}" == '--check' ]]; then
  printf '安装包内容、应用标识和签名完整性检查通过；尚未安装。\n'
  exit 0
fi
printf '\n本程序只安装/更新此本地测试版，不修改原版 NflxMultiSubs 或 Safari 安全设置。\n'
printf '请先退出 Safari 和本地测试 App，再继续。\n'
read -r -p '准备好后按回车安装…' _reply
# Remove registrations only for known temporary products of this repair, never the original extension.
for old_root in /private/tmp/nflxmultisubs-local3 /private/tmp/nflxmultisubs-local3-no-registration /private/tmp/nflxmultisubs-safari-20261008; do
  old_app="$old_root/Build/Products/Debug/$app_name"
  if [[ -d "$old_app" ]] && [[ "$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$old_app/Contents/Info.plist" 2>/dev/null)" == "$app_id" ]]; then
    /usr/bin/pluginkit -r "$old_app/Contents/PlugIns/NflxMultiSubs Extension.appex" || true
    /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -u "$old_app" || true
  fi
done
mkdir -p "$HOME/Applications"
if [[ -e "$destination" ]]; then
  [[ "$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$destination/Contents/Info.plist")" == "$app_id" ]] || { printf '目标位置存在不同应用，已停止。\n'; exit 1; }
  backup_dir="$HOME/Library/Application Support/NflxMultiSubs Safari Local/Backups"
  mkdir -p "$backup_dir"
  /usr/bin/ditto -c -k --norsrc --keepParent "$destination" "$backup_dir/Local-$(date +%Y%m%d-%H%M%S).zip"
  /usr/bin/pluginkit -r "$destination/Contents/PlugIns/NflxMultiSubs Extension.appex" || true
  rm -rf "$destination"
fi
/usr/bin/ditto --norsrc "$source_app" "$destination"
/usr/bin/codesign --verify --deep --strict "$destination"
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$destination"
/usr/bin/pluginkit -a "$destination/Contents/PlugIns/NflxMultiSubs Extension.appex"
printf '\n已复制到：%s\n扩展注册结果：\n' "$destination"
/usr/bin/pluginkit -m -A -v -i "$ext_id"
printf '\n接下来：\n1. 打开 Safari → 设置 → 开发者 → 允许未签名的扩展，并完成系统认证。\n2. 设置 → 扩展 → 勾选 NflxMultiSubs Safari Local。\n3. 打开 Netflix，允许 netflix.com 访问，刷新页面。\n\nSafari 每次退出后，“允许未签名的扩展”会重置，需要再次开启；不必反复解压安装。\n'
/usr/bin/open "$destination"
