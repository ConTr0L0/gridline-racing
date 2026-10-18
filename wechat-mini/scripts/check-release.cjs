const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const project = read('project.config.json'), builtProject = read('dist/project.config.json'), app = read('dist/app.json');
assert.match(project.appid, /^wx[0-9a-f]{16}$/);
assert.equal(builtProject.appid, project.appid, 'Build AppID must match the source project');
assert.equal(project.miniprogramRoot, 'dist/');
assert.equal(builtProject.miniprogramRoot, './');
assert.equal(project.setting.urlCheck, true, 'Domain checking must stay enabled');
assert.equal(app.lazyCodeLoading, 'requiredComponents');
assert.equal(app.window.navigationBarTitleText, 'F1小助手');
for (const page of app.pages) {
  for (const ext of ['.js', '.json', '.wxml']) {
    assert.ok(fs.existsSync(path.join(root, 'dist', page + ext)), 'Missing page: ' + page + ext);
  }
}
assert.ok(fs.existsSync(path.join(root, 'dist/app.wxss')), 'Missing shared styles');
const dist = path.join(root, 'dist');
const files = fs.readdirSync(dist, { recursive: true }).filter(file => fs.statSync(path.join(dist, file)).isFile());
const bytes = files.reduce((sum, file) => sum + fs.statSync(path.join(dist, file)).size, 0);
assert.ok(bytes < 2 * 1024 * 1024, 'Single package exceeds the local 2 MiB release budget');
assert.ok(!files.some(file => /(^|[\\/])(node_modules|\.codex-backup|\.env|\.git)([\\/]|$)/.test(file)), 'Private/dev files must not enter dist');
console.log(`PASS: release config, ${app.pages.length} pages, ${files.length} files, ${bytes} bytes (${(bytes / 1048576).toFixed(2)} MiB). Backend approval and device acceptance require separate verification.`);
