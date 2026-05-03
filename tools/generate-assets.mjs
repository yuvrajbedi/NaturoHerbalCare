import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const imageDir = join(root, "assets", "img");
mkdirSync(imageDir, { recursive: true });

const palette = {
  leaf: [40, 95, 67],
  leafDeep: [31, 69, 51],
  leafSoft: [127, 155, 89],
  earth: [118, 84, 55],
  clay: [173, 112, 72],
  gold: [200, 155, 72],
  cream: [251, 246, 235],
  sand: [234, 220, 188],
  paper: [255, 253, 247],
  ink: [30, 40, 31],
  red: [177, 75, 65],
};

const rgba = (rgb, alpha = 1) => [rgb[0], rgb[1], rgb[2], alpha];
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => [
  Math.round(lerp(a[0], b[0], t)),
  Math.round(lerp(a[1], b[1], t)),
  Math.round(lerp(a[2], b[2], t)),
];

class Raster {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }

  fillGradient(top, bottom, side = null) {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const vertical = y / Math.max(1, this.height - 1);
        const horizontal = x / Math.max(1, this.width - 1);
        const base = mix(top, bottom, vertical);
        const color = side ? mix(base, side, horizontal * 0.3) : base;
        this.pixel(x, y, [color[0], color[1], color[2], 1]);
      }
    }
  }

  pixel(x, y, color) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const idx = (Math.floor(y) * this.width + Math.floor(x)) * 4;
    const alpha = Math.max(0, Math.min(1, color[3]));
    const inv = 1 - alpha;
    this.data[idx] = Math.round(color[0] * alpha + this.data[idx] * inv);
    this.data[idx + 1] = Math.round(color[1] * alpha + this.data[idx + 1] * inv);
    this.data[idx + 2] = Math.round(color[2] * alpha + this.data[idx + 2] * inv);
    this.data[idx + 3] = 255;
  }

  noise(count, color, alpha = 0.1, seed = 19) {
    let value = seed;
    const rand = () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967295;
    };
    for (let i = 0; i < count; i += 1) {
      const x = Math.floor(rand() * this.width);
      const y = Math.floor(rand() * this.height);
      const radius = 1 + rand() * 2.2;
      this.ellipse(x, y, radius, radius, 0, rgba(color, alpha * (0.45 + rand() * 0.55)));
    }
  }

  rect(x, y, width, height, color) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + width));
    const y1 = Math.min(this.height, Math.ceil(y + height));
    for (let py = y0; py < y1; py += 1) {
      for (let px = x0; px < x1; px += 1) {
        this.pixel(px, py, color);
      }
    }
  }

  roundedRect(x, y, width, height, radius, color) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + width));
    const y1 = Math.min(this.height, Math.ceil(y + height));
    for (let py = y0; py < y1; py += 1) {
      for (let px = x0; px < x1; px += 1) {
        const dx = px < x + radius ? x + radius - px : px > x + width - radius ? px - (x + width - radius) : 0;
        const dy = py < y + radius ? y + radius - py : py > y + height - radius ? py - (y + height - radius) : 0;
        if (dx * dx + dy * dy <= radius * radius) this.pixel(px, py, color);
      }
    }
  }

  ellipse(cx, cy, rx, ry, angle, color) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const reach = Math.max(rx, ry) + 2;
    const x0 = Math.max(0, Math.floor(cx - reach));
    const y0 = Math.max(0, Math.floor(cy - reach));
    const x1 = Math.min(this.width, Math.ceil(cx + reach));
    const y1 = Math.min(this.height, Math.ceil(cy + reach));
    for (let py = y0; py < y1; py += 1) {
      for (let px = x0; px < x1; px += 1) {
        const dx = px - cx;
        const dy = py - cy;
        const xr = cos * dx + sin * dy;
        const yr = -sin * dx + cos * dy;
        const d = (xr * xr) / (rx * rx) + (yr * yr) / (ry * ry);
        if (d <= 1.04) {
          const edge = d > 0.96 ? (1.04 - d) / 0.08 : 1;
          this.pixel(px, py, [color[0], color[1], color[2], color[3] * edge]);
        }
      }
    }
  }

  line(x1, y1, x2, y2, width, color) {
    const half = width / 2;
    const minX = Math.max(0, Math.floor(Math.min(x1, x2) - half - 2));
    const maxX = Math.min(this.width, Math.ceil(Math.max(x1, x2) + half + 2));
    const minY = Math.max(0, Math.floor(Math.min(y1, y2) - half - 2));
    const maxY = Math.min(this.height, Math.ceil(Math.max(y1, y2) + half + 2));
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy || 1;
    for (let y = minY; y < maxY; y += 1) {
      for (let x = minX; x < maxX; x += 1) {
        const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lenSq));
        const px = x1 + t * dx;
        const py = y1 + t * dy;
        const dist = Math.hypot(x - px, y - py);
        if (dist <= half + 1) {
          const edge = dist > half ? half + 1 - dist : 1;
          this.pixel(x, y, [color[0], color[1], color[2], color[3] * edge]);
        }
      }
    }
  }

  landscape(baseY, amplitude, color, phase = 0) {
    for (let x = 0; x < this.width; x += 1) {
      const yStart =
        baseY +
        Math.sin((x / this.width) * Math.PI * 2 + phase) * amplitude +
        Math.sin((x / this.width) * Math.PI * 5 + phase * 0.4) * amplitude * 0.38;
      for (let y = Math.max(0, Math.floor(yStart)); y < this.height; y += 1) {
        this.pixel(x, y, color);
      }
    }
  }
}

function drawLeaf(canvas, x, y, length, width, angle, color, veinColor = rgba(palette.sand, 0.65)) {
  canvas.ellipse(x, y, length * 0.5, width * 0.5, angle, color);
  const dx = Math.cos(angle) * length * 0.42;
  const dy = Math.sin(angle) * length * 0.42;
  canvas.line(x - dx * 0.72, y - dy * 0.72, x + dx, y + dy, Math.max(2, width * 0.06), veinColor);
}

function drawBottle(canvas, x, y, scale, kind = "shampoo") {
  const isOil = kind === "oil";
  const body = isOil ? rgba(palette.leafDeep, 1) : rgba(palette.paper, 1);
  const shoulder = isOil ? rgba([44, 76, 57], 1) : rgba([248, 241, 226], 1);
  const label = isOil ? rgba([248, 224, 172], 1) : rgba([244, 224, 183], 1);
  const accent = isOil ? rgba(palette.leafSoft, 1) : rgba(palette.leaf, 1);
  const w = 150 * scale;
  const h = 430 * scale;
  const capW = 74 * scale;
  const capH = 56 * scale;
  const neckW = 54 * scale;
  const neckH = 70 * scale;

  canvas.ellipse(x + w * 0.5, y + h + 46 * scale, w * 0.72, 26 * scale, 0, rgba([65, 50, 30], 0.16));
  canvas.roundedRect(x + (w - neckW) / 2, y + 26 * scale, neckW, neckH, 12 * scale, rgba(isOil ? palette.leafDeep : palette.earth, 1));
  canvas.roundedRect(x + (w - capW) / 2, y, capW, capH, 9 * scale, rgba(isOil ? palette.earth : palette.leafDeep, 1));
  canvas.rect(x + (w - capW) / 2, y, capW, 9 * scale, rgba(palette.gold, 0.8));
  canvas.roundedRect(x, y + 82 * scale, w, h, 42 * scale, body);
  canvas.roundedRect(x + 13 * scale, y + 130 * scale, w - 26 * scale, h * 0.75, 30 * scale, shoulder);
  canvas.roundedRect(x + 20 * scale, y + 180 * scale, w - 40 * scale, h * 0.52, 15 * scale, label);
  canvas.rect(x + 20 * scale, y + 180 * scale, w - 40 * scale, 74 * scale, accent);
  canvas.ellipse(x + w * 0.5, y + 338 * scale, 28 * scale, 18 * scale, -0.45, rgba(palette.leaf, 0.95));
  canvas.ellipse(x + w * 0.5 + 20 * scale, y + 334 * scale, 24 * scale, 14 * scale, 0.45, rgba(palette.leafSoft, 0.95));
  canvas.line(x + w * 0.5 - 32 * scale, y + 370 * scale, x + w * 0.5 + 36 * scale, y + 370 * scale, 5 * scale, rgba(palette.earth, 0.55));
  canvas.line(x + w * 0.5 - 24 * scale, y + 394 * scale, x + w * 0.5 + 24 * scale, y + 394 * scale, 5 * scale, rgba(palette.earth, 0.42));
}

function buildHero() {
  const canvas = new Raster(1600, 1000);
  canvas.fillGradient(palette.cream, [220, 198, 151], [246, 226, 181]);
  canvas.noise(2600, palette.earth, 0.06, 28);
  canvas.ellipse(1280, 330, 410, 290, 0, rgba([255, 246, 210], 0.42));
  canvas.landscape(710, 55, rgba([203, 178, 124], 0.3), 0.3);
  canvas.landscape(820, 45, rgba(palette.leafDeep, 0.12), 1.2);

  canvas.line(1110, 300, 1370, 660, 9, rgba(palette.earth, 0.46));
  drawLeaf(canvas, 1135, 280, 170, 54, -0.65, rgba(palette.leaf, 0.85));
  drawLeaf(canvas, 1195, 385, 145, 46, 0.15, rgba(palette.leafSoft, 0.84));
  drawLeaf(canvas, 1275, 505, 124, 40, 0.55, rgba(palette.leaf, 0.74));
  drawLeaf(canvas, 1378, 148, 120, 38, 0.55, rgba(palette.leafSoft, 0.7));
  drawLeaf(canvas, 1235, 790, 148, 46, -2.2, rgba(palette.leaf, 0.55));

  drawBottle(canvas, 1162, 246, 1.18, "shampoo");
  drawBottle(canvas, 1340, 178, 1.06, "oil");
  canvas.ellipse(1308, 470, 22, 22, 0, rgba(palette.red, 0.78));
  canvas.ellipse(1362, 510, 18, 18, 0, rgba(palette.gold, 0.82));
  canvas.ellipse(1256, 545, 14, 14, 0, rgba(palette.red, 0.65));
  return canvas;
}

function buildProduct(kind) {
  const canvas = new Raster(1000, 1000);
  const side = kind === "oil" ? [218, 188, 123] : [235, 220, 183];
  canvas.fillGradient([250, 244, 232], side, [238, 214, 169]);
  canvas.noise(1500, palette.earth, 0.05, kind === "oil" ? 77 : 52);
  canvas.ellipse(500, 420, 360, 300, 0, rgba([255, 246, 218], 0.64));
  canvas.line(145, 760, 865, 552, 16, rgba(palette.leafSoft, 0.24));
  drawLeaf(canvas, 205, 220, 145, 54, -2.2, rgba(palette.leaf, 0.82));
  drawLeaf(canvas, 798, 215, 128, 48, -0.85, rgba(palette.leafSoft, 0.78));
  drawLeaf(canvas, 786, 806, 120, 42, -2.32, rgba(kind === "oil" ? palette.leaf : palette.clay, 0.72));
  canvas.ellipse(206, 792, 38, 38, 0, rgba(palette.red, 0.76));
  canvas.ellipse(840, 776, 35, 35, 0, rgba(palette.gold, 0.72));
  drawBottle(canvas, kind === "oil" ? 390 : 370, 110, kind === "oil" ? 1.55 : 1.72, kind);
  return canvas;
}

function buildIngredients() {
  const canvas = new Raster(1200, 800);
  canvas.fillGradient([251, 246, 235], [229, 205, 158], [247, 232, 192]);
  canvas.noise(2000, palette.earth, 0.055, 91);
  canvas.line(180, 210, 440, 420, 12, rgba(palette.earth, 0.42));
  canvas.line(1010, 152, 760, 385, 11, rgba(palette.earth, 0.38));
  drawLeaf(canvas, 176, 140, 168, 58, -2.25, rgba(palette.leaf, 0.82));
  drawLeaf(canvas, 1010, 142, 150, 52, -0.45, rgba(palette.leafSoft, 0.8));
  drawLeaf(canvas, 925, 618, 130, 48, -2.2, rgba(palette.leaf, 0.75));
  drawLeaf(canvas, 1050, 520, 124, 42, -2.35, rgba(palette.clay, 0.58));

  canvas.ellipse(565, 410, 216, 148, 0, rgba(palette.earth, 0.9));
  canvas.ellipse(565, 378, 205, 130, 0, rgba([207, 169, 114], 1));
  canvas.ellipse(565, 358, 140, 82, 0, rgba([239, 224, 183], 1));
  canvas.ellipse(520, 340, 42, 42, 0, rgba(palette.leafSoft, 0.95));
  canvas.ellipse(590, 330, 34, 34, 0, rgba(palette.red, 0.88));
  canvas.ellipse(632, 386, 38, 38, 0, rgba(palette.gold, 0.9));
  drawLeaf(canvas, 506, 390, 128, 50, 0.28, rgba(palette.leaf, 0.8));
  canvas.ellipse(198, 596, 54, 54, 0, rgba(palette.red, 0.72));
  canvas.ellipse(265, 646, 34, 34, 0, rgba(palette.gold, 0.78));
  return canvas;
}

function crcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

const table = crcTable();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePng(path, canvas) {
  const stride = canvas.width * 4 + 1;
  const raw = Buffer.alloc(stride * canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    raw[y * stride] = 0;
    const rowStart = y * canvas.width * 4;
    for (let x = 0; x < canvas.width * 4; x += 1) {
      raw[y * stride + 1 + x] = canvas.data[rowStart + x];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(canvas.width, 0);
  ihdr.writeUInt32BE(canvas.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND"),
  ]);
  writeFileSync(path, png);
}

writePng(join(imageDir, "hero-botanical.png"), buildHero());
writePng(join(imageDir, "shampoo-pack.png"), buildProduct("shampoo"));
writePng(join(imageDir, "hair-oil-pack.png"), buildProduct("oil"));
writePng(join(imageDir, "ingredients-flatlay.png"), buildIngredients());

writeFileSync(
  join(imageDir, "favicon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#285f43"/><path d="M17 39C24 20 39 13 51 15C48 31 38 42 17 39Z" fill="#eadcbc"/><path d="M19 40C28 33 37 26 49 17" fill="none" stroke="#fffdf7" stroke-width="4" stroke-linecap="round"/><path d="M18 45C27 42 35 41 46 45" fill="none" stroke="#ad7048" stroke-width="4" stroke-linecap="round"/></svg>`,
);

console.log("Generated local storefront artwork in assets/img");
