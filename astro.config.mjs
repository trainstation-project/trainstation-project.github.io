// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeCitationStyle from './src/plugins/rehype-citation-style.mjs';
import remarkBibtexRefs from './src/plugins/remark-bibtex-refs.mjs';
import { fileURLToPath } from 'node:url';
import { readdirSync, utimesSync } from 'node:fs';
import path from 'node:path';

const bibPath = fileURLToPath(new URL('./src/content/blog/references.bib', import.meta.url));

// remark-bibtex-refs reads the .bib while compiling a post, but Vite doesn't
// know the post depends on it, so an edit to the .bib alone kept serving the
// cached page. Watch it and touch every post so they recompile.
const watchBib = {
  name: 'watch-bib',
  configureServer(server) {
    server.watcher.add(bibPath);
    server.watcher.on('change', (file) => {
      if (path.resolve(file) !== bibPath) return;
      const dir = path.dirname(bibPath);
      const now = new Date();
      for (const f of readdirSync(dir)) if (/\.mdx?$/.test(f)) utimesSync(path.join(dir, f), now, now);
    });
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://trainstation-project.github.io',
  // the FLAT post was first published under its old slug
  redirects: { '/blog/depthwise-causal-conv-on-tpu': '/blog/flat' },
  integrations: [react(), mdx()],
  vite: { plugins: [watchBib] },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, remarkGfm, () => remarkBibtexRefs(bibPath)],
      rehypePlugins: [rehypeKatex, rehypeCitationStyle],
      remarkRehype: {
        footnoteLabel: 'References',
        footnoteLabelProperties: { className: ['footnote-heading'] },
        footnoteBackLabel: 'Back to reference',
        footnoteBackContent: () => [],
      },
    }),
  },
});
