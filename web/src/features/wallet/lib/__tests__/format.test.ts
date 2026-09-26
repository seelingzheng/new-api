import { describe, expect, it } from 'vitest'

import { formatCurrency } from '../format'

describe('formatCurrency', () => {
  it('prefixes wallet payment amounts with the USD symbol', () => {
    expect(formatCurrency(10)).toBe('$10')
    expect(formatCurrency(0.125)).toBe('$0.125')
  })

  it('returns a placeholder for non-finite amounts', () => {
    expect(formatCurrency(Number.NaN)).toBe('-')
  })
})
