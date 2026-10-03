/* Rebuild the production D / Barbell pen assets: node scripts/generate-branding-assets.cjs
 * Requires sharp (dev dependency). Geometry is also consumed by IronJotMark.tsx.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const geometry = require('../assets/branding/ironjot.geometry.json');
const destination = path.resolve(__dirname, '../assets/branding');

function svg({ size = 1024, background = false, scale = 1, initialPose = false } = {}) {
  const color = value => geometry[value] || value;
  const layers = geometry.layers.map(layer => `<g id="${layer.id}"${initialPose ? ` transform="translate(${layer.from.x} ${layer.from.y}) rotate(${layer.from.rotation} 256 256)"` : ''}>${layer.paths.map(p =>
    `<path d="${p.d}" fill="${color(p.fill)}"${p.stroke ? ` stroke="${color(p.stroke)}" stroke-width="${p.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"` : ''}/>`
  ).join('')}</g>`).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${geometry.viewBox}">
<title>IronJot — Barbell pen</title>
${background ? `<path fill="${geometry.background}" d="M0 0H512V512H0Z"/>` : ''}
<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${layers}</g>
</svg>\n`;
}

async function main() {
  await fs.mkdir(destination, { recursive: true });
  const assets = [
    ['ironjot-mark', {}],
    ['icon', { background: true }],
    // Entire mark fits within Android's 66/108 diameter circular safe zone.
    ['adaptive-icon', { scale: 0.58 }],
    ['splash-icon', {}],
    ['splash-initial', { initialPose: true }],
    ['favicon', { size: 64, background: true }],
  ];
  for (const [name, options] of assets) {
    const source = svg(options);
    await fs.writeFile(path.join(destination, `${name}.svg`), source);
    const renderer = sharp(Buffer.from(source));
    if (options.background) renderer.removeAlpha();
    await renderer.png().toFile(path.join(destination, `${name}.png`));
  }
  for (const size of [48, 32]) {
    await sharp(Buffer.from(svg({ size, background: true }))).png()
      .toFile(path.join(destination, `preview-${size}.png`));
  }
  // Review sheet uses actual generated artwork, including Android's circular crop.
  const circular = await sharp(Buffer.from(svg({ size: 192, background: true, scale: 0.87 })))
    .composite([{ input: Buffer.from('<svg width="192" height="192"><circle cx="96" cy="96" r="96" fill="white"/></svg>'), blend: 'dest-in' }])
    .png().toBuffer();
  await sharp({ create: { width: 768, height: 512, channels: 4, background: '#D8D6D0' } })
    .composite([
      { input: await sharp(Buffer.from(svg({ size: 480, background: true }))).png().toBuffer(), left: 16, top: 16 },
      { input: circular, left: 528, top: 24 },
      { input: await sharp(Buffer.from(svg({ size: 96, background: true }))).png().toBuffer(), left: 528, top: 264 },
      { input: path.join(destination, 'preview-48.png'), left: 644, top: 264 },
      { input: path.join(destination, 'preview-32.png'), left: 712, top: 264 },
    ]).png().toFile(path.join(destination, 'asset-review.png'));
  const { data, info } = await sharp(path.join(destination, 'adaptive-icon.png')).raw().toBuffer({ resolveWithObject: true });
  const safeRadius = info.width * 33 / 108;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha > 0 && Math.hypot(x + 0.5 - info.width / 2, y + 0.5 - info.height / 2) > safeRadius) {
        throw new Error(`Adaptive artwork outside circular safe zone at (${x}, ${y})`);
      }
    }
  }
  console.log('Generated IronJot SVG/PNG assets; adaptive foreground is inside the 66/108 circular safe zone.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
