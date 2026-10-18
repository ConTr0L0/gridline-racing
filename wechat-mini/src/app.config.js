export default defineAppConfig({
  lazyCodeLoading: 'requiredComponents',
  pages: [
    'pages/home/index',
    'pages/schedule/index',
    'pages/standings/index',
    'pages/library/index',
    'pages/favorites/index',
  ],
  window: {
    navigationBarTitleText: 'F1小助手',
    navigationStyle: 'custom',
    navigationBarBackgroundColor: '#F5F6F7',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5F6F7',
    backgroundTextStyle: 'dark',
  },
});
