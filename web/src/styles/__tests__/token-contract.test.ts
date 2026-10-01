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
Structural contract for the token layer (OpenSpec: frontend-theme-system,
"亮暗两套默认令牌成对自洽" and "既有主题预设仍可覆盖新默认").

jsdom does not apply the CSS cascade, so "cancel a preset and the default
returns" cannot be proven by rendering. It is proven structurally instead:
every colour Tailwind exposes resolves in both modes, and no preset invents a
semantic colour the defaults never declare — which is the only way a preset
can leave a dangling value behind once it is switched off.
*/

// Same resolution strategy as contrast.test.ts: vitest puts the frontend
// project root in cwd, and jsdom rewrites import.meta.url off the file scheme.
function styleFile(name: string): string {
  const file = path.resolve(process.cwd(), 'src/styles', name)
  if (!existsSync(file)) throw new Error(`expected stylesheet: ${file}`)
  return file
}

const themeCss = readFileSync(styleFile('theme.css'), 'utf8')
const presetsCss = readFileSync(styleFile('theme-presets.css'), 'utf8')

function blockFor(css: string, selector: string): string {
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

function tokensIn(block: string): Set<string> {
  const stripped = block.replaceAll(/\/\*[\s\S]*?\*\//g, '')
  return new Set(
    [...stripped.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1])
  )
}

const lightTokens = tokensIn(blockFor(themeCss, ':root'))
const darkTokens = tokensIn(blockFor(themeCss, '.dark'))

// The public contract is what @theme inline exposes to Tailwind: every
// `--color-*` mapping names a semantic token that must resolve in both modes.
// Structural tokens (--radius, --font-body, --app-*) intentionally live only
// in :root, so parity is measured over the mapped colour set, not over every
// declaration in the block.
const mappedColorTokens = [
  ...blockFor(themeCss, '@theme inline').matchAll(
    /--color-[a-z0-9-]+:\s*var\((--[a-z0-9-]+)\)/g
  ),
].map((m) => m[1])

const presetSelectors = [
  ...presetsCss.matchAll(
    /^(\.dark )?\[data-theme-preset='([a-z0-9-]+)'\] \{/gm
  ),
]

const COLOR_TOKEN =
  /^--(primary|secondary|muted|accent|card|popover|background|foreground|border|input|ring|sidebar|chart|destructive|success|warning|info|neutral|overview|table|skeleton)/

describe('design token structural contract', () => {
  it('exposes a meaningful mapped colour set to Tailwind', () => {
    expect(mappedColorTokens.length).toBeGreaterThan(20)
  })

  it('declares every mapped semantic colour in light and dark', () => {
    const missingInLight = mappedColorTokens.filter((t) => !lightTokens.has(t))
    const missingInDark = mappedColorTokens.filter((t) => !darkTokens.has(t))
    expect(
      { missingInLight, missingInDark },
      'Tailwind 暴露的每个语义色都必须在两套默认主题里有真值'
    ).toEqual({ missingInLight: [], missingInDark: [] })
  })

  it('keeps colour tokens paired across the two modes', () => {
    const colours = (set: Set<string>): string[] =>
      [...set].filter((t) => COLOR_TOKEN.test(t))
    const lightOnly = colours(lightTokens).filter((t) => !darkTokens.has(t))
    const darkOnly = colours(darkTokens).filter((t) => !lightTokens.has(t))
    expect(
      { lightOnly, darkOnly },
      '颜色令牌必须成对声明，否则另一模式下会悬空继承'
    ).toEqual({ lightOnly: [], darkOnly: [] })
  })

  it('discovers the preset layers that override colours', () => {
    const colourLayers = presetSelectors.filter(([, dark, name]) => {
      const selector = dark
        ? `.dark [data-theme-preset='${name}']`
        : `[data-theme-preset='${name}']`
      return [...tokensIn(blockFor(presetsCss, selector))].some((t) =>
        COLOR_TOKEN.test(t)
      )
    })
    // 9 presets x 2 modes, all of which redeclare the accent family.
    expect(colourLayers.length).toBeGreaterThanOrEqual(18)
  })

  it('keeps presets from inventing semantic colours', () => {
    for (const [, dark, name] of presetSelectors) {
      const selector = dark
        ? `.dark [data-theme-preset='${name}']`
        : `[data-theme-preset='${name}']`
      const invented = [...tokensIn(blockFor(presetsCss, selector))].filter(
        (t) => COLOR_TOKEN.test(t) && !lightTokens.has(t) && !darkTokens.has(t)
      )
      expect(
        invented,
        `${selector} 发明了默认主题不存在的颜色令牌，关掉预设后会留下悬空值`
      ).toEqual([])
    }
  })
})
