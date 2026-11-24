// Convierte los SVG de public/diagramas/subestaciones/ a src/data/planos.json.
// Uso: npm run planos   (cada vez que agregues o cambies un SVG)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DOMParser } from '@xmldom/xmldom'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(RAIZ, 'public/diagramas/subestaciones')
const OUT = path.join(RAIZ, 'src/data/planos.json')

const I = [1, 0, 0, 1, 0, 0]
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
]
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
const r = (n) => Math.round(n * 1000) / 1000

function parseTransform(str) {
  let m = I
  if (!str) return m
  const re = /(matrix|translate|rotate|scale)\(([^)]*)\)/g
  let t
  while ((t = re.exec(str))) {
    const a = t[2].split(/[\s,]+/).filter(Boolean).map(Number)
    let n = I
    if (t[1] === 'matrix') n = a
    else if (t[1] === 'translate') n = [1, 0, 0, 1, a[0], a[1] || 0]
    else if (t[1] === 'scale') n = [a[0], 0, 0, a[1] ?? a[0], 0, 0]
    else {
      const k = (a[0] * Math.PI) / 180
      const c = Math.cos(k), s = Math.sin(k)
      n = [c, s, -s, c, 0, 0]
      if (a.length === 3) n = mul(mul([1, 0, 0, 1, a[1], a[2]], n), [1, 0, 0, 1, -a[1], -a[2]])
    }
    m = mul(m, n)
  }
  return m
}

const style = (el, prop) => {
  const s = el.getAttribute('style') || ''
  const mm = s.match(new RegExp('(?:^|;)\\s*' + prop + ':\\s*([^;]+)'))
  return mm ? mm[1].trim() : el.getAttribute(prop) || ''
}

function convert(file) {
  const doc = new DOMParser().parseFromString(fs.readFileSync(file, 'utf8'), 'image/svg+xml')
  const svg = doc.documentElement
  const rects = [], arcos = [], textosRaw = [], cuadros = [], todos = []

  function walk(el, m, href) {
    for (let n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType !== 1) continue
      const tag = n.nodeName
      if (tag === 'sodipodi:namedview' || tag === 'defs') continue
      if (/display:\s*none/.test(n.getAttribute('style') || '')) continue
      const mm = mul(m, parseTransform(n.getAttribute('transform')))
      if (tag === 'g' || tag === 'a') walk(n, mm, tag === 'a' ? n.getAttribute('xlink:href') || href : href)
      else if (tag === 'rect') {
        const x = +n.getAttribute('x') || 0, y = +n.getAttribute('y') || 0
        const w = +n.getAttribute('width'), hh = +n.getAttribute('height')
        const pts = [apply(mm, x, y), apply(mm, x + w, y), apply(mm, x, y + hh), apply(mm, x + w, y + hh)]
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
        const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
        const fill = style(n, 'fill').toLowerCase()
        const sw = parseFloat(style(n, 'stroke-width')) || 0.4
        todos.push({ ...box, sw, especial: fill === '#cffafe', href: href || null })
      } else if (tag === 'path') {
        arcos.push({ d: n.getAttribute('d'), transform: mm.map(r).join(' '), sw: r(parseFloat(style(n, 'stroke-width')) || 0.4) })
      } else if (tag === 'text') {
        const size = parseFloat(style(n, 'font-size')) || 2.3
        const lineas = []
        for (let c = n.firstChild; c; c = c.nextSibling) {
          if (c.nodeType === 1 && c.nodeName === 'tspan') {
            lineas.push({ t: c.textContent, x: +c.getAttribute('x'), y: +c.getAttribute('y') })
          }
        }
        if (!lineas.length) lineas.push({ t: n.textContent, x: +n.getAttribute('x'), y: +n.getAttribute('y') })
        const fuerte = /3e3e3e|3d3d3d/i.test(style(n, 'fill'))
        textosRaw.push({ size, fuerte, mm, lineas, href: href || null })
      }
    }
  }
  walk(svg, I, null)

  // Tamaño más común de los cuadritos pequeños = tamaño de un rack
  const cont = {}
  for (const b of todos) if (Math.max(b.w, b.h) < 40) { const k = Math.round(Math.max(b.w, b.h) * 10) / 10; cont[k] = (cont[k] || 0) + 1 }
  const candidatos = Object.entries(cont).sort((a, b) => b[1] - a[1])
  if (!candidatos.length) throw new Error('no se encontraron cuadritos de rack (<rect>) en el SVG')
  const modo = +candidatos[0][0]
  for (const b of todos) {
    if (b.w <= modo * 1.15 && b.h <= modo * 1.15) cuadros.push(b)
    else rects.push({ x: r(b.x), y: r(b.y), w: r(b.w), h: r(b.h), sw: r(b.sw) })
  }

  // Asignar etiquetas a cuadros (texto cuyo punto central cae dentro/cerca del cuadro)
  const racks = cuadros.map((c) => ({ ...c, id: '' }))
  const textos = []
  for (const t of textosRaw) {
    const l = t.lineas[0]
    const txt = l.t.trim()
    const ancho = txt.length * t.size * 0.55
    const [cx, cy] = apply(t.mm, l.x + ancho / 2, l.y - t.size * 0.3)
    let best = null, bd = 99
    for (const k of racks) {
      const d = Math.hypot(cx - (k.x + k.w / 2), cy - (k.y + k.h / 2))
      if (d < bd) { bd = d; best = k }
    }
    const esEtiqueta = t.lineas.length === 1 && txt.length <= 4 && t.size <= modo * 0.55 && best && bd < modo * 0.67 && !best.id
    if (esEtiqueta) {
      best.id = txt
      if (t.href) best.href = t.href
    } else {
      textos.push({ size: r(t.size), fuerte: t.fuerte, transform: t.mm.map(r).join(' '), lineas: t.lineas.map((x) => ({ t: x.t, x: r(x.x), y: r(x.y) })) })
    }
  }

  return {
    viewBox: svg.getAttribute('viewBox'),
    rects,
    arcos,
    textos,
    racks: racks.map((k) => ({
      id: k.id,
      x: r(k.x), y: r(k.y), w: r(k.w), h: r(k.h),
      ...(k.href ? { href: k.href } : {}),
      ...(k.especial ? { especial: true } : {}),
    })),
  }
}

const out = {}
let fallos = 0
for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('.svg'))) {
  const key = path.basename(f, '.svg')
  try {
    out[key] = convert(path.join(DIR, f))
  } catch (e) {
    fallos++
    console.log(`${key}: ERROR - ${e.message}`)
    continue
  }
  const p = out[key]
  const sinId = p.racks.filter((k) => !k.id).length
  console.log(`${key}: muros ${p.rects.length}, arcos ${p.arcos.length}, textos ${p.textos.length}, racks ${p.racks.length} (sin etiqueta ${sinId}, con enlace ${p.racks.filter((k) => k.href).length})`)
}
fs.writeFileSync(OUT, JSON.stringify(out))
console.log('escrito', path.relative(RAIZ, OUT), fs.statSync(OUT).size, 'bytes')
if (fallos) process.exitCode = 1
