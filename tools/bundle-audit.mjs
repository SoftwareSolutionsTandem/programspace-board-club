// Проверка состава сборки продукта (docs/ARCHITECTURE.md §8). Чистая функция: на входе — конфиг продукта,
// отчёт сборщика (какие модули реально вошли в чанки, какие файлы выпущены) и фактическое содержимое папки сборки.
// Ничего не угадывает по тексту минифицированного кода.

/**
 * @param {object} a
 * @param {{id: string, games: string[], characters: string[], publicAssets: string[], strings: Record<string,string>, icon: {file: string, status: string}}} a.product
 * @param {{files: {fileName: string, type: 'chunk'|'asset', modules?: string[]}[]}} a.report отчёт productPlugin (vite.config.ts)
 * @param {Map<string, string>} a.dist файл сборки → sha256
 * @param {Map<string, string>} a.publicFiles файл public/ (путь от public/) → sha256
 * @param {string} a.iconHash sha256 файла иконки продукта
 * @param {string} a.licenses текст assets/audio/LICENSES.md
 * @param {Map<string, {lines: Record<string, Record<string, string>>}>} a.manifests папка → манифест голоса из сборки
 * @param {string} a.indexHtml
 * @param {string} a.expectedTitle
 */
export function auditBuild(a) {
  const errors = [];
  const warnings = [];
  const { product } = a;

  // 1. Модули: только свои игры, персонажи и конфиг своего продукта.
  const modules = new Set(a.report.files.flatMap((f) => f.modules ?? []));
  const seenGames = new Set();
  const seenChars = new Set();
  for (const m of modules) {
    const game = /^src\/games\/([^/]+)\//.exec(m)?.[1];
    if (game) {
      if (!product.games.includes(game)) errors.push(`модуль чужой игры «${game}»: ${m}`);
      seenGames.add(game);
    }
    const ch = /^src\/characters\/([^/]+)\//.exec(m)?.[1];
    if (ch) {
      if (!product.characters.includes(ch)) errors.push(`модуль чужого персонажа «${ch}»: ${m}`);
      seenChars.add(ch);
    }
    const prod = /^src\/products\/([^/]+)\.json$/.exec(m)?.[1];
    if (prod && prod !== product.id) errors.push(`конфиг другого продукта в сборке: ${m}`);
    // Демо-страницы анимаций (src/dev) подключаются только в режиме разработки.
    if (m.startsWith('src/dev/')) errors.push(`модуль режима разработки в сборке: ${m}`);
  }
  for (const g of product.games) if (!seenGames.has(g)) errors.push(`игра «${g}» указана в продукте, но её модулей нет в сборке`);
  for (const c of product.characters) if (!seenChars.has(c)) errors.push(`персонаж «${c}» указан в продукте, но его модулей нет в сборке`);
  if (!modules.has(`src/products/${product.id}.json`)) errors.push(`в сборке нет конфига своего продукта src/products/${product.id}.json`);

  // 2. Файлы: в папке сборки ровно то, что выпустил сборщик, — без посторонних и без потерь.
  const emitted = new Set(a.report.files.map((f) => f.fileName));
  for (const f of a.dist.keys()) if (!emitted.has(f)) errors.push(`файл в сборке не от сборщика: ${f}`);
  for (const f of emitted) if (!a.dist.has(f)) errors.push(`сборщик выпустил, но файла нет: ${f}`);

  // 3. Ресурсы из public/: только разрешённые продуктом, побайтно как в исходнике, и все.
  const allowed = (f) => product.publicAssets.some((p) => f === p || f.startsWith(p + '/'));
  for (const [f, hash] of a.dist) {
    if (f === 'index.html' || f === 'favicon.svg' || f.startsWith('assets/')) continue;
    if (!allowed(f)) errors.push(`ресурс вне состава продукта: ${f}`);
    else if (a.publicFiles.get(f) !== hash) errors.push(`ресурс отличается от public/${f}`);
  }
  for (const f of a.publicFiles.keys()) if (allowed(f) && !a.dist.has(f)) errors.push(`ресурс продукта не попал в сборку: ${f}`);

  // 4. Голос: права на каждый файл и манифест только на существующие файлы.
  for (const f of a.dist.keys()) {
    if (f.startsWith('audio/') && !a.licenses.includes('`public/' + f + '`')) errors.push(`нет записи о правах: public/${f}`);
  }
  for (const [dir, m] of a.manifests) {
    for (const [id, entry] of Object.entries(m.lines ?? {})) {
      for (const file of Object.values(entry)) if (!a.dist.has(`${dir}/${file}`)) errors.push(`манифест ${dir}: ${id} → нет файла ${file}`);
    }
  }

  // 5. Паспорт: иконка и название.
  if (a.dist.get('favicon.svg') !== a.iconHash) errors.push(`favicon.svg не совпадает с иконкой продукта ${product.icon.file}`);
  if (product.icon.status === 'temporary') warnings.push(`иконка временная (${product.icon.file}) — до утверждения собственной`);
  if (!a.indexHtml.includes(`<title>${a.expectedTitle}</title>`)) errors.push(`заголовок страницы не «${a.expectedTitle}»`);

  return { errors, warnings, modules: modules.size, games: [...seenGames], characters: [...seenChars] };
}
