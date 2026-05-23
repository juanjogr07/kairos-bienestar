#!/usr/bin/env node
/**
 * Genera 3 PNGs cuadrados (16/48/128) con un gradiente azul→violeta y la
 * letra "K" centrada. Sin dependencias externas (PNG construido a mano).
 *
 * Ejecutar:  node extension/scripts/generate-icons.js
 */

const fs = require("fs")
const path = require("path")
const zlib = require("zlib")

const OUT_DIR = path.resolve(__dirname, "..", "icons")

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const byte of buf) {
    crc = (table[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, "ascii")
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

/** Devuelve [r,g,b,a] interpolado de azul a violeta según factor t∈[0,1]. */
function gradientColor(t) {
  const start = [37, 99, 235] // #2563eb
  const end = [124, 58, 237] // #7c3aed
  return [
    Math.round(start[0] + (end[0] - start[0]) * t),
    Math.round(start[1] + (end[1] - start[1]) * t),
    Math.round(start[2] + (end[2] - start[2]) * t),
    255,
  ]
}

/**
 * Mapa booleano de la letra "K" en una grilla de 5x7.
 * 1 = pixel encendido (blanco), 0 = fondo (gradiente).
 */
const LETTER_K = [
  [1, 0, 0, 0, 1],
  [1, 0, 0, 1, 0],
  [1, 0, 1, 0, 0],
  [1, 1, 0, 0, 0],
  [1, 0, 1, 0, 0],
  [1, 0, 0, 1, 0],
  [1, 0, 0, 0, 1],
]

function buildPixels(size) {
  const pixels = []
  const scale = Math.floor(size / 7)
  const letterW = 5 * scale
  const letterH = 7 * scale
  const offsetX = Math.floor((size - letterW) / 2)
  const offsetY = Math.floor((size - letterH) / 2)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size)
      let color = gradientColor(t)
      const lx = Math.floor((x - offsetX) / scale)
      const ly = Math.floor((y - offsetY) / scale)
      if (
        lx >= 0 &&
        lx < 5 &&
        ly >= 0 &&
        ly < 7 &&
        LETTER_K[ly][lx] === 1
      ) {
        color = [255, 255, 255, 255]
      }
      pixels.push(...color)
    }
  }
  return Buffer.from(pixels)
}

function encodePng(size) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0) // width
  ihdr.writeUInt32BE(size, 4) // height
  ihdr.writeUInt8(8, 8) // bit depth
  ihdr.writeUInt8(6, 9) // color type RGBA
  ihdr.writeUInt8(0, 10) // compression
  ihdr.writeUInt8(0, 11) // filter
  ihdr.writeUInt8(0, 12) // interlace

  const raw = buildPixels(size)
  const stride = size * 4
  const filtered = []
  for (let y = 0; y < size; y++) {
    filtered.push(0) // filter type none
    for (let x = 0; x < stride; x++) {
      filtered.push(raw[y * stride + x])
    }
  }
  const idatData = zlib.deflateSync(Buffer.from(filtered))

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
  for (const size of [16, 48, 128]) {
    const png = encodePng(size)
    const out = path.join(OUT_DIR, `icon${size}.png`)
    fs.writeFileSync(out, png)
    console.log(`wrote ${out} (${png.length} bytes, ${size}x${size})`)
  }
}

main()
