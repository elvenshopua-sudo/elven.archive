// ELVÉN: автоматично публікує НОВІ товари в Instagram (@elven_archive) через офіційний Instagram API.
// Запуск: node scripts/instagram-post.mjs   (Node 18+)
// Змінні (секрети GitHub): IG_TOKEN (токен сторінки), IG_USER_ID (ID акаунта Instagram)
// Необов'язково: DRY_RUN=1 (лише показати, що буде опубліковано), MAX_POSTS=3, ONLY_ID=<id товару>, PRODUCTS_JSON=<файл>, STATE_FILE
import fs from 'node:fs';

const SITE = 'https://elven-archive.shop';
const SUPABASE_URL = 'https://tbkrdfspdozxdiptcmgi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7-9ZVZfZehf8pr59oYztUQ_3G6EYLfI'; // публічний ключ (як в index.html)
const GRAPH = 'https://graph.facebook.com/' + (process.env.GRAPH_VERSION || 'v27.0');
const TOKEN = process.env.IG_TOKEN, IG = process.env.IG_USER_ID;
const DRY = /^(1|true|yes)$/i.test(process.env.DRY_RUN || '');
const MAX = Math.max(1, Number(process.env.MAX_POSTS || 3));
const STATE = process.env.STATE_FILE || 'instagram-posted.json';

const TAGS = { suits: '#спортивнийкостюм #костюм', hoodies: '#худі #hoodie', sweatshirts: '#світшот #кофта', tshirts: '#футболка #поло', pants: '#штани', shorts: '#шорти', outerwear: '#куртка #жилет', thermal: '#термобілизна', sets: '#комплект', accessories: '#аксесуари' };
const BASE_TAGS = '#elven #elvenarchive #чоловічийодяг #одягукраїна #купитиодяг #mensfashion #стиль';

const fmt = (n) => new Intl.NumberFormat('uk-UA').format(Number(n)) + ' грн';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const imgs = (p) => (Array.isArray(p.images) && p.images.length ? p.images : (p.img ? [p.img] : [])).filter(u => /^https?:\/\//.test(u));
const valid = (p) => p && p.id != null && String(p.name || '').trim() && Number(p.price) > 0 && imgs(p).length;

async function load() {
  if (process.env.PRODUCTS_JSON) return JSON.parse(fs.readFileSync(process.env.PRODUCTS_JSON, 'utf8'));
  const r = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
  if (!r.ok) throw new Error('Supabase: ' + r.status + ' ' + await r.text());
  return r.json();
}

// Бере опис із сайту й лишає тільки характеристики (без вступу, виробника, підпису й розмірів: їх додаємо окремо).
function specLines(p) {
  let t = String(p.desc || '').replace(/\r/g, '');
  t = t.replace(/Стильна модель.*?деталі\.\s*/s, '');
  t = t.replace(/🖤?\s*ELV[ÉE]N\s*[—–-]\s*стиль у кожній деталі\.?/gi, '');
  t = t.replace(/📌|\*\*/g, '').replace(/Характеристики\s*:/gi, '');
  t = t.replace(/[ \t]+(Матеріал|Колір|Виробник|Розміри?|Склад|Логотип)\s*:/gi, '\n$1:'); // якщо опис в один рядок
  const name = String(p.name || '').trim().toLowerCase();
  let sizesLine = '';
  const lines = [];
  for (let l of t.split('\n')) {
    l = l.trim().replace(/\s+:/g, ':');
    if (!l || /^опис:?$/i.test(l)) continue;
    if (l.toLowerCase() === name) continue;
    if (/^виробник/i.test(l)) continue;
    if (/^розмір/i.test(l)) { sizesLine = l.replace(/^розміри?\s*:\s*/i, ''); continue; }
    lines.push(l);
  }
  const sizes = Array.isArray(p.sizes) && p.sizes.length ? p.sizes.join(', ') : sizesLine;
  if (sizes) lines.push('Розмір: ' + sizes);
  return lines;
}

function caption(p) {
  const specs = specLines(p);
  const sku = String(p.sku || '').trim();
  const out = [
    '✨ ' + String(p.name).trim(),
    '',
    ...(specs.length ? ['📌 Характеристики:', ...specs, ''] : []),
    `💰 - ${Number(p.price)} ГРН 💸`,
    ...(sku ? [`🔖 - ${sku}`] : []),
    '',
    '🖤 ELVEN — стиль у кожній деталі.',
    '',
    [BASE_TAGS, TAGS[p.category] || ''].filter(Boolean).join(' '),
  ];
  return out.join('\n').slice(0, 2100);
}

async function api(path, params) {
  const r = await fetch(`${GRAPH}/${path}`, { method: 'POST', body: new URLSearchParams({ ...params, access_token: TOKEN }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`Instagram API ${path}: ` + JSON.stringify(j.error || j));
  return j;
}
async function status(id) {
  const r = await fetch(`${GRAPH}/${id}?fields=status_code,status&access_token=${encodeURIComponent(TOKEN)}`);
  return r.json();
}
async function waitReady(id) {
  for (let i = 0; i < 30; i++) {
    const s = await status(id);
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error('Контейнер ' + id + ': ' + JSON.stringify(s));
    await sleep(3000);
  }
  throw new Error('Контейнер ' + id + ' не став готовим за 90 с');
}

async function publish(p) {
  const im = imgs(p).slice(0, 10), cap = caption(p);
  let creation;
  if (im.length === 1) {
    creation = (await api(`${IG}/media`, { image_url: im[0], caption: cap })).id;
  } else {
    const kids = [];
    for (const u of im) { const k = (await api(`${IG}/media`, { image_url: u, is_carousel_item: 'true' })).id; kids.push(k); }
    for (const k of kids) await waitReady(k);
    creation = (await api(`${IG}/media`, { media_type: 'CAROUSEL', children: kids.join(','), caption: cap })).id;
  }
  await waitReady(creation);
  return (await api(`${IG}/media_publish`, { creation_id: creation })).id;
}

const readState = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return null; } };
const writeState = (s) => fs.writeFileSync(STATE, JSON.stringify(s, null, 2) + '\n');

const all = (await load()).filter(valid).sort((a, b) => Number(a.id) - Number(b.id));
let state = readState();

if (!state) {
  // Перший запуск: усі наявні товари вважаємо вже опублікованими, щоб не засмітити стрічку.
  state = { note: 'id товарів, які вже опубліковані або пропущені. Видаліть id, щоб опублікувати знову.', ids: all.map(p => String(p.id)) };
  if (!DRY) writeState(state);
  console.log(`Перший запуск: записано ${state.ids.length} наявних товарів як «вже є». Нові товари публікуватимуться автоматично.`);
  process.exit(0);
}

const done = new Set(state.ids.map(String));
let todo = all.filter(p => !done.has(String(p.id)));
if (process.env.ONLY_ID) todo = all.filter(p => String(p.id) === String(process.env.ONLY_ID));
todo = todo.slice(0, MAX);

if (!todo.length) { console.log('Нових товарів немає.'); process.exit(0); }
if (!DRY && (!TOKEN || !IG)) { console.error('Немає секретів IG_TOKEN / IG_USER_ID'); process.exit(1); }

let failed = 0;
for (const p of todo) {
  console.log(`\n=== ${p.name} (id ${p.id}), фото: ${Math.min(imgs(p).length, 10)} ===\n${caption(p)}\n`);
  if (DRY) continue;
  try {
    const mediaId = await publish(p);
    state.ids.push(String(p.id));
    writeState(state);
    console.log('Опубліковано, media id ' + mediaId);
    await sleep(5000);
  } catch (e) {
    failed++;
    console.error('Помилка для товару ' + p.id + ': ' + e.message);
  }
}
if (failed) process.exit(1);
