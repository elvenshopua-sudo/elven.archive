// ELVÉN: генерує сторінки товарів (p/...), sitemap.xml і feed.xml (для Google Merchant Center)
// Запуск: node scripts/build-products.mjs   (потрібен Node 18+)
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://elven-archive.shop';
const SUPABASE_URL = 'https://tbkrdfspdozxdiptcmgi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7-9ZVZfZehf8pr59oYztUQ_3G6EYLfI';   // публічний ключ (той самий, що в index.html)
const OUT = process.env.OUT_DIR || '.';
const CATS = { suits: 'Спортивні костюми', hoodies: 'Худі', sweatshirts: 'Кофти та світшоти', tshirts: 'Футболки та поло', pants: 'Штани', shorts: 'Шорти', outerwear: 'Куртки та жилети', thermal: 'Термобілизна', sets: 'Комплекти', accessories: 'Аксесуари' };

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TR = { а:'a',б:'b',в:'v',г:'h',ґ:'g',д:'d',е:'e',є:'ye',ж:'zh',з:'z',и:'y',і:'i',ї:'yi',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ь:'',ю:'yu',я:'ya',ы:'y',э:'e',ъ:'' };
const slug = (s) => String(s || '').toLowerCase().split('').map(c => TR[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'tovar';
const fmt = (n) => new Intl.NumberFormat('uk-UA').format(Number(n)) + ' грн';
const imgs = (p) => (Array.isArray(p.images) && p.images.length ? p.images : (p.img ? [p.img] : [])).filter(u => /^https?:\/\//.test(u));

async function load() {
  if (process.env.PRODUCTS_JSON) return JSON.parse(fs.readFileSync(process.env.PRODUCTS_JSON, 'utf8'));
  const r = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
  if (!r.ok) throw new Error('Supabase: ' + r.status + ' ' + await r.text());
  return r.json();
}

function page(p, url) {
  const im = imgs(p), cat = CATS[p.category] || '';
  const price = Number(p.price), old = Number(p.oldPrice) > price ? Number(p.oldPrice) : 0;
  const text = (p.desc || '').trim();
  const desc = (text ? text.replace(/\s+/g, ' ').slice(0, 150) : `${p.name}: ${fmt(price)}. Нова Пошта щодня, обмін 14 днів.`);
  const title = `${p.name}: купити в Україні | ELVÉN`.slice(0, 70);
  const sizes = (p.sizes && p.sizes.length ? p.sizes : []).map(s => `<span class="sz">${esc(s)}</span>`).join('');
  const ld = [{
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: desc, sku: p.sku || String(p.id), image: im, brand: { '@type': 'Brand', name: 'ELVÉN' },
    ...(cat ? { category: cat } : {}),
    offers: { '@type': 'Offer', url, priceCurrency: 'UAH', price: price.toFixed(2), availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition', seller: { '@type': 'Organization', name: 'ELVÉN' },
      hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', applicableCountry: 'UA', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: 14, returnMethod: 'https://schema.org/ReturnByMail' } }
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ELVÉN', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Каталог', item: SITE + '/#catalog' },
      { '@type': 'ListItem', position: 3, name: p.name, item: url }] }];
  return `<!doctype html>
<html lang="uk"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#09090b">
<meta property="og:type" content="product"><meta property="og:site_name" content="ELVÉN"><meta property="og:title" content="${esc(p.name)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">${im[0] ? `<meta property="og:image" content="${esc(im[0])}">` : ''}
<meta property="product:price:amount" content="${price.toFixed(2)}"><meta property="product:price:currency" content="UAH">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
*{box-sizing:border-box}body{margin:0;background:#09090b;color:#fff;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-weight:300;line-height:1.6}
a{color:inherit}header{display:flex;align-items:center;justify-content:space-between;padding:18px max(16px,4vw);border-bottom:1px solid #27272a}
.logo{font-weight:600;letter-spacing:.4em;text-decoration:none;text-transform:uppercase;font-size:14px}.nav a{font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#a1a1aa;text-decoration:none;margin-left:22px}
main{max-width:1100px;margin:0 auto;padding:28px max(16px,4vw) 60px;display:grid;gap:32px;grid-template-columns:1fr}
@media(min-width:860px){main{grid-template-columns:1.1fr 1fr;gap:56px}}
.crumbs{grid-column:1/-1;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#71717a}.crumbs a{text-decoration:none}
.gal img{width:100%;display:block;background:#18181b;margin-bottom:10px;aspect-ratio:3/4;object-fit:cover}
h1{font-weight:200;text-transform:uppercase;letter-spacing:.18em;font-size:clamp(1.5rem,4vw,2.4rem);line-height:1.2;margin:0 0 14px}
.price{font-size:1.5rem;font-weight:300}.old{color:#71717a;text-decoration:line-through;font-size:1rem;margin-left:12px}
.sizes{margin:20px 0}.sz{display:inline-block;border:1px solid #3f3f46;padding:8px 14px;margin:0 8px 8px 0;font-size:12px;letter-spacing:.1em}
.desc{color:#d4d4d8;font-size:14px;white-space:pre-line}.buy{display:block;text-align:center;background:#fff;color:#000;text-decoration:none;padding:18px;margin:26px 0 14px;font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase}
.info{border-top:1px solid #27272a;padding-top:16px;font-size:12px;color:#a1a1aa;display:grid;gap:6px}
footer{border-top:1px solid #27272a;padding:24px;text-align:center;font-size:11px;letter-spacing:.2em;color:#71717a;text-transform:uppercase}
</style></head><body>
<header><a class="logo" href="/">ELVÉN</a><nav class="nav"><a href="/#catalog">Каталог</a><a href="/#info">Доставка</a></nav></header>
<main>
<div class="crumbs"><a href="/">ELVÉN</a> / <a href="/#catalog">Каталог</a>${cat ? ' / ' + esc(cat) : ''}</div>
<div class="gal">${im.map((u, i) => `<img src="${esc(u)}" alt="${esc(p.name)}${i ? ' фото ' + (i + 1) : ''}" ${i ? 'loading="lazy"' : ''}>`).join('')}</div>
<div>
<h1>${esc(p.name)}</h1>
<div class="price">${fmt(price)}${old ? `<span class="old">${fmt(old)}</span>` : ''}</div>
${sizes ? `<div class="sizes">${sizes}</div>` : ''}
${text ? `<div class="desc">${esc(text)}</div>` : ''}
<a class="buy" href="/#p${p.id}">Замовити на сайті</a>
<div class="info"><span>Нова Пошта щодня</span><span>Обмін 14 днів</span><span>Огляд на пошті</span></div>
</div>
</main>
<footer>ELVÉN · <a href="https://www.instagram.com/elven_archive/">@elven_archive</a></footer>
</body></html>`;
}

const products = (await load()).filter(p => p && p.id != null && p.name && Number(p.price) > 0 && imgs(p).length);
fs.rmSync(path.join(OUT, 'p'), { recursive: true, force: true });
const urls = [];
const items = [];
for (const p of products) {
  const dir = `${slug(p.name)}-${p.id}`, url = `${SITE}/p/${dir}/`;
  fs.mkdirSync(path.join(OUT, 'p', dir), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'p', dir, 'index.html'), page(p, url));
  urls.push(url);
  const im = imgs(p), price = Number(p.price), old = Number(p.oldPrice) > price ? Number(p.oldPrice) : 0;
  const d = ((p.desc || '').trim() || `${p.name}. Нова Пошта щодня, обмін 14 днів.`).replace(/\s+/g, ' ').slice(0, 4900);
  items.push(`<item>
<g:id>${esc(p.id)}</g:id><g:title>${esc(p.name.slice(0, 150))}</g:title><g:description>${esc(d)}</g:description>
<g:link>${url}</g:link><g:image_link>${esc(im[0])}</g:image_link>${im.slice(1, 10).map(u => `<g:additional_image_link>${esc(u)}</g:additional_image_link>`).join('')}
<g:availability>in_stock</g:availability><g:condition>new</g:condition>
<g:price>${(old || price).toFixed(2)} UAH</g:price>${old ? `<g:sale_price>${price.toFixed(2)} UAH</g:sale_price>` : ''}
<g:brand>ELVÉN</g:brand><g:identifier_exists>no</g:identifier_exists>${p.sku ? `<g:mpn>${esc(p.sku)}</g:mpn>` : ''}
<g:google_product_category>1604</g:google_product_category>${CATS[p.category] ? `<g:product_type>${esc(CATS[p.category])}</g:product_type>` : ''}
<g:gender>unisex</g:gender><g:age_group>adult</g:age_group>
</item>`);
}
fs.writeFileSync(path.join(OUT, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>ELVÉN</title><link>${SITE}</link><description>Каталог ELVÉN</description>
${items.join('\n')}
</channel></rss>
`);
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
${urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>
`);
console.log(`Готово: ${products.length} товарів`);
