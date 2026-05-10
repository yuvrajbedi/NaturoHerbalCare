import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "assets", "img", "naturo-logo.png");
const output = join(root, "assets", "img", "favicon.png");
const workDir = mkdtempSync(join(tmpdir(), "naturo-favicon-"));
const paper = [255, 253, 247];

function paethPredictor(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  return upDistance <= upperLeftDistance ? up : upperLeft;
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
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function readPng(path) {
  const buffer = readFileSync(path);
  const chunks = [];
  let offset = 8;

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    chunks.push([type, buffer.subarray(offset + 8, offset + 8 + length)]);
    offset += 12 + length;
    if (type === "IEND") break;
  }

  const header = chunks.find(([type]) => type === "IHDR")?.[1];
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const colorType = header[9];

  if (header[8] !== 8 || colorType !== 6 || header[12] !== 0) {
    throw new Error("Expected an 8-bit non-interlaced RGBA PNG.");
  }

  const raw = inflateSync(Buffer.concat(chunks.filter(([type]) => type === "IDAT").map(([, data]) => data)));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const data = Buffer.alloc(width * height * bytesPerPixel);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceOffset];
    sourceOffset += 1;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? data[y * stride + x - bytesPerPixel] : 0;
      const up = y > 0 ? data[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel ? data[(y - 1) * stride + x - bytesPerPixel] : 0;
      let value = raw[sourceOffset];
      sourceOffset += 1;

      if (filter === 1) value = (value + left) & 0xff;
      else if (filter === 2) value = (value + up) & 0xff;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) value = (value + paethPredictor(left, up, upperLeft)) & 0xff;

      data[y * stride + x] = value;
    }
  }

  return { width, height, data };
}

function writePng(path, image) {
  const stride = image.width * 4 + 1;
  const raw = Buffer.alloc(stride * image.height);

  for (let y = 0; y < image.height; y += 1) {
    raw[y * stride] = 0;
    image.data.copy(raw, y * stride + 1, y * image.width * 4, (y + 1) * image.width * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8;
  header[9] = 6;

  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(raw, { level: 9 })),
      chunk("IEND"),
    ]),
  );
}

function colorDistanceFromPaper(data, offset) {
  return Math.hypot(data[offset] - paper[0], data[offset + 1] - paper[1], data[offset + 2] - paper[2]);
}

function bolderColor(data, offset) {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];

  if (green > red && green >= blue) {
    return [Math.max(0, red * 0.72), Math.max(0, green * 0.88), Math.max(0, blue * 0.78)];
  }

  if (red > 165 && green > 70 && green < 190) {
    return [Math.min(255, red * 1.02), Math.max(0, green * 0.86), Math.max(0, blue * 0.82)];
  }

  return [red, green, blue];
}

function blendPixel(data, offset, color, alpha) {
  data[offset] = Math.round(color[0] * alpha + data[offset] * (1 - alpha));
  data[offset + 1] = Math.round(color[1] * alpha + data[offset + 1] * (1 - alpha));
  data[offset + 2] = Math.round(color[2] * alpha + data[offset + 2] * (1 - alpha));
  data[offset + 3] = 255;
}

function boldenLogoMark(path) {
  const image = readPng(path);
  const original = Buffer.from(image.data);
  const expanded = Buffer.from(image.data);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      if (colorDistanceFromPaper(original, offset) < 54) continue;

      const color = bolderColor(original, offset);
      blendPixel(expanded, offset, color, 0.46);

      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const distance = Math.hypot(dx, dy);
          if (distance === 0 || distance > 2.1) continue;

          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= image.width || ny >= image.height) continue;

          const target = (ny * image.width + nx) * 4;
          const alpha = distance <= 1 ? 0.48 : 0.2;
          blendPixel(expanded, target, color, alpha);
        }
      }
    }
  }

  image.data = expanded;
  writePng(path, image);
}

try {
  const crop = join(workDir, "favicon-crop.png");
  const resized = join(workDir, "favicon-resized.png");

  execFileSync("sips", ["-c", "180", "138", "--cropOffset", "24", "0", source, "--out", crop]);
  execFileSync("sips", ["-Z", "230", crop, "--out", resized]);
  execFileSync("sips", ["-p", "256", "256", "--padColor", "FFFDF7", resized, "--out", output]);
  boldenLogoMark(output);

  console.log("Generated assets/img/favicon.png from assets/img/naturo-logo.png");
} catch (error) {
  if (error.code === "ENOENT") {
    throw new Error("The favicon generator needs macOS sips to crop the Naturo logo mark.");
  }
  throw error;
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
