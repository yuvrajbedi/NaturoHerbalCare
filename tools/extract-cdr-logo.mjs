import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const source = "cdr-extract/metadata/thumbnails/thumbnail.bmp";
const target = "assets/img/naturo-logo.png";

const input = readFileSync(source);

if (input.toString("ascii", 0, 2) !== "BM") {
  throw new Error("Expected a BMP file exported from the CDR package.");
}

const offset = input.readUInt32LE(10);
const width = input.readInt32LE(18);
const rawHeight = input.readInt32LE(22);
const height = Math.abs(rawHeight);
const topDown = rawHeight < 0;
const bitsPerPixel = input.readUInt16LE(28);

if (bitsPerPixel !== 24) {
  throw new Error(`Expected a 24-bit BMP, received ${bitsPerPixel}-bit.`);
}

const rowStride = Math.ceil((width * 3) / 4) * 4;
const rgba = new Uint8Array(width * height * 4);

let minX = width;
let minY = height;
let maxX = 0;
let maxY = 0;

for (let y = 0; y < height; y += 1) {
  const sourceY = topDown ? y : height - 1 - y;
  for (let x = 0; x < width; x += 1) {
    const src = offset + sourceY * rowStride + x * 3;
    const b = input[src];
    const g = input[src + 1];
    const r = input[src + 2];
    const dst = (y * width + x) * 4;
    const whiteness = Math.min(r, g, b);
    const colorDistance = Math.max(255 - r, 255 - g, 255 - b);
    const alpha = colorDistance < 10 && whiteness > 238 ? 0 : Math.min(255, Math.max(0, colorDistance * 3));

    rgba[dst] = r;
    rgba[dst + 1] = g;
    rgba[dst + 2] = b;
    rgba[dst + 3] = alpha;

    if (alpha > 12) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
}

const pad = 10;
minX = Math.max(0, minX - pad);
minY = Math.max(0, minY - pad);
maxX = Math.min(width - 1, maxX + pad);
maxY = Math.min(height - 1, maxY + pad);

const croppedWidth = maxX - minX + 1;
const croppedHeight = maxY - minY + 1;
const scale = 3;
const outWidth = croppedWidth * scale;
const outHeight = croppedHeight * scale;
const cropped = new Uint8Array(outWidth * outHeight * 4);

for (let y = 0; y < outHeight; y += 1) {
  for (let x = 0; x < outWidth; x += 1) {
    const srcX = minX + x / scale;
    const srcY = minY + y / scale;
    const left = Math.floor(srcX);
    const top = Math.floor(srcY);
    const right = Math.min(width - 1, left + 1);
    const bottom = Math.min(height - 1, top + 1);
    const tx = srcX - left;
    const ty = srcY - top;
    const topLeft = (top * width + left) * 4;
    const topRight = (top * width + right) * 4;
    const bottomLeft = (bottom * width + left) * 4;
    const bottomRight = (bottom * width + right) * 4;
    const dst = (y * outWidth + x) * 4;

    for (let channel = 0; channel < 4; channel += 1) {
      const topMix = rgba[topLeft + channel] * (1 - tx) + rgba[topRight + channel] * tx;
      const bottomMix = rgba[bottomLeft + channel] * (1 - tx) + rgba[bottomRight + channel] * tx;
      cropped[dst + channel] = Math.round(topMix * (1 - ty) + bottomMix * ty);
    }
  }
}

function crcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
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

function writePng(path, width, height, data) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0;
    for (let x = 0; x < width * 4; x += 1) raw[y * stride + 1 + x] = data[y * width * 4 + x];
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw, { level: 9 })),
      chunk("IEND"),
    ]),
  );
}

writePng(join(process.cwd(), target), outWidth, outHeight, cropped);
console.log(`Extracted transparent logo to ${target} (${outWidth}x${outHeight})`);
