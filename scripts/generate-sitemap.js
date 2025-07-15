const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');
const path = require('path');

// Define your app's routes
const routes = [
  '/',
  '/Login',
  '/Register',
  '/Search',
  '/Chat',
  '/Reset',
];

(async () => {
  const sitemap = new SitemapStream({ hostname: 'https://travalpass.com' });
  const writeStream = createWriteStream(
    path.resolve(__dirname, '../public/sitemap.xml')
  );

  sitemap.pipe(writeStream);

  routes.forEach((route) => {
    sitemap.write({ url: route, changefreq: 'daily', priority: 0.8 });
  });

  sitemap.end();

  await streamToPromise(sitemap);
  console.log('Sitemap generated successfully!');
})();
