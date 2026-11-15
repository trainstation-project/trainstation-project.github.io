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
import remarkLocalDocImages from './src/plugins/remark-local-doc-images.mjs';
import { fileURLToPath } from 'node:url';
import { readdirSync, utimesSync } from 'node:fs';
import path from 'node:path';

const bibPath = fileURLToPath(new URL('./src/content/blog/references.bib', import.meta.url));
const docsDir = fileURLToPath(new URL('./src/content/documentation', import.meta.url));

// remark-bibtex-refs reads the .bib while compiling a post, but Vite doesn't
// know the post depends on it, so an edit to the .bib alone kept serving the
// cached page. Watch it and touch every post and doc so they recompile.
const watchBib = {
  name: 'watch-bib',
  configureServer(server) {
    server.watcher.add(bibPath);
    server.watcher.on('change', (file) => {
      if (path.resolve(file) !== bibPath) return;
      const now = new Date();
      // docs may be single files or folders (name/index.mdx), so look one level down
      for (const dir of [path.dirname(bibPath), docsDir])
        for (const f of readdirSync(dir, { recursive: true }))
          if (/\.mdx?$/.test(String(f))) utimesSync(path.join(dir, String(f)), now, now);
    });
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://trainstation-project.github.io',
  redirects: {
    // the FLAT post was first published under its old slug
    '/blog/depthwise-causal-conv-on-tpu': '/blog/flat',
    // the tokenizer study was first published as the placeholder some-doc
    '/documentation/some-doc': '/documentation/tokenizer-study',
  },
  integrations: [react(), mdx()],
  vite: { plugins: [watchBib] },
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkMath,
        remarkGfm,
        () => remarkBibtexRefs(bibPath),
        () => remarkLocalDocImages(docsDir),
      ],
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
