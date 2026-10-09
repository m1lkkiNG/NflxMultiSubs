#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci --ignore-scripts
npm test
npm run build
npm run sync-safari
# Build outside iCloud/Documents: file provider FinderInfo can break codesigning.
derived_dir="${TMPDIR:-/tmp/}nflxmultisubs-safari-local-build"
xcodebuild -project safari_web_extension/MultiSubs/NflxMultiSubs.xcodeproj \
  -scheme 'NflxMultiSubs (macOS)' -configuration Debug \
  -derivedDataPath "$derived_dir" CODE_SIGN_IDENTITY=- DEVELOPMENT_TEAM= CODE_SIGN_STYLE=Manual build
mkdir -p dist
ditto --norsrc "$derived_dir/Build/Products/Debug/NflxMultiSubs.app" 'dist/NflxMultiSubs.app'
codesign --verify --deep --strict 'dist/NflxMultiSubs.app'
printf '%s\n' 'Built: dist/NflxMultiSubs.app (local ad-hoc signature; not notarized)'
