const path = require('path');

module.exports = {
  projectName: 'f1-gridline-wechat',
  date: '2026-10-08',
  designWidth: 750,
  deviceRatio: { 750: 1 },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  compiler: 'webpack5',
  plugins: ['@tarojs/plugin-framework-react', '@tarojs/plugin-platform-weapp'],
  mini: {
    compile: { include: [path.resolve(__dirname, '../..')] },
    postcss: { autoprefixer: { enable: true } },
  },
};
