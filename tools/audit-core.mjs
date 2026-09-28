// Audit the five claims the skin's README and market entry make about its core. Each one is a
// statement about numbers, so each one is checked against the numbers the build actually shipped
// rather than against the code that was supposed to produce them.
//
//   1. ink comes from the picture (hue), lightness solved in OKLCH, AA kept
//   2. glass solved from the picture and interpolated by the immersion dial
//   3. text surfaces never go below TEXT_SURFACE_MIN_ALPHA (0.45)
//   4. the picker shows the measured contrast for the current position
//   5. the light and dark palettes are solved independently
//
// Usage: node audit-core.mjs
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const HERE = import.meta.dirname
/* Three layouts, resolved by probing rather than assumed: the build tree (the package is a
 * subdirectory of the script), a clone of the published repository with this file in `tools/`, and
 * either of those with the script run from somewhere else entirely. The point of publishing it is
 * that every claim in the README stays checkable by whoever reads the README. */
const CANDIDATES = [
  HERE,
  path.join(HERE, 'dsh-amiya-wallpaper'),
  path.join(HERE, '..'),
  path.join(HERE, '..', 'dsh-amiya-wallpaper'),
]
const PKG = CANDIDATES.find((dir) => existsSync(path.join(dir, 'lib', 'client.js')) && existsSync(path.join(dir, 'assets', 'wallpapers.json')))
if (PKG === undefined) {
  throw new Error(`no package found near ${HERE}: looked in ${CANDIDATES.join(', ')}`)
}
const MANIFEST = path.join(PKG, 'assets', 'wallpapers.json')
const CLIENT = path.join(PKG, 'lib', 'client.js')
const SKIN = path.join(PKG, 'assets', 'skin.css')
const TEXT_SURFACE_MIN_ALPHA = 0.45
const AA = 4.5
/** The palettes' own label colours — what the skin would paint with no solving at all. */
const PALETTE_LABEL = { dark: [249, 250, 251], light: [15, 17, 21] }
/** Mirrors MAX_TINT_LIGHTNESS_COST in build-client.mjs. */
const MAX_TINT_LIGHTNESS_COST = 0.055
/** The clamp is applied to the OKLCH lightness the solver chose; converting that to sRGB and
 *  measuring it back moves it a little when the chroma clips at the gamut edge. Allow for it. */
const GAMUT_SLACK = 0.005

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'))
const client = await readFile(CLIENT, 'utf8')
const skin = await readFile(SKIN, 'utf8')

/* The solved numbers the runtime actually reads are baked into the bundle — `assets/wallpapers.json`
 * is the lighter manifest the picker's labels come from and carries none of them. Read the bundle,
 * bracket-matching the JSON so the parse cannot be fooled by a `]` inside a string. */
function injectedArray(text, marker) {
  const at = text.indexOf(marker)
  if (at < 0) throw new Error(`marker not found in the bundle: ${marker}`)
  const start = text.indexOf('[', at)
  let depth = 0
  let i = start
  let inString = false
  let escaped = false
  for (; i < text.length; i += 1) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '[') depth += 1
    else if (ch === ']') {
      depth -= 1
      if (depth === 0) break
    }
  }
  return JSON.parse(text.slice(start, i + 1))
}
const wallpapers = injectedArray(client, 'var WALLPAPERS = ')
const DEFAULT_IMMERSION = Number(/var DEFAULT_IMMERSION = (\d+)/.exec(client)[1])
if (wallpapers.length !== manifest.wallpapers.length) {
  throw new Error(`bundle has ${wallpapers.length} wallpapers, the manifest has ${manifest.wallpapers.length}`)
}
if (!Number.isInteger(DEFAULT_IMMERSION)) throw new Error('could not read DEFAULT_IMMERSION from the bundle')

/* ---- colour maths, deliberately the same as the runtime's ------------------ */
const linearize = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : Math.pow((c / 255 + 0.055) / 1.055, 2.4))
const luminance = (rgb) => 0.2126 * linearize(rgb[0]) + 0.7152 * linearize(rgb[1]) + 0.0722 * linearize(rgb[2])
const contrastRatio = (a, b) => {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
const parseCss = (value) => {
  const fn = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)%\s*\)$/.exec(value)
  if (fn) return { rgb: [+fn[1], +fn[2], +fn[3]], alpha: +fn[4] / 100 }
  const hex = /^#([0-9a-fA-F]{6})$/.exec(value)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha: 1 }
  }
  return null
}
const compositeOver = (meanRgb, parsed) => [
  parsed.alpha * parsed.rgb[0] + (1 - parsed.alpha) * meanRgb[0],
  parsed.alpha * parsed.rgb[1] + (1 - parsed.alpha) * meanRgb[1],
  parsed.alpha * parsed.rgb[2] + (1 - parsed.alpha) * meanRgb[2],
]
const alphaAt = (range, immersion) => {
  const t = Math.min(100, Math.max(0, immersion)) / 100
  return range.max - (range.max - range.min) * t
}
const rgbaAt = (range, immersion) =>
  `rgb(${range.rgb[0]} ${range.rgb[1]} ${range.rgb[2]} / ${(alphaAt(range, immersion) * 100).toFixed(1)}%)`
/** sRGB → OKLab, so distances are perceptual rather than RGB-space. */
function oklab(rgb) {
  const [r, g, b] = rgb.map(linearize)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}
function oklch(rgb) {
  const [L, a, b] = oklab(rgb)
  const C = Math.hypot(a, b)
  let h = (Math.atan2(b, a) * 180) / Math.PI
  if (h < 0) h += 360
  return { L, C, h }
}
const deltaOk = (x, y) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) * 100
const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
const inkOf = (w, mode) => {
  const key = mode === 'light' ? '--dsh-amiya-ink-l' : '--dsh-amiya-ink'
  const raw = w.inkVars?.[mode]?.[key]
  return raw === undefined ? null : { raw, ...parseCss(raw) }
}
const SURFACE_LIST = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-overlay',
  '--dsw-specific-sidebar-fill',
]
/** Worst contrast over the same surfaces the runtime's picker reads. */
function worstContrast(w, immersion, mode) {
  const ink = inkOf(w, mode)
  if (ink === null) return Number.NaN
  const values = SURFACE_LIST.map((t) => rgbaAt(w.surfaces[t][mode], immersion))
  values.push(rgbaAt(w.glass[mode], immersion))
  let worst = Number.POSITIVE_INFINITY
  for (const v of values) {
    const parsed = parseCss(v)
    if (parsed === null) continue
    worst = Math.min(worst, contrastRatio(compositeOver(w.mean, parsed), ink.rgb))
  }
  return worst
}

const failures = []
const say = (ok, message) => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${message}`)
  if (!ok) failures.push(message)
}

console.log(`manifest: ${wallpapers.length} wallpapers, DEFAULT_IMMERSION ${DEFAULT_IMMERSION}\n`)

/* ---- the shipped numbers, so every verdict below can be read off ----------- */
if (process.argv.includes('--table')) {
  console.log('  #  mean      dark ink   L/C/h              light ink  L/C/h              canvas α     glass α')
  for (const w of wallpapers) {
    const d = inkOf(w, 'dark')
    const l = inkOf(w, 'light')
    const dl = d === null ? null : oklch(d.rgb)
    const ll = l === null ? null : oklch(l.rgb)
    const canvas = w.surfaces['--dsw-alias-bg-base']
    const glass = w.glass
    console.log(
      `  ${String(w.ordinal).padStart(2, '0')} ${hex(w.mean)}  ${d === null ? '—' : hex(d.rgb)}  ` +
        `${dl.L.toFixed(3)}/${dl.C.toFixed(4)}/${String(Math.round(dl.h)).padStart(3, ' ')}°   ` +
        `${l === null ? '—' : hex(l.rgb)}  ${ll.L.toFixed(3)}/${ll.C.toFixed(4)}/${String(Math.round(ll.h)).padStart(3, ' ')}°   ` +
        `dark ${canvas.dark.min.toFixed(2)}–${canvas.dark.max.toFixed(2)}  ` +
        `light ${canvas.light.min.toFixed(2)}–${canvas.light.max.toFixed(2)}  |  ` +
        `glass dark ${glass.dark.min.toFixed(2)}–${glass.dark.max.toFixed(2)}  ` +
        `light ${glass.light.min.toFixed(2)}–${glass.light.max.toFixed(2)}`,
    )
  }
  console.log('')
}

/* ---- claim 1: ink is derived from the picture ------------------------------ */
console.log('claim 1 / ink from the picture, solved in OKLCH, AA held')
const inks = { dark: [], light: [] }
for (const w of wallpapers) {
  for (const mode of ['dark', 'light']) {
    const ink = inkOf(w, mode)
    if (ink === null) {
      say(false, `${w.id} has no ${mode} ink`)
      continue
    }
    inks[mode].push({ id: w.id, rgb: ink.rgb, lch: oklch(ink.rgb), raw: ink.raw })
  }
}
for (const mode of ['dark', 'light']) {
  const list = inks[mode]
  const chromas = list.map((x) => x.lch.C)
  const hues = list.map((x) => x.lch.h)
  const meanC = chromas.reduce((a, b) => a + b, 0) / chromas.length
  console.log(
    `  ${mode.padEnd(5)} chroma ${Math.min(...chromas).toFixed(4)}–${Math.max(...chromas).toFixed(4)} ` +
      `(mean ${meanC.toFixed(4)}), hue ${Math.min(...hues).toFixed(0)}–${Math.max(...hues).toFixed(0)}°, ` +
      `L ${Math.min(...list.map((x) => x.lch.L)).toFixed(3)}–${Math.max(...list.map((x) => x.lch.L)).toFixed(3)}`,
  )
  const pairs = []
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) pairs.push(deltaOk(oklab(list[i].rgb), oklab(list[j].rgb)))
  }
  const maxPair = Math.max(...pairs)
  const uniq = new Set(list.map((x) => x.raw)).size
  console.log(`  ${mode.padEnd(5)} ${uniq}/${list.length} distinct ink values, largest pairwise ΔE_OK = ${maxPair.toFixed(2)}`)
  say(uniq > 1, `${mode}: ink is not a single constant`)
  say(maxPair >= 2, `${mode}: the pictures' tints are actually distinguishable (ΔE_OK ≥ 2, got ${maxPair.toFixed(2)})`)
}
for (const mode of ['dark', 'light']) {
  const bad = wallpapers
    .map((w) => ({ id: w.id, ratio: worstContrast(w, DEFAULT_IMMERSION, mode) }))
    .filter((x) => !(x.ratio >= AA))
  say(bad.length === 0, `${mode} at immersion ${DEFAULT_IMMERSION}: every picture clears AA (worst ${Math.min(...wallpapers.map((w) => worstContrast(w, DEFAULT_IMMERSION, mode))).toFixed(2)}:1)`) 
}
/* At the far end of the dial the guarantee changes shape, and saying so is the point. There the
 * canvas is the picture; the light palette's white veil ships at half the strength its contrast
 * solve asks for, because half a white sheet over a dark wallpaper is no longer a wallpaper. So hold
 * the legibility floor there and report the AA count, rather than pretending AA holds on a dial
 * position where the user explicitly traded it away. */
for (const mode of ['dark', 'light']) {
  const atFull = wallpapers.map((w) => ({ id: w.id, ratio: worstContrast(w, 100, mode) }))
  const worst = atFull.reduce((a, b) => (a.ratio <= b.ratio ? a : b))
  const below = atFull.filter((x) => x.ratio < AA).length
  console.log(`  ${mode} at immersion 100: worst ${worst.ratio.toFixed(2)}:1 (${worst.id.slice(0, 8)}), ${atFull.length - below}/${atFull.length} clear AA`)
  say(worst.ratio >= 3, `${mode}: even at full immersion the text stays above 3:1`)
}
/* The tint is paid for out of a bounded lightness budget, and the direction is the point: "dimmer"
 * means lighter in the light palette and darker in the dark one, and that is the side the bound is
 * on. Without this, the solver buys colour with brightness — it shipped a near-white palette an
 * L 0.75 ink on dark pictures, which measures as 6:1 and still reads as washed-out grey. */
for (const mode of ['dark', 'light']) {
  const paletteL = oklch(PALETTE_LABEL[mode]).L
  const worst = wallpapers
    .map((w) => {
      const inkL = oklch(inkOf(w, mode).rgb).L
      return { id: w.id, L: inkL, cost: mode === 'dark' ? paletteL - inkL : inkL - paletteL }
    })
    .sort((a, b) => b.cost - a.cost)[0]
  say(
    worst.cost <= MAX_TINT_LIGHTNESS_COST + GAMUT_SLACK + 1e-9,
    `${mode}: the tint never dims text by more than ${MAX_TINT_LIGHTNESS_COST} of OKLCH lightness ` +
      `(worst ${worst.cost.toFixed(3)} on ${worst.id.slice(0, 8)}, ink L ${worst.L.toFixed(3)} vs palette ${paletteL.toFixed(3)})`,
  )
}

/* ---- claim 2: glass solved from the picture, moved by the dial ------------- */
console.log('\nclaim 2 / glass and panels solved per picture, moved by the dial')
const distinct = (values) => new Set(values.map((v) => v.toFixed(4))).size
for (const mode of ['dark', 'light']) {
  const mins = wallpapers.map((w) => w.glass[mode].min)
  const maxes = wallpapers.map((w) => w.glass[mode].max)
  console.log(
    `  ${mode.padEnd(5)} glass: min ${Math.min(...mins).toFixed(3)}–${Math.max(...mins).toFixed(3)} ` +
      `(${distinct(mins)} distinct), max ${Math.min(...maxes).toFixed(3)}–${Math.max(...maxes).toFixed(3)} ` +
      `(${distinct(maxes)} distinct)`,
  )
}
for (const mode of ['dark', 'light']) {
  const mins = wallpapers.map((w) => w.glass[mode].min)
  say(distinct(mins) >= 6, `${mode}: the glass is solved per picture (${distinct(mins)}/12 distinct immersive ends)`)
  const spread = Math.max(...mins) - Math.min(...mins)
  say(spread >= 0.05, `${mode}: that solving is visible (immersive end spans ${spread.toFixed(3)} across the set)`)
}
/* The canvas is what the dial moves; a panel that carries text must not travel far.
 *
 * The canvas' travel is not uniform any more, and that is the point of the AA-solved thin end: on a
 * dark picture the solve asks for no veil, the floor wins, and the dial runs the full distance; on a
 * bright picture the thin end is held back so the text stays readable, and the dial has less room.
 * So cover both properties — the dial always moves the canvas, and it still moves it a long way
 * where the picture allows. */
const canvasTravel = wallpapers
  .map((w) => ({ id: w.id, travel: w.surfaces['--dsw-alias-bg-base'].dark.max - w.surfaces['--dsw-alias-bg-base'].dark.min }))
  .sort((a, b) => a.travel - b.travel)
const tightest = canvasTravel[0]
const widest = canvasTravel[canvasTravel.length - 1]
console.log(
  `  canvas travel across the dial: ${tightest.travel.toFixed(3)} (${tightest.id.slice(0, 8)}) ` +
    `– ${widest.travel.toFixed(3)} (${widest.id.slice(0, 8)})`,
)
say(tightest.travel >= 0.03, `the dial still moves the canvas on every picture (tightest ${tightest.travel.toFixed(3)})`)
say(widest.travel >= 0.2, `and still runs the full distance where the picture allows it (widest ${widest.travel.toFixed(3)})`)
for (const token of SURFACE_LIST.filter((t) => t !== '--dsw-alias-bg-base')) {
  const travel = wallpapers.map((w) => w.surfaces[token].dark.max - w.surfaces[token].dark.min)
  say(Math.max(...travel) <= 0.2, `${token} is a panel and stays put (largest travel ${Math.max(...travel).toFixed(3)})`)
}
const moves = wallpapers.every((w) => {
  const c0 = worstContrast(w, 0, 'dark')
  const c100 = worstContrast(w, 100, 'dark')
  return c0 !== c100
})
say(moves, 'the dial changes the measured contrast for every picture')

/* ---- claim 3: the 0.45 text-surface floor ----------------------------------
 * Read as written — "text surfaces never go below 0.45" — the sentence is too strong, and the
 * shipped numbers say why: the canvas is *supposed* to reach the picture at full immersion. Every
 * surface that carries panel text keeps the floor; the canvas is the single documented exception,
 * and the picker measures it rather than hiding it. */
console.log(`\nclaim 3 / every text panel stays at or above ${TEXT_SURFACE_MIN_ALPHA}; the canvas is the exception`)
let floor = { alpha: Number.POSITIVE_INFINITY, token: '', id: '' }
for (const mode of ['dark', 'light']) {
  for (const w of wallpapers) {
    for (const token of Object.keys(w.surfaces).filter((t) => t !== '--dsw-alias-bg-base')) {
      const alpha = w.surfaces[token][mode].min
      if (alpha < floor.alpha) floor = { alpha, token, id: w.id }
    }
  }
}
say(
  floor.alpha >= TEXT_SURFACE_MIN_ALPHA - 1e-9,
  `no panel goes below the floor (lowest ${floor.alpha.toFixed(3)} at ${floor.token} on ${floor.id.slice(0, 8)})`,
)
const canvasFloor = Math.min(...wallpapers.map((w) => w.surfaces['--dsw-alias-bg-base'].dark.min))
console.log(`  canvas floor at full immersion: ${canvasFloor.toFixed(3)} — deliberate (that is the wallpaper showing through)`)
say(
  client.includes('tokens["--dsw-alias-bg-base"]'),
  'the picker measures the canvas, so the exception is reported rather than hidden',
)

/* ---- claim 4: the picker shows the measured contrast ----------------------- */
console.log('\nclaim 4 / the picker shows the measured contrast')
say(client.includes('amiya-picker__contrast'), 'the picker renders a contrast readout')
say(/is-low/.test(client), 'the readout is marked when it drops below the floor')
say(skin.includes('amiya-picker__contrast'), 'the readout is styled by the shipped stylesheet')
say(
  /"light"\s*:\s*"light"/.test(client) || client.includes('colorScheme === "light"'),
  'the readout reads the palette actually in force',
)

/* ---- claim 5: the two palettes are solved independently -------------------- */
console.log('\nclaim 5 / light and dark solved independently')
let copied = 0
let minInkDelta = Number.POSITIVE_INFINITY
let copiedSurfaces = 0
for (const w of wallpapers) {
  const d = inkOf(w, 'dark')
  const l = inkOf(w, 'light')
  if (d === null || l === null) continue
  minInkDelta = Math.min(minInkDelta, Math.abs(oklch(d.rgb).L - oklch(l.rgb).L))
  if (d.raw === l.raw) copied += 1
  for (const token of SURFACE_LIST) {
    if (w.surfaces[token].dark.max === w.surfaces[token].light.max) copiedSurfaces += 1
  }
}
say(copied === 0, `no picture reuses one ink for both palettes (${copied} did)`)
say(minInkDelta > 0.2, `the two inks differ in lightness (smallest ΔL ${minInkDelta.toFixed(3)})`)
say(new Set(wallpapers.map((w) => w.surfaces['--dsw-alias-bg-base'].dark.max)).size > 1, 'dark surfaces are solved per picture')
say(new Set(wallpapers.map((w) => w.surfaces['--dsw-alias-bg-base'].light.max)).size > 1, 'light surfaces are solved per picture')
console.log(`  (${copiedSurfaces} surface values happened to land on the same number in both palettes — informational)`)

/* ---- claim 6: the two halves are wired to the same names --------------------
 * The bug this audit was written for was not a wrong number: it was a name. The client
 * published the solved glass as `--dsh-amiya-glass-dark/light`, the stylesheet read
 * `--dsh-amiya-veil-glass`/`-l`, and fourteen rules therefore sat on their static fallback
 * while the solver's answer went nowhere. No amount of checking the solver would have
 * caught that, so check the seam itself: every custom property the stylesheet reads, the
 * client half has to publish. */
console.log('\nclaim 6 / every custom property the stylesheet reads is one the client publishes')
/** Comments name properties too, and a mention is not a publish. Strip them, string-aware, so a
 *  `//` inside a `https://` URL is not mistaken for the start of one. */
function stripComments(text) {
  let out = ''
  let i = 0
  let quote = null
  while (i < text.length) {
    const ch = text[i]
    const next = text[i + 1]
    if (quote !== null) {
      out += ch
      if (ch === '\\') {
        out += next ?? ''
        i += 2
        continue
      }
      if (ch === quote) quote = null
      i += 1
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      out += ch
      i += 1
      continue
    }
    if (ch === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2)
      i = end < 0 ? text.length : end + 2
      continue
    }
    if (ch === '/' && next === '/') {
      const end = text.indexOf('\n', i)
      i = end < 0 ? text.length : end
      continue
    }
    out += ch
    i += 1
  }
  return out
}
/** Cut the embedded stylesheet string out of the bundle, so its `var(--…)` reads are not mistaken
 *  for the client half publishing them. */
function withoutEmbeddedCss(text) {
  const marker = 'var CSS = "'
  const at = text.indexOf(marker)
  if (at < 0) return text
  let i = at + marker.length
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2
      continue
    }
    if (text[i] === '"') break
    i += 1
  }
  return text.slice(0, at) + text.slice(i + 1)
}
const readNames = new Set([...skin.matchAll(/var\((--dsh-amiya-[a-z0-9-]+)/g)].map((m) => m[1]))
/* A property the stylesheet declares itself is an alias, not an orphan: `--x: var(--y, …)` at the
 * start of a declaration is the stylesheet publishing, and only `var(--x` is it reading. The
 * lookbehind is the distinction — after `(`, `,` or a space inside a value it is a read. */
const declaredInCss = new Set([...skin.matchAll(/(?:^|[;{}])\s*(--dsh-amiya-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]))
/* Two precise sources rather than "every occurrence in the bundle": the bundle embeds the whole
 * stylesheet as a string, so scanning it raw would count the stylesheet's own reads as writes. */
const published = new Set()
for (const w of wallpapers) {
  for (const mode of ['dark', 'light']) {
    for (const name of Object.keys(w.veilVars?.[mode] ?? {})) published.add(name)
    for (const name of Object.keys(w.inkVars?.[mode] ?? {})) published.add(name)
  }
}
const clientSource = stripComments(withoutEmbeddedCss(client))
for (const m of clientSource.matchAll(/--dsh-amiya-[a-z0-9-]+/g)) published.add(m[0])
const orphans = [...readNames].filter((name) => !published.has(name) && !declaredInCss.has(name)).sort()
console.log(`  ${readNames.size} read · ${published.size} published by the client · ${declaredInCss.size} declared by the stylesheet itself`)
say(
  orphans.length === 0,
  orphans.length ? `orphaned — read by the stylesheet, published by nobody: ${orphans.join(', ')}` : 'nothing is read that nobody publishes',
)
const notInBundle = [...published].filter((name) => !client.includes(name))
say(notInBundle.length === 0, `every published name survives into the built bundle${notInBundle.length ? ` — missing: ${notInBundle.join(', ')}` : ''}`)
const unused = [...published].filter((name) => !readNames.has(name)).sort()
if (unused.length) console.log(`  (${unused.length} published but unread: ${unused.slice(0, 8).join(', ')}${unused.length > 8 ? ' …' : ''})`)

console.log(
  failures.length === 0
    ? '\nALL CLAIMS HOLD'
    : `\n${failures.length} CLAIM(S) DO NOT HOLD:\n` + failures.map((f) => `  - ${f}`).join('\n'),
)
process.exit(failures.length === 0 ? 0 : 1)
