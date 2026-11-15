import { defineCollection, z, type SchemaContext } from 'astro:content';
import { glob } from 'astro/loaders';
import { docSectionSlugs } from './doc-sections';

// Blog posts and documentation pages share one frontmatter schema and the
// same PostLayout; they differ only in where they live and their URL prefix.
const postSchema = ({ image }: SchemaContext) => z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string(),
    heroImage: image().optional(),
    author: z.string().optional(),
    authors: z
      .array(
        z.object({
          name: z.string(),
          url: z.string().optional(),
          affiliations: z.array(z.number()).optional(),
          equalAdvising: z.boolean().optional(),
        })
      )
      .optional(),
    affiliations: z.array(z.string()).optional(),
    draft: z.boolean().optional().default(false),
    citationStyle: z.enum(['numeric', 'text']).optional().default('text'),
    bibliography: z.string().optional(),
    codeColor: z.enum(['pink', 'green']).optional().default('green'),
    // external resources shown as pills under the byline (models, code, paper)
    links: z
      .array(
        z.object({
          label: z.string(),
          href: z.string(),
          // a short emoji or symbol drawn before the label
          icon: z.string().optional(),
        })
      )
      .optional(),
  });

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: postSchema,
});

const documentation = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/documentation' }),
  schema: (ctx: SchemaContext) =>
    postSchema(ctx).extend({
      // which section of the book this document belongs to (see src/doc-sections.ts)
      section: z.enum(docSectionSlugs),
      // position within its section; documents without one come last, by title
      order: z.number().optional(),
    }),
});

export const collections = { blog, documentation };
