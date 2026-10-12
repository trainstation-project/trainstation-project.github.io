import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: ({ image }) => z.object({
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
  }),
});

export const collections = { blog };
