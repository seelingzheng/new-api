/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/*
Design-token contrast gate — OpenSpec `frontend-theme-system`, requirement
"正文与关键图形满足 WCAG 2.1 AA".

Parses the default `:root` / `.dark` blocks plus every `[data-theme-preset]`
layer, resolves var() and color-mix(in oklch, …) references, converts OKLCH to
linear sRGB, and asserts WCAG 2.1 ratios. Token values are the only input, so
editing a colour can fail this gate — which is the point.
*/

// Vitest runs with cwd at the frontend project root, and the jsdom environment
// rewrites import.meta.url to a non-file scheme, so stylesheets resolve from
// cwd with an explicit error instead of a cryptic ENOENT.
function styleFile(name: string): string {
  const file = path.resolve(process.cwd(), 'src/styles', name)
  if (!existsSync(file)) throw new Error(`expected stylesheet: ${file}`)
  return file
}

const themeCss = readFileSync(styleFile('theme.css'), 'utf8')
const presetsCss = readFileSync(styleFile('theme-presets.css'), 'utf8')

type Color = { l: number; c: number; h: number; alpha: number }

function extractBlock(css: string, selector: string): string {
  // Anchored on the rule header so `.dark` cannot first match the
  // `@custom-variant dark (&:is(.dark *))` line above the token blocks.
  const escaped = selector.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{`).exec(css)
  if (!match) throw new Error(`selector not found: ${selector}`)
  const open = css.indexOf('{', match.index)
  let depth = 0
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1
    else if (css[i] === '}') {
      depth -= 1
      if (depth === 0) return css.slice(open + 1, i)
    }
  }
  throw new Error(`unbalanced braces after ${selector}`)
}

// Multi-line declarations collapse to `color-mix( in oklch, … )`; the padding
// around parentheses is dropped so functional notations parse uniformly.
function normalizeValue(value: string): string {
  return value
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/\(\s+/g, '(')
    .replaceAll(/\s+\)/g, ')')
    .trim()
}

function parseDeclarations(block: string): Map<string, string> {
  const stripped = block.replaceAll(/\/\*[\s\S]*?\*\//g, '')
  const map = new Map<string, string>()
  for (const raw of stripped.split(';')) {
    const decl = raw.trim()
    if (!decl.startsWith('--')) continue
    const colon = decl.indexOf(':')
    if (colon === -1) continue
    const value = normalizeValue(decl.slice(colon + 1))
    if (value) map.set(decl.slice(0, colon).trim(), value)
  }
  return map
}

function parseOklch(value: string): Color | null {
  const match = /^oklch\(([^)]+)\)$/.exec(value.trim())
  if (!match) return null
  const parts = (match[1] ?? '').trim().split(/[\s/]+/).filter(Boolean)
  const [lRaw, cRaw, hRaw, aRaw] = parts
  const l = Number(lRaw)
  const c = Number(cRaw)
  const h = Number((hRaw ?? '').replace(/deg$/, ''))
  if ([l, c, h].some(Number.isNaN)) return null
  let alpha = 1
  if (aRaw !== undefined) {
    alpha = aRaw.endsWith('%') ? Number(aRaw.slice(0, -1)) / 100 : Number(aRaw)
    if (Number.isNaN(alpha)) alpha = 1
  }
  return { l, c, h, alpha }
}

// Shortest-path hue interpolation, matching CSS color-mix in oklch.
function mixColor(a: Color, b: Color, weightA: number): Color {
  const weightB = 1 - weightA
  let delta = b.h - a.h
  while (delta > 180) delta -= 360
  while (delta < -180) delta += 360
  return {
    l: a.l * weightA + b.l * weightB,
    c: a.c * weightA + b.c * weightB,
    h: (a.h + delta * weightB + 360) % 360,
    alpha: a.alpha * weightA + b.alpha * weightB,
  }
}

function splitTopLevel(input: string): string[] {
  const out: string[] = []
  let depth = 0
  let current = ''
  for (const char of input) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (char === ',' && depth === 0) {
      out.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  if (current.trim()) out.push(current.trim())
  return out
}

function resolve(
  token: string,
  declarations: Map<string, string>,
  seen: Set<string> = new Set()
): Color | null {
  const raw = declarations.get(token)
  if (raw === undefined || seen.has(token)) return null
  const nextSeen = new Set(seen).add(token)

  const direct = parseOklch(raw)
  if (direct) return direct

  const varRef = /^var\((--[^)]+)\)$/.exec(raw)
  if (varRef?.[1]) return resolve(varRef[1], declarations, nextSeen)

  const mix = /^color-mix\(in oklch,(.+)\)$/.exec(raw)
  if (mix?.[1]) {
    const [first, second] = splitTopLevel(mix[1])
    if (!first || !second) return null
    const parseSide = (side: string): { color: Color | null; weight: number } => {
      const weighted = /^(.+?)\s+([\d.]+)%$/.exec(side.trim())
      const colorToken = weighted ? (weighted[1] ?? '') : side.trim()
      const weight = weighted ? Number(weighted[2]) / 100 : 1
      const varName = /^var\((--[^)]+)\)$/.exec(colorToken)
      const color = varName?.[1]
        ? resolve(varName[1], declarations, nextSeen)
        : parseOklch(colorToken)
      return { color, weight }
    }
    const a = parseSide(first)
    const b = parseSide(second)
    if (!a.color || !b.color) return null
    return mixColor(a.color, b.color, a.weight)
  }

  return null
}

// WCAG relative luminance is defined on linear-light components; using the
// gamma-encoded values instead silently halves every ratio.
function relativeLuminance(color: Color): number {
  const { l, c, h } = color
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b
  const lCube = lPrime ** 3
  const mCube = mPrime ** 3
  const sCube = sPrime ** 3
  const clamp = (channel: number): number => Math.min(1, Math.max(0, channel))
  return (
    0.2126 * clamp(4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube) +
    0.7152 * clamp(-1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube) +
    0.0722 * clamp(-0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube)
  )
}

// Translucent tokens are composited over the background they sit on, which is
// how an alpha border such as `oklch(0.97 0.01 255 / 14%)` really renders.
function contrast(foreground: Color, background: Color): number {
  const fgLum = relativeLuminance(foreground)
  const bgLum = relativeLuminance(background)
  const blended =
    foreground.alpha === 1
      ? fgLum
      : fgLum * foreground.alpha + bgLum * (1 - foreground.alpha)
  const lighter = Math.max(blended, bgLum)
  const darker = Math.min(blended, bgLum)
  return (lighter + 0.05) / (darker + 0.05)
}

type Pair = [fgToken: string, bgToken: string, label: string]

const BODY_PAIRS: Pair[] = [
  ['--foreground', '--background', '正文 / 页面底色'],
  ['--muted-foreground', '--background', '次要正文 / 页面底色'],
  ['--card-foreground', '--card', '卡片正文 / 卡片底'],
  ['--popover-foreground', '--popover', '浮层正文 / 浮层底'],
  ['--secondary-foreground', '--secondary', '次级按钮文字 / 次级底色'],
  ['--accent-foreground', '--accent', '强调文字 / 强调淡底'],
  ['--primary-foreground', '--primary', '主按钮文字 / 主色'],
  ['--destructive-foreground', '--destructive', '危险按钮文字 / 危险色'],
  ['--success-foreground', '--success', '成功状态文字 / 成功色'],
  ['--warning-foreground', '--warning', '警告状态文字 / 警告色'],
  ['--info-foreground', '--info', '信息状态文字 / 信息色'],
  ['--sidebar-foreground', '--sidebar', '侧边栏正文 / 侧边栏底'],
]

// WCAG 1.4.11 scope: graphics the user must perceive to use the product.
const KEY_GRAPHICS_PAIRS: Pair[] = [
  ['--primary', '--background', '主色作图标或链接文字 / 页面底色'],
  ['--ring', '--background', '焦点环 / 页面底色'],
  ['--sidebar-ring', '--sidebar', '侧边栏焦点环 / 侧边栏底'],
  ['--chart-1', '--card', '图表系列 1 / 卡片底'],
  ['--chart-2', '--card', '图表系列 2 / 卡片底'],
  ['--chart-3', '--card', '图表系列 3 / 卡片底'],
  ['--chart-4', '--card', '图表系列 4 / 卡片底'],
  ['--chart-5', '--card', '图表系列 5 / 卡片底'],
]

// Measured on demand but not gated: a hairline divider or a shimmer delta is
// not a WCAG 1.4.11 graphical object. Current values are recorded in
// openspec/changes/redesign-futuristic-ui/tasks.md (task 2.4).
const REPORT_ONLY_PAIRS: Pair[] = [
  ['--border', '--background', '静态分隔线 / 页面底色'],
  ['--input', '--background', '输入框描边 / 页面底色'],
  ['--sidebar-border', '--sidebar', '侧边栏分隔线 / 侧边栏底'],
  ['--skeleton-highlight', '--skeleton-base', '骨架屏 shimmer / 骨架基色'],
  ['--table-header', '--background', '表头底纹 / 页面底色'],
  ['--table-disabled', '--background', '禁用行底纹 / 页面底色'],
]

// A preset layer redeclares only the accent family; surfaces such as
// --background and --card stay inherited from the default mode block. So
// rewriting the default surfaces changes every preset's accent-on-surface
// relationship, which is what these pairs guard.
const PRESET_SURFACE_PAIRS: Pair[] = [
  ['--primary', '--background', '预设主色 / 继承的页面底色'],
  ['--ring', '--background', '预设焦点环 / 继承的页面底色'],
  ['--chart-1', '--card', '预设图表 1 / 继承的卡片底'],
  ['--chart-2', '--card', '预设图表 2 / 继承的卡片底'],
  ['--chart-3', '--card', '预设图表 3 / 继承的卡片底'],
  ['--chart-4', '--card', '预设图表 4 / 继承的卡片底'],
  ['--chart-5', '--card', '预设图表 5 / 继承的卡片底'],
  ['--sidebar-ring', '--sidebar', '预设侧栏焦点环 / 继承的侧栏底'],
  [
    '--sidebar-accent-foreground',
    '--sidebar-accent',
    '预设侧栏强调文字 / 强调底',
  ],
]

const PRESET_INTERNAL_PAIRS: Pair[] = [
  ['--primary-foreground', '--primary', '预设主按钮文字 / 预设主色'],
  [
    '--sidebar-primary-foreground',
    '--sidebar-primary',
    '预设侧栏主按钮文字 / 主色',
  ],
]

// Pre-existing debt inside preset-owned pairs — both sides come from the
// preset, so this change does not own those values. Measured 2026-09-30 at
// goapi 6286f78b0. This list is a ratchet: a new offender fails, fixing one
// means deleting its entry.
const PRESET_INTERNAL_DEBT: string[] = [
  'anthropic/light/--primary-foreground',
  'anthropic/light/--sidebar-primary-foreground',
  'forest-whisper/dark/--primary-foreground',
  'forest-whisper/dark/--sidebar-primary-foreground',
  'lavender-dream/dark/--primary-foreground',
  'lavender-dream/dark/--sidebar-primary-foreground',
  'ocean-breeze/dark/--primary-foreground',
  'ocean-breeze/dark/--sidebar-primary-foreground',
  'rose-garden/dark/--primary-foreground',
  'rose-garden/dark/--sidebar-primary-foreground',
  'sunset-glow/dark/--primary-foreground',
  'sunset-glow/dark/--sidebar-primary-foreground',
]

type Measurement = { label: string; fgToken: string; bgToken: string; ratio: number | null }

function measure(declarations: Map<string, string>, pairs: Pair[]): Measurement[] {
  return pairs.map(([fgToken, bgToken, label]) => {
    const fg = resolve(fgToken, declarations)
    const bg = resolve(bgToken, declarations)
    return {
      label,
      fgToken,
      bgToken,
      ratio: fg && bg ? contrast(fg, bg) : null,
    }
  })
}

function formatFailures(
  declarations: Map<string, string>,
  minimum: number,
  measurements: Measurement[]
): string[] {
  return measurements
    .filter((m) => m.ratio === null || m.ratio < minimum)
    .map((m) =>
      m.ratio === null
        ? `${m.label}: 无法解析 ${m.fgToken} 或 ${m.bgToken}`
        : `${m.label}: ${m.fgToken}=${declarations.get(m.fgToken)} / ${m.bgToken}=${declarations.get(m.bgToken)} → ${m.ratio.toFixed(2)}:1 (需 ≥ ${minimum}:1)`
    )
}

function formatTable(measurements: Measurement[]): string {
  return measurements
    .map((m) => `  ${m.ratio === null ? ' n/a ' : m.ratio.toFixed(2)}:1  ${m.label}`)
    .join('\n')
}

function defaultLayer(dark: boolean): Map<string, string> {
  return parseDeclarations(extractBlock(themeCss, dark ? '.dark' : ':root'))
}

function mergeLayer(
  base: Map<string, string>,
  override: Map<string, string>
): Map<string, string> {
  // Resolution must run against the merged view: a preset declares only the
  // accent family, and its own value must win over the default declaration.
  return new Map([...base, ...override])
}

function presetLayer(name: string, dark: boolean): Map<string, string> {
  const selector = dark
    ? `.dark [data-theme-preset='${name}']`
    : `[data-theme-preset='${name}']`
  return parseDeclarations(extractBlock(presetsCss, selector))
}

const presetNames = [
  ...new Set(
    [...presetsCss.matchAll(/^\[data-theme-preset='([a-z0-9-]+)'\] \{/gm)]
      .map((m) => m[1])
      .filter((n): n is string => Boolean(n))
  ),
]

const MODES = [
  ['light', false],
  ['dark', true],
] as const

describe('WCAG ratio math', () => {
  const gray = (l: number): Color => ({ l, c: 0, h: 0, alpha: 1 })

  it('matches published reference values', () => {
    const white = gray(1)
    expect(contrast(white, gray(0))).closeTo(21, 0.05)
    expect(contrast(white, white)).closeTo(1, 0.001)
    // Neutral L=0.5 is linear Y=0.125, so white on it is exactly 1.05/0.175.
    // A gamma-vs-linear mistake yields 2.5 instead of 6.
    expect(contrast(white, gray(0.5))).closeTo(6, 0.02)
    // #767676 on #ffffff is the canonical 4.54:1 AA boundary.
    expect(contrast(gray(0.5656), white)).closeTo(4.54, 0.05)
    // oklch(0.49 0 0) is #5b5b5b, not #737373.
    expect(contrast(gray(0.49), white)).closeTo(6.26, 0.05)
  })

  it('composites translucent tokens over their background', () => {
    const translucent = { l: 1, c: 0, h: 0, alpha: 0.14 }
    const onDark = contrast(translucent, gray(0.16))
    expect(onDark).toBeGreaterThan(1)
    expect(onDark).toBeLessThan(21)
  })
})

describe('default theme token contrast (WCAG 2.1 AA)', () => {
  it.each(MODES)('%s body text pairs reach 4.5:1', (_mode, dark) => {
    const declarations = defaultLayer(dark)
    const measurements = measure(declarations, BODY_PAIRS)
    expect(
      formatFailures(declarations, 4.5, measurements),
      `正文对比度不足：\n${formatTable(measurements)}`
    ).toEqual([])
  })

  it.each(MODES)('%s key non-text graphics reach 3:1', (_mode, dark) => {
    const declarations = defaultLayer(dark)
    const measurements = measure(declarations, KEY_GRAPHICS_PAIRS)
    expect(
      formatFailures(declarations, 3, measurements),
      `关键图形对比度不足：\n${formatTable(measurements)}`
    ).toEqual([])
  })

  it('keeps the ungated soft-surface tokens resolvable', () => {
    for (const [, dark] of MODES) {
      const declarations = defaultLayer(dark)
      const unresolvable = measure(declarations, REPORT_ONLY_PAIRS).filter(
        (m) => m.ratio === null
      )
      expect(
        formatFailures(declarations, 0, unresolvable),
        '仅报告项也必须能解析，否则说明令牌缺失'
      ).toEqual([])
    }
  })

  it('resolves color-mix derived tokens instead of skipping them', () => {
    const declarations = defaultLayer(false)
    for (const token of ['--accent', '--sidebar', '--table-header']) {
      expect(resolve(token, declarations), `${token} 应可解析`).not.toBeNull()
    }
  })
})

describe('theme presets against the rewritten default surfaces', () => {
  it('discovers every colour-bearing preset layer', () => {
    // 9 presets x light/dark.
    expect(presetNames.length).toBeGreaterThanOrEqual(9)
  })

  it.each(presetNames)('%s accent family stays readable (light)', (name) => {
    const merged = mergeLayer(defaultLayer(false), presetLayer(name, false))
    const measurements = measure(merged, PRESET_SURFACE_PAIRS)
    expect(
      formatFailures(merged, 3, measurements),
      `${name} 亮色预设与新底色不达标：\n${formatTable(measurements)}`
    ).toEqual([])
  })

  it.each(presetNames)('%s accent family stays readable (dark)', (name) => {
    const merged = mergeLayer(defaultLayer(true), presetLayer(name, true))
    const measurements = measure(merged, PRESET_SURFACE_PAIRS)
    expect(
      formatFailures(merged, 3, measurements),
      `${name} 暗色预设与新底色不达标：\n${formatTable(measurements)}`
    ).toEqual([])
  })

  it('keeps preset-internal contrast debt from growing', () => {
    const offenders: string[] = []
    for (const name of presetNames) {
      for (const [, dark] of MODES) {
        const merged = mergeLayer(defaultLayer(dark), presetLayer(name, dark))
        for (const m of measure(merged, PRESET_INTERNAL_PAIRS)) {
          if (m.ratio !== null && m.ratio < 4.5) {
            offenders.push(`${name}/${dark ? 'dark' : 'light'}/${m.fgToken}`)
          }
        }
      }
    }
    offenders.sort()
    expect(offenders).toEqual([...PRESET_INTERNAL_DEBT].sort())
  })
})
