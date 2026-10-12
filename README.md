# Blog

A static blog built with [Astro](https://astro.build), styled after
[humans&'s NVFP4 RL post](https://humansand.ai/blog/nvfp4-rl): warm paper
background, Newsreader/Inter typography, a sticky left-rail table of
contents, footnotes, and KaTeX math. Posts are MDX and can embed interactive
React "islands" alongside plain static figures.

## Structure

```
src/
├── content/blog/*.mdx       # posts (frontmatter: title, subtitle?, description, author, date, draft?)
├── components/
│   ├── Header.astro, Footer.astro, TableOfContents.astro
│   ├── Figure.astro         # static figure + caption wrapper
│   └── figures/*.tsx        # interactive React islands (charts, sliders, sims)
├── layouts/
│   ├── BaseLayout.astro     # <head>, header, footer, fonts
│   └── PostLayout.astro     # hero (title/subtitle/byline) + TOC + article wrapper
├── pages/
│   ├── index.astro          # post listing
│   └── blog/[...slug].astro # renders a post from the content collection
├── site.config.ts           # brand name, tagline, nav links
└── styles/global.css        # design tokens + all component styles
```

## Writing a post

Add a new `.mdx` file under `src/content/blog/`:

```mdx
---
title: 'My Post Title'
subtitle: 'Optional subtitle'
description: 'One or two sentences for the homepage card and <meta description>.'
author: 'Your Name'
date: 2026-08-18
---

Body text with inline math $x^2$ and block math:

$$
\mathbb{E}[x^2] = \sigma^2
$$

Footnotes work too[^1].

[^1]: Like this.
```

`##`/`###` headings automatically populate the table of contents (desktop
left rail above 1460px, a collapsible `<details>` on narrower screens).

### Static figures

```mdx
import Figure from '../../components/Figure.astro';

<Figure caption="<strong>Figure.</strong> What this shows.">
  <img src="/some-image.png" alt="..." />
</Figure>
```

Avoid `$...$` math inside the `caption` string — it's inserted as raw HTML
and isn't run through the markdown/KaTeX pipeline. Use plain text/HTML
(e.g. `H<sub>t</sub>`) there instead.

### Interactive figures

Add a component under `src/components/figures/*.tsx` (see
`RecurrenceSimulator.tsx` for a worked example: sliders driving a canvas
plot) and embed it with a `client:` directive so Astro hydrates it in the
browser:

```mdx
import RecurrenceSimulator from '../../components/figures/RecurrenceSimulator.tsx';

<Figure caption="...">
  <RecurrenceSimulator client:visible />
</Figure>
```

`client:visible` hydrates when the figure scrolls into view;
use `client:load` if it should hydrate immediately.

## Commands

| Command           | Action                                      |
| :----------------- | :------------------------------------------ |
| `npm run dev`       | Start the dev server at `localhost:4321`    |
| `npm run build`     | Build the static site to `./dist/`          |
| `npm run preview`   | Preview the production build locally        |

## Deploying

`npm run build` produces a fully static `dist/` directory — deploy it to
GitHub Pages, Vercel, Netlify, or any static host. Set `site` in
`astro.config.mjs` to the real domain before deploying (used for canonical
URLs/sitemaps).
