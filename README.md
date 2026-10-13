# Blog

An [Astro](https://astro.build) blog. Posts are MDX with KaTeX math, footnotes,
a table of contents, and interactive React figures.

## Running

```sh
npm install
make host-website   # dev server at localhost:4321
npm run build       # static site in ./dist/
```

## Writing a post

Add an `.mdx` file to `src/content/blog/` (see `src/content.config.ts` for the
frontmatter fields). `##`/`###` headings populate the table of contents.

- **Static figures:** wrap content in `components/Figure.astro`. Captions are raw
  HTML, so don't use `$...$` math in them.
- **Interactive figures:** add a React component under `components/figures/` and
  embed it with `client:visible` (see `RecurrenceSimulator.tsx`).
- **Resource links:** list `links` (`label`, `href`, optional `icon`) in the
  frontmatter to show buttons under the byline.

## Deploying

`npm run build` produces a static `dist/` for any static host. Set `site` in
`astro.config.mjs` to the real domain first.
