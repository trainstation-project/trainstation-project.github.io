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

## Writing documentation

Documentation pages work like posts (same frontmatter, components and layout)
but live in `src/content/documentation/`, with a book-style contents page at
`/documentation/`.

- **One doc, one file or folder:** a doc is either `name.mdx` or a folder
  `name/index.mdx`, served at `/documentation/<name>/`. A doc with images must
  be a folder, and its images live inside it; the build fails on any image that
  is remote or outside the doc's folder.
- **Sections:** every doc sets `section: '<slug>'` (and optionally `order:` for
  its position) in its frontmatter. Sections, in reading order, are listed in
  `src/doc-sections.ts`; each gets a page at `/documentation/sections/<slug>/`.

See `tokenizer-study/` for an example.

## Deploying

Every push to `main` builds the site and publishes it to
https://trainstation-project.github.io (`.github/workflows/deploy.yml`).
