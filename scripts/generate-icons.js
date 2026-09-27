const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table for PNG chunk checksums
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([len, typeAndData, crc]);
}

// 5x7 Dot matrix font for rendering "LIFEKINA" text cleanly onto raw PNG buffers
const FONT_5X7 = {
  'L': [
    '10000',
    '10000',
    '10000',
    '10000',
    '10000',
    '10000',
    '11111',
  ],
  'I': [
    '11111',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
    '11111',
  ],
  'F': [
    '11111',
    '10000',
    '10000',
    '11110',
    '10000',
    '10000',
    '10000',
  ],
  'E': [
    '11111',
    '10000',
    '10000',
    '11110',
    '10000',
    '10000',
    '11111',
  ],
  'K': [
    '10001',
    '10010',
    '10100',
    '11000',
    '10100',
    '10010',
    '10001',
  ],
  'N': [
    '10001',
    '11001',
    '10101',
    '10011',
    '10001',
    '10001',
    '10001',
  ],
  'A': [
    '01110',
    '10001',
    '10001',
    '11111',
    '10001',
    '10001',
    '10001',
  ],
  ' ': [
    '00000',
    '00000',
    '00000',
    '00000',
    '00000',
    '00000',
    '00000',
  ]
};

function createIconPng(size, isMaskable = false) {
  const width = size;
  const height = size;
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowBytes);

  const radius = isMaskable ? 0 : size * 0.22;
  const cx = width / 2;
  const cy = height / 2;

  // Render Background & Sparkles Emblem
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      let alpha = 1.0;
      if (!isMaskable) {
        const dx = Math.max(0, Math.abs(x - cx) - (cx - radius));
        const dy = Math.max(0, Math.abs(y - cy) - (cy - radius));
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > radius) {
          rawData[pixelOffset] = 0;
          rawData[pixelOffset + 1] = 0;
          rawData[pixelOffset + 2] = 0;
          rawData[pixelOffset + 3] = 0;
          continue;
        }
        alpha = Math.min(1, Math.max(0, radius - dist + 1));
      }

      // Emerald green gradient (#059669 -> #047857)
      const gradT = (x * 0.4 + y * 0.6) / (width * 0.4 + height * 0.6);
      let r = Math.round(5 + (4 - 5) * gradT);
      let g = Math.round(150 + (120 - 150) * gradT);
      let b = Math.round(105 + (87 - 105) * gradT);

      // Sparkles Center Position
      const emblemCenterY = size * 0.38;
      const sx = Math.abs(x - cx);
      const sy = Math.abs(y - emblemCenterY);
      const sScale = size * 0.18;

      // 4-point star curve: (sx/sScale)^0.5 + (sy/sScale)^0.5 <= 1
      const starEq = Math.sqrt(sx / sScale) + Math.sqrt(sy / sScale);
      const isStar = (sx < sScale && sy < sScale && starEq <= 1.05);

      // Secondary small sparkle (top right)
      const sx2 = Math.abs(x - (cx + size * 0.13));
      const sy2 = Math.abs(y - (emblemCenterY - size * 0.09));
      const sScale2 = size * 0.06;
      const starEq2 = Math.sqrt(sx2 / sScale2) + Math.sqrt(sy2 / sScale2);
      const isStar2 = (sx2 < sScale2 && sy2 < sScale2 && starEq2 <= 1.05);

      if (isStar || isStar2) {
        r = 255;
        g = 255;
        b = 255;
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = Math.round(255 * alpha);
    }
  }

  // Draw "LIFEKINA" Text
  const text = "LIFEKINA";
  const scale = Math.max(2, Math.round(size / 60)); // pixel scale per dot
  const charSpacing = scale * 2;
  const charWidth = 5 * scale;
  const totalTextWidth = text.length * charWidth + (text.length - 1) * charSpacing;
  const textStartX = Math.round((width - totalTextWidth) / 2);
  const textStartY = Math.round(size * 0.72);

  for (let c = 0; c < text.length; c++) {
    const char = text[c];
    const matrix = FONT_5X7[char] || FONT_5X7[' '];
    const startX = textStartX + c * (charWidth + charSpacing);

    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (matrix[row][col] === '1') {
          for (let py = 0; py < scale; py++) {
            for (let px = 0; px < scale; px++) {
              const targetX = startX + col * scale + px;
              const targetY = textStartY + row * scale + py;

              if (targetX >= 0 && targetX < width && targetY >= 0 && targetY < height) {
                const pixelOffset = targetY * rowBytes + 1 + targetX * 4;
                rawData[pixelOffset] = 255;     // R
                rawData[pixelOffset + 1] = 255; // G
                rawData[pixelOffset + 2] = 255; // B
                rawData[pixelOffset + 3] = 255; // A
              }
            }
          }
        }
      }
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression: Deflate
  ihdr[11] = 0; // Filter: Adaptive
  ihdr[12] = 0; // Interlace: None
  const ihdrChunk = makePngChunk('IHDR', ihdr);

  // IDAT chunk (Compressed scanlines)
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makePngChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makePngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createIconPng(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createIconPng(512));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createIconPng(180));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), createIconPng(192, true));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), createIconPng(512, true));

console.log('Successfully generated all PWA PNG icons with Lifekina logo mark & text in public/icons!');
