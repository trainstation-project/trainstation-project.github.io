// Documentation docs are self-contained: a doc is either `name.mdx` (no images)
// or a folder `name/index.mdx` holding its images. This fails the build when a
// doc references an image that is remote, absolute, or outside its own folder.
import path from 'node:path';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg|bmp|ico|tiff?)(\?.*)?$/i;

const visit = (node, fn) => {
  fn(node);
  if (Array.isArray(node.children)) for (const child of node.children) visit(child, fn);
};

export default function remarkLocalDocImages(docsDir) {
  const root = path.resolve(docsDir);

  return (tree, file) => {
    const filePath = file.path && path.resolve(file.path);
    if (!filePath || !filePath.startsWith(root + path.sep)) return;

    const rel = path.relative(root, filePath);
    const isFolderDoc = /^[^/\\]+[/\\]index\.mdx?$/.test(rel);
    const ownDir = path.dirname(filePath);
    const problems = [];

    const check = (src, where) => {
      if (typeof src !== 'string' || !src || src.startsWith('data:')) return;
      if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(src) || src.startsWith('/')) {
        problems.push(`${where} "${src}" is not a local file; put the image in the doc's folder and use a relative path.`);
        return;
      }
      if (!isFolderDoc) {
        problems.push(`${where} "${src}": a doc with images must be a folder. Move ${rel} to ${rel.replace(/\.mdx?$/, '')}/index.mdx and put the image next to it.`);
        return;
      }
      const resolved = path.resolve(ownDir, src.split(/[?#]/)[0]);
      if (!resolved.startsWith(ownDir + path.sep)) {
        problems.push(`${where} "${src}" is outside the doc's folder (${path.relative(root, ownDir)}/).`);
      }
    };

    visit(tree, (node) => {
      if (node.type === 'image' || node.type === 'definition') {
        if (node.type === 'image' || IMAGE_EXT.test(node.url)) check(node.url, 'Image');
      } else if (
        (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
        Array.isArray(node.attributes)
      ) {
        for (const attr of node.attributes) {
          if ((attr.name === 'src' || attr.name === 'href') && typeof attr.value === 'string') {
            if (attr.name === 'src' || IMAGE_EXT.test(attr.value)) check(attr.value, `<${node.name} ${attr.name}>`);
          }
        }
      } else if (node.type === 'mdxjsEsm') {
        for (const m of node.value.matchAll(/\bfrom\s+['"]([^'"]+)['"]|\bimport\s+['"]([^'"]+)['"]/g)) {
          const spec = m[1] ?? m[2];
          if (IMAGE_EXT.test(spec)) check(spec, 'Import');
        }
      } else if (node.type === 'html' && /<img\b/i.test(node.value)) {
        for (const m of node.value.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) check(m[1], '<img src>');
      }
    });

    if (problems.length) {
      throw new Error(`Doc ${rel} references images that are not inside the doc:\n  - ${problems.join('\n  - ')}`);
    }
  };
}
