// The documentation "book": its sections in reading order. A section's number
// is its position in this list. Every document names one of these slugs in its
// frontmatter (`section: tokenization`) and is listed under it.
export const docSections = [
  {
    slug: 'tokenization',
    title: 'Tokenization',
    description: 'Turning raw text into the token sequences a model trains on.',
  },
] as const;

export type DocSectionSlug = (typeof docSections)[number]['slug'];

export const docSectionSlugs = docSections.map((s) => s.slug) as [
  DocSectionSlug,
  ...DocSectionSlug[],
];

export const sectionNumber = (slug: string) =>
  docSections.findIndex((s) => s.slug === slug) + 1;

export const sectionHref = (slug: string) => `/documentation/sections/${slug}/`;

// Documents inside a section: by `order`, then title.
export const byOrder = (
  a: { data: { order?: number; title: string } },
  b: { data: { order?: number; title: string } }
) =>
  (a.data.order ?? Infinity) - (b.data.order ?? Infinity) ||
  a.data.title.localeCompare(b.data.title);
