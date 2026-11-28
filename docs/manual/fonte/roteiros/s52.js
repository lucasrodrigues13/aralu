module.exports = async (p, H) => {
  const ctx = await p.browser().createBrowserContext();
  const a = await ctx.newPage();
  await a.setViewport({ width: 420, height: 900, isMobile: true });
  await a.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await H.go(a, '/rsvp/adec65168a5f4ebebd9437c30111ae89');
  await H.shot(a, '43a-rsvp', true);
  await H.dump(a, 'body');
  await ctx.close();
};
