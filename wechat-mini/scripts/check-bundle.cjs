const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../dist');
const context = vm.createContext({ wx: { webpackJsonp: [] }, require: () => ({}) });
for (const file of fs.readdirSync(root, { recursive: true })) {
  if (file.endsWith('.js') && file !== 'runtime.js') {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
}
const modules = Object.assign({}, ...context.wx.webpackJsonp.map(chunk => chunk[1]));
const missing = [];
for (const [id, factory] of Object.entries(modules)) {
  const code = factory.toString();
  const requireName = code.match(/^function\([^,()]+,[^,()]+,([\w$]+)\)/)?.[1];
  if (!requireName) continue;
  for (const match of code.matchAll(new RegExp('\\b' + requireName + '\\((\\d+)\\)', 'g'))) {
    if (typeof modules[match[1]] !== 'function') missing.push(`${id} -> ${match[1]}`);
  }
}
assert.deepEqual(missing, [], 'Missing webpack modules');
console.log(`PASS: ${Object.keys(modules).length} bundled modules resolve.`);
