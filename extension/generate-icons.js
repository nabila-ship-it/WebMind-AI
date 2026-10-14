import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const checkBuf = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const check = crc32(checkBuf);
  buf.writeUInt32BE(check, 8 + len);
  return buf;
}

function generateIconPNG(size) {
  // RGBA buffer: each scanline has 1 filter byte (0) + size * 4 bytes
  const rowBytes = 1 + size * 4;
  const rawData = Buffer.alloc(rowBytes * size);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Gradient from Indigo (#6366f1) to Cyan (#06b6d4)
        const t = (x + y) / (size * 2);
        const r = Math.round(99 * (1 - t) + 6 * t);
        const g = Math.round(102 * (1 - t) + 182 * t);
        const b = Math.round(241 * (1 - t) + 212 * t);

        // Subtle brain / sparkle center highlight
        const innerDist = Math.hypot(dx, dy);
        let alpha = 255;
        if (dist > radius - 1) {
          alpha = Math.round(255 * (radius - dist));
        }

        // Draw an inner stylized dot/symbol for high contrast
        if (innerDist < size * 0.18) {
          rawData[pxOffset] = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = alpha;
        } else {
          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
          rawData[pxOffset + 3] = alpha;
        }
      } else {
        // Transparent outside circle
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT chunk
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = 'public/icons';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const png = generateIconPNG(size);
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png (${png.length} bytes)`);
});
