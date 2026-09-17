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
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Markdown } from '../markdown'

const mathDocument = ['```math', 'E = mc^2', '```'].join('\n')

describe('Markdown math rendering', () => {
  it('renders a placeholder first and upgrades it once the KaTeX chunk lands', async () => {
    const { container } = render(<Markdown>{mathDocument}</Markdown>)

    // The 271 KB KaTeX chunk must not be part of the synchronous render path.
    expect(container.querySelector('.katex-pending')).not.toBeNull()

    await waitFor(() => {
      expect(container.querySelector('.katex')).not.toBeNull()
    })
    expect(container.querySelector('.katex-pending')).toBeNull()
  })

  it('does not touch KaTeX for documents without math', () => {
    const { container } = render(<Markdown># Just a heading</Markdown>)
    expect(container.querySelector('.katex-pending')).toBeNull()
    expect(container.querySelector('h1')?.textContent).toBe('Just a heading')
  })
})
