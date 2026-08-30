import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function rgbaPNG(width, height, paint) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = paint(x, y, width, height);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function paintIcon(x, y, size, { maskable }) {
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const pad = maskable ? size * 0.18 : size * 0.08;
  const bg = size / 2 - pad;
  const dx = x - cx;
  const dy = y - cy;
  const inBg = dx * dx + dy * dy <= bg * bg;

  if (!inBg) {
    return maskable ? [17, 20, 12, 255] : [0, 0, 0, 0];
  }

  const lime = [214, 255, 62, 255];
  const ink = [17, 20, 12, 255];

  const barH = size * 0.07;
  const barW = size * (maskable ? 0.42 : 0.52);
  const collR = size * 0.11;
  const plateR = size * 0.16;
  const collX = barW * 0.72;

  const inBar = Math.abs(dy) <= barH && Math.abs(dx) <= barW;
  const inLeftPlate = (dx + collX) ** 2 / (plateR * 0.45) ** 2 + dy * dy / plateR ** 2 <= 1;
  const inRightPlate = (dx - collX) ** 2 / (plateR * 0.45) ** 2 + dy * dy / plateR ** 2 <= 1;
  const inLeftColl = (dx + collX) ** 2 + dy * dy <= collR * collR;
  const inRightColl = (dx - collX) ** 2 + dy * dy <= collR * collR;

  if (inBar || inLeftPlate || inRightPlate || inLeftColl || inRightColl) {
    return ink;
  }
  return lime;
}

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "public", "icons");
mkdirSync(out, { recursive: true });

writeFileSync(join(out, "icon-192.png"), rgbaPNG(192, 192, (x, y, w, h) => paintIcon(x, y, w, { maskable: false })));
writeFileSync(join(out, "icon-512.png"), rgbaPNG(512, 512, (x, y, w, h) => paintIcon(x, y, w, { maskable: false })));
writeFileSync(join(out, "maskable-512.png"), rgbaPNG(512, 512, (x, y, w, h) => paintIcon(x, y, w, { maskable: true })));

console.log("wrote icons to", out);
