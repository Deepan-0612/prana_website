/*
 * Regenerates the logo assets from assets/logo/Prana_Logo_with_Name.pdf
 *   assets/logo/mark.png        lotus mark, transparent, exact colours (for light backgrounds)
 *   assets/logo/mark-dark.png   lotus mark keyed for dark backgrounds (keeps the pale highlights)
 *   assets/logo/wordmark.svg    the "Prana" lettering as vector, brand lavender
 *   assets/logo/wordmark-sprite.txt   <symbol> + glyph defs to paste inline in index.html
 *
 * Needs: poppler (pdfimages, pdftocairo), rsvg-convert, and the `sharp` module.
 * Run:   NODE_PATH=/path/to/node_modules node tools/extract-logo.cjs
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'logo');
const PDF = path.join(OUT, 'Prana_Logo_with_Name.pdf');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'prana-logo-'));
const BRAND = '#C687E3';

(async () => {
  /* ---------- 1. the mark (raster) ---------- */
  execFileSync('pdfimages', ['-png', PDF, path.join(TMP, 'img')]);
  const svgPath = path.join(TMP, 'page.svg');
  execFileSync('pdftocairo', ['-svg', PDF, svgPath]);
  const svg = fs.readFileSync(svgPath, 'utf8');

  // The PDF places the raster with a clip box that cuts off the small sans-serif "Prana" baked into the
  // bottom of the bitmap. Honour the same clip so only the lotus survives.
  const place = svg.match(/<use xlink:href="#source-6" transform="matrix\(([\d.]+), 0, 0, ([\d.]+), ([\d.]+), ([\d.]+)\)"/);
  const clipD = svg.match(/<clipPath id="clip-2">\s*<path[^>]* d="([^"]+)"/);
  if (!place || !clipD) throw new Error('Could not find image placement / clip in PDF');
  const ys = [...clipD[1].matchAll(/[ML] ([\d.]+) ([\d.]+)/g)].map((m) => parseFloat(m[2]));
  const clipBottomPx = Math.floor((Math.max(...ys) - parseFloat(place[4])) / parseFloat(place[2]));
  const src = path.join(TMP, 'img-000.png');
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;

  // bounding box of everything that is not pure white
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  const rows = Math.min(H, clipBottomPx);
  for (let y = 0; y < rows; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  const PAD = 6;
  x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD); x1 = Math.min(W - 1, x1 + PAD); y1 = Math.min(rows - 1, y1 + PAD);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;

  // (a) "colour to alpha" from white: mathematically exact over ANY light background
  const light = Buffer.alloc(cw * ch * 4);
  // (b) hard-ish key: pale highlights stay opaque so the mark still glows on a DARK background
  const dark = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const si = ((y + y0) * W + (x + x0)) * 3, di = (y * cw + x) * 4;
    const r = data[si], g = data[si + 1], b = data[si + 2];
    const deficit = Math.max(255 - r, 255 - g, 255 - b);   // how far from white (0–255)
    const a = deficit / 255;
    if (a < 0.004) { light[di + 3] = 0; }
    else {
      light[di] = Math.round(255 - (255 - r) / a);
      light[di + 1] = Math.round(255 - (255 - g) / a);
      light[di + 2] = Math.round(255 - (255 - b) / a);
      light[di + 3] = Math.round(a * 255);
    }
    const k = Math.min(1, Math.max(0, (deficit - 7) / 30));  // 0 below 7, 1 above 37
    dark[di] = r; dark[di + 1] = g; dark[di + 2] = b; dark[di + 3] = Math.round(k * k * (3 - 2 * k) * 255);
  }
  await sharp(light, { raw: { width: cw, height: ch, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'mark.png'));
  await sharp(dark, { raw: { width: cw, height: ch, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'mark-dark.png'));
  console.log('mark', cw + 'x' + ch, 'aspect', (cw / ch).toFixed(4));

  /* ---------- 2. the wordmark (vector glyphs) ---------- */
  const glyphs = [...svg.matchAll(/<g id="(glyph-\d+-\d+)">\s*(<path d="[^"]+"\s*\/>)\s*<\/g>/g)].map((m) => ({ id: m[1], path: m[2] }));
  const uses = [...svg.matchAll(/<g fill="rgb\([^"]+\)" fill-opacity="1">\s*<use xlink:href="#(glyph-0-\d+)" x="([\d.]+)" y="([\d.]+)"\s*\/>/g)].map((m) => ({ id: m[1], x: m[2], y: m[3] }));
  const dot = svg.match(/<use xlink:href="#source-9" transform="matrix\(1, 0, 0, 1, ([\d.]+), ([\d.]+)\)"\/>/);
  const dotUse = svg.match(/<g id="source-9"[^>]*>\s*<g[^>]*>\s*<use xlink:href="#(glyph-1-0)" x="([\d.]+)" y="([\d.]+)"/);
  if (glyphs.length < 6 || uses.length !== 5 || !dot || !dotUse) throw new Error('Unexpected PDF structure: glyphs=' + glyphs.length + ' uses=' + uses.length);

  const defs = glyphs.map((g) => `<g id="${g.id}">${g.path}</g>`).join('');
  const body = (fill) =>
    `<g fill="${fill}">` +
    uses.map((u) => `<use href="#${u.id}" x="${u.x}" y="${u.y}"/>`).join('') +
    `<g transform="translate(${dot[1]} ${dot[2]})" clip-path="url(#pw-dotclip)"><use href="#${dotUse[1]}" x="${dotUse[2]}" y="${dotUse[3]}"/></g></g>`;
  const clip = `<clipPath id="pw-dotclip"><rect x="0" y="0" width="24" height="112"/></clipPath>`;

  // pass 1: render with a generous box, measure the real ink bounds
  const probeBox = { x: 160, y: 515, w: 280, h: 150 }, SCALE = 8;
  const probe = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${probeBox.x} ${probeBox.y} ${probeBox.w} ${probeBox.h}" width="${probeBox.w * SCALE}" height="${probeBox.h * SCALE}"><defs>${defs}${clip}</defs>${body(BRAND)}</svg>`;
  fs.writeFileSync(path.join(TMP, 'probe.svg'), probe);
  execFileSync('rsvg-convert', ['-o', path.join(TMP, 'probe.png'), path.join(TMP, 'probe.svg')]);
  const pr = await sharp(path.join(TMP, 'probe.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let a0 = pr.info.width, b0 = pr.info.height, a1 = 0, b1 = 0;
  for (let y = 0; y < pr.info.height; y++) for (let x = 0; x < pr.info.width; x++) {
    if (pr.data[(y * pr.info.width + x) * 4 + 3] > 8) { a0 = Math.min(a0, x); a1 = Math.max(a1, x); b0 = Math.min(b0, y); b1 = Math.max(b1, y); }
  }
  const pad = 1.5;
  const vb = { x: probeBox.x + a0 / SCALE - pad, y: probeBox.y + b0 / SCALE - pad, w: (a1 - a0 + 1) / SCALE + pad * 2, h: (b1 - b0 + 1) / SCALE + pad * 2 };
  const vbStr = [vb.x, vb.y, vb.w, vb.h].map((n) => n.toFixed(2)).join(' ');
  console.log('wordmark viewBox', vbStr, 'aspect', (vb.w / vb.h).toFixed(4));

  fs.writeFileSync(path.join(OUT, 'wordmark.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbStr}" role="img" aria-label="Prana"><defs>${defs}${clip}</defs>${body(BRAND)}</svg>\n`);
  fs.writeFileSync(path.join(OUT, 'wordmark-sprite.txt'),
    `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${defs}${clip}<symbol id="prana-wordmark" viewBox="${vbStr}">${body('currentColor')}</symbol></defs></svg>\n` +
    `<!-- viewBox ${vbStr}  aspect ${(vb.w / vb.h).toFixed(4)} -->\n`);
  fs.rmSync(TMP, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
