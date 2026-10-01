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
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/*
Visual-system contract for OpenSpec task 3.7.

The public data pages must inherit the active semantic token palette. A fixed
Tailwind colour such as `text-amber-600` bypasses the default theme and every
preset; an inline oklch aurora does the same. This test scans source rather than
DOM class snapshots because the requirement applies across three route trees
and jsdom does not evaluate the compiled Tailwind stylesheet.
*/

const PUBLIC_FEATURES = ['pricing', 'rankings', 'about'] as const
const PALETTE_UTILITY =
  /(?:text|bg|border|from|via|to|ring|shadow)-(?:blue|sky|indigo|violet|purple|fuchsia|pink|rose|red|orange|amber|yellow|lime|green|emerald|teal|cyan)-\d{2,3}/g

function sourceRoot(): string {
  return path.resolve(process.cwd(), 'src/features')
}

function sourceFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') files.push(...sourceFiles(full))
      continue
    }
    if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

describe('public page token contract', () => {
  it('uses semantic tokens instead of fixed Tailwind palette utilities', () => {
    const violations: string[] = []
    for (const feature of PUBLIC_FEATURES) {
      const root = path.join(sourceRoot(), feature)
      for (const file of sourceFiles(root)) {
        const source = readFileSync(file, 'utf8')
        for (const match of source.matchAll(PALETTE_UTILITY)) {
          const line = source.slice(0, match.index).split('\n').length
          violations.push(
            `${path.relative(process.cwd(), file)}:${line} ${match[0]}`
          )
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('uses the shared token-driven aurora on rankings', () => {
    const source = readFileSync(
      path.join(sourceRoot(), 'rankings/index.tsx'),
      'utf8'
    )
    expect(source).toContain("className='hero-aurora")
    expect(source).not.toContain('oklch(')
  })
})
