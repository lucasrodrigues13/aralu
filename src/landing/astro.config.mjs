import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://aralu.com.br',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [sitemap()],
});
