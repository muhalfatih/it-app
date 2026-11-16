// Verifies WCAG contrast of the theme tokens in src/styles/globals.css (light :root and .dark).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import process from "node:process"

const css = readFileSync(
  new URL("../src/styles/globals.css", import.meta.url),
  "utf8"
)

function parseOklch(value) {
  const m =
    /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/.exec(
      value.trim()
    )
  if (!m) return null
  const alpha = m[5] === undefined ? 1 : Number(m[5]) / (m[6] ? 100 : 1)
  return {
    l: Number(m[1]) / (m[2] ? 100 : 1),
    c: Number(m[3]),
    h: Number(m[4]),
    alpha,
  }
}

// OKLCH -> gamma-encoded sRGB (0..1), via OKLab and linear sRGB (Björn Ottosson's matrices).
function toSrgb({ l, c, h }) {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
  return lin.map((x) => {
    const v = Math.min(1, Math.max(0, x))
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
  })
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Browsers composite translucent colors in gamma-encoded sRGB.
function over(fgRgb, alpha, bgRgb) {
  return fgRgb.map((v, i) => alpha * v + (1 - alpha) * bgRgb[i])
}

function ratioRgb(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const ratio = (a, b) => ratioRgb(toSrgb(parseOklch(a)), toSrgb(parseOklch(b)))

// Self-check of the color math.
assert.equal(Math.round(ratio("oklch(1 0 0)", "oklch(0 0 0)") * 10) / 10, 21)
assert.ok(
  Math.abs(ratio("oklch(0.401 0.062 217.4)", "oklch(1 0 0)") - 8.96) < 0.15,
  "#16505E vs white"
)

function block(selector) {
  const m = new RegExp(`(?:^|\\n)${selector}\\s*\\{([^}]*)\\}`).exec(css)
  assert.ok(m, `block ${selector} not found`)
  return Object.fromEntries(
    [...m[1].matchAll(/--([\w-]+):\s*([^;]+);/g)].map((x) => [
      x[1],
      x[2].trim(),
    ])
  )
}

const STATUS = ["success", "warning", "info", "destructive"]
const both = [
  ["foreground", "background", 4.5],
  ["card-foreground", "card", 4.5],
  ["popover-foreground", "popover", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["secondary-foreground", "secondary", 4.5],
  ["muted-foreground", "muted", 4.5],
  ["muted-foreground", "background", 4.5],
  ["accent-foreground", "accent", 4.5],
  ["sidebar-foreground", "sidebar", 4.5],
  ["sidebar-primary-foreground", "sidebar-primary", 4.5],
  ["sidebar-accent-foreground", "sidebar-accent", 4.5],
  ["invert-foreground", "invert", 4.5],
  ["destructive", "background", 4.5],
  ["primary", "background", 3],
  ["ring@0.5", "background", 3],
  // Grafik: tiap seri chart harus terlihat di latar halaman dan kartu (WCAG 1.4.11).
  ...[1, 2, 3, 4, 5].flatMap((n) => [
    [`chart-${n}`, "background", 3],
    [`chart-${n}`, "card", 3],
  ]),
]
// Latar tembus pandang ditulis "token@alpha>dasar" (mis. bg-destructive/10 di atas popover).
const SURFACES = ["background", "card", "popover"]
const themes = {
  light: [
    ...both,
    ...STATUS.map((s) => [`${s}-foreground`, "background", 4.5]), // badge -outline text
    ...STATUS.map((s) => [s, "background", 3]), // alert icons
    ...STATUS.flatMap((s) =>
      SURFACES.map((b) => [`${s}-foreground`, `${s}@0.1>${b}`, 4.5])
    ), // badge -light
    ...SURFACES.map((b) => ["destructive", `destructive@0.1>${b}`, 4.5]), // Button variant destructive
  ],
  dark: [
    ...both,
    ...STATUS.map((s) => [`${s}-foreground`, "background", 4.5]), // badge -outline text
    ...STATUS.flatMap((s) => SURFACES.map((b) => [s, `${s}@0.15>${b}`, 4.5])), // badge -light
    ...SURFACES.map((b) => ["destructive", `destructive@0.2>${b}`, 4.5]), // Button variant destructive
  ],
}

const vars = { light: block(":root"), dark: block("\\.dark") }
const failures = []

for (const [theme, pairs] of Object.entries(themes)) {
  const color = (name) => {
    if (name.includes(">")) {
      const [top, base] = name.split(">")
      const t = color(top)
      const b = color(base)
      return t && b && { rgb: over(t.rgb, t.alpha, b.rgb), alpha: 1 }
    }
    const [token, alpha] = name.split("@")
    const parsed = vars[theme][token] && parseOklch(vars[theme][token])
    if (!parsed) {
      failures.push(
        `${theme}: --${token} missing or not an oklch() literal (${vars[theme][token] ?? "undefined"})`
      )
      return null
    }
    return { rgb: toSrgb(parsed), alpha: Number(alpha ?? 1) * parsed.alpha }
  }
  for (const [fgName, bgName, min] of pairs) {
    const fg = color(fgName)
    const bg = color(bgName)
    if (!fg || !bg) continue
    const r = ratioRgb(over(fg.rgb, fg.alpha, bg.rgb), bg.rgb)
    const line = `${theme}: ${fgName} / ${bgName} = ${r.toFixed(2)} (min ${min})`
    if (r < min) failures.push(line)
    else console.log(`ok   ${line}`)
  }
}

if (failures.length) {
  console.error([...new Set(failures)].map((f) => `FAIL ${f}`).join("\n"))
  process.exit(1)
}
console.log("All contrast checks passed.")
