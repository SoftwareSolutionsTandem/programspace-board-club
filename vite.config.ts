import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { parseProduct, type ProductConfig } from './src/products/types.ts';

// Продукт сборки: `vite build --mode durak`. Обычные режимы (production, development, test) — «Игротека».
// Состав продуктов и проверка сборки — docs/ARCHITECTURE.md §8.
const root = import.meta.dirname;
const PRODUCTS = readdirSync(join(root, 'src/products')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));

function loadProduct(mode: string): ProductConfig {
  const id = PRODUCTS.includes(mode) ? mode : 'igroteka';
  return parseProduct(JSON.parse(readFileSync(join(root, 'src/products', `${id}.json`), 'utf8')));
}

function filesUnder(path: string): string[] {
  return statSync(path).isDirectory() ? readdirSync(path).flatMap((name) => filesUnder(join(path, name))) : [path];
}

// Пути в сборке и в отчёте — с прямой косой чертой и на Windows.
const posix = (p: string) => p.split(sep).join('/');

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * Ресурсы и паспорт продукта. Vite по умолчанию копирует весь public/ — это отключено (copyPublicDir: false),
 * и в сборку попадают только пути из product.publicAssets и иконка. После записи рядом с папкой сборки
 * кладётся отчёт: какие модули реально вошли в каждый чанк и какие файлы выпущены (его проверяет tools/check-bundle.mjs).
 */
function productPlugin(product: ProductConfig): Plugin {
  const publicDir = join(root, 'public');
  return {
    name: 'board-club-product',
    transformIndexHtml(html) {
      const title = product.strings['app.title'];
      return title ? html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`) : html;
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'favicon.svg', source: readFileSync(join(root, product.icon.file)) });
      for (const asset of product.publicAssets) {
        for (const file of filesUnder(join(publicDir, asset))) {
          this.emitFile({ type: 'asset', fileName: posix(relative(publicDir, file)), source: readFileSync(file) });
        }
      }
    },
    writeBundle(options, bundle) {
      const outDir = options.dir ?? join(root, 'dist', product.id);
      const chunks = Object.values(bundle).map((b) =>
        b.type === 'chunk'
          ? { fileName: b.fileName, type: 'chunk', modules: (b.moduleIds ?? Object.keys(b.modules)).map((m) => (m.startsWith('\0') ? m : posix(relative(root, m)))) }
          : { fileName: b.fileName, type: 'asset' },
      );
      const report = { product: product.id, version: product.version, outDir: posix(relative(root, outDir)), files: chunks };
      writeFileSync(join(outDir, '..', `${product.id}.build.json`), JSON.stringify(report, null, 2) + '\n');
    },
  };
}

export default defineConfig(({ mode }) => {
  const product = loadProduct(mode);
  return {
    // Относительные пути: архив игры для Яндекс Игр открывается не из корня домена.
    base: './',
    resolve: { alias: { '@product-games': resolve(root, 'src/products', `${product.id}.games.ts`), '@product': resolve(root, 'src/products', `${product.id}.json`) } },
    plugins: [productPlugin(product)],
    build: {
      outDir: `dist/${product.id}`,
      emptyOutDir: true,
      // В сервере разработки public/ раздаётся целиком; в сборку — только ресурсы продукта (productPlugin).
      copyPublicDir: false,
      target: 'es2022',
      sourcemap: true,
    },
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  };
});
