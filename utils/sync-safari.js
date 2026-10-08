const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'build/safari');
const destination = path.join(root, 'safari_web_extension/MultiSubs/Shared (Extension)/Resources');
if (!fs.existsSync(path.join(source, 'manifest.json'))) throw new Error('Run npm run build first');
fs.mkdirSync(destination, { recursive: true }); // Preserve unrelated local resource files.
fs.cpSync(source, destination, { recursive: true });
console.log('Safari resources synced.');
