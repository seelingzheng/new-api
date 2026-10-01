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
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

// Structural half of the mobile contract. Pixel sizing and real focus
// behaviour are measured in a browser by scripts/audit-mobile-targets.mjs;
// jsdom has no layout, so asserting 44x44 here would only prove the test
// can read a string.
function read(...segments: string[]) {
  const source = readFileSync(
    `${process.cwd()}/src/${segments.join('/')}`,
    'utf8'
  )
  return source.replaceAll(/\s+/g, ' ')
}

describe('public layout mobile contract', () => {
  it('contains horizontal overflow so wide decoration cannot scroll the page', () => {
    expect(read('components/layout/components/public-layout.tsx')).toContain(
      'overflow-x-clip'
    )
  })

  it('declares the collapsed state of the navigation trigger', () => {
    const source = read('components/layout/components/public-header.tsx')
    expect(source).toMatch(/aria-expanded=\{mobileOpen\}/)
    expect(source).toMatch(/aria-controls=\{MOBILE_NAV_ID\}/)
  })

  it('removes the collapsed mobile panel from the tab order', () => {
    expect(read('components/layout/components/public-header.tsx')).toMatch(
      /inert=\{!mobileOpen\}/
    )
  })
})
