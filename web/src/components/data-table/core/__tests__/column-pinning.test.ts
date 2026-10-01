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
import { describe, expect, it } from 'vitest'

import { getResolvedColumnClassName } from '../column-pinning'

function pinnedClass(side: 'left' | 'right', kind: 'header' | 'cell') {
  const resolve = getResolvedColumnClassName(undefined, [
    { columnId: 'name', side },
  ])
  return resolve?.('name', kind) ?? ''
}

describe('pinned column edge shadow', () => {
  it('keeps an edge shadow on both pinned sides', () => {
    expect(pinnedClass('left', 'cell')).toMatch(/shadow-\[.+\]/)
    expect(pinnedClass('right', 'cell')).toMatch(/shadow-\[.+\]/)
  })

  it('does not wrap color tokens in the legacy hsl()/rgb() triplet form', () => {
    // Color tokens are authored as oklch(), so hsl(var(--x)) is invalid CSS and
    // the browser drops the whole box-shadow.
    expect(pinnedClass('left', 'cell')).not.toMatch(/(?:hsl|rgb)\(var\(--/)
    expect(pinnedClass('right', 'cell')).not.toMatch(/(?:hsl|rgb)\(var\(--/)
  })
})
