// ============================================================
// Visumo — Gerador de ícones PWA
// Gera PNGs usando apenas Node.js built-ins (sem dependências)
// Executa: node scripts/generate-icons.mjs
// ============================================================

import { createWriteStream, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── CRC32 ───────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return ((crc ^ 0xffffffff) >>> 0)
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type)
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(data.length)
  const crcData = Buffer.concat([typeBytes, data])
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(crcData))
  return Buffer.concat([len, typeBytes, data, crcBuf])
}

// ─── PNG sólido ───────────────────────────────────────────────

function solidPNG(size, r, g, b) {
  const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8]  = 8 // bit depth
  ihdr[9]  = 2 // RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // Cada linha: [filtro=0, R, G, B * size]
  const row = Buffer.allocUnsafe(1 + size * 3)
  row[0] = 0
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r
    row[2 + x * 3] = g
    row[3 + x * 3] = b
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => row))
  const compressed = deflateSync(raw)

  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

function writeFile(path, buf) {
  return new Promise((resolve, reject) => {
    const ws = createWriteStream(path)
    ws.on('finish', resolve)
    ws.on('error', reject)
    ws.end(buf)
  })
}

// ─── Gerar ───────────────────────────────────────────────────

const ROOT   = join(__dirname, '..')
const ICONS  = join(ROOT, 'public', 'icons')
const PUBLIC = join(ROOT, 'public')

mkdirSync(ICONS, { recursive: true })

// Indigo #4f46e5 = rgb(79, 70, 229)
const R = 79, G = 70, B = 229

const jobs = [
  { path: join(ICONS, 'icon-192x192.png'),  size: 192 },
  { path: join(ICONS, 'icon-512x512.png'),  size: 512 },
  { path: join(PUBLIC, 'apple-touch-icon.png'), size: 180 },
]

for (const { path, size } of jobs) {
  await writeFile(path, solidPNG(size, R, G, B))
  console.log(`✓ ${path.replace(ROOT, '.')} (${size}×${size})`)
}

console.log('\nÍcones gerados com sucesso!')
console.log('Lembre de substituir por ícones reais com o logo Visumo.')
