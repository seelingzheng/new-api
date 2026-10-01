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
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Stats } from '../components/sections/stats'

/*
Regression guard: a requestAnimationFrame callback receives the frame's start
timestamp, which can be earlier than the performance.now() sampled right before
it was scheduled. Without a lower clamp the progress ratio goes negative and the
count-up renders values such as "-2+" for the first frames.
*/

let callbacks: FrameRequestCallback[] = []

beforeEach(() => {
  callbacks = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    callbacks.push(cb)
    return callbacks.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      private readonly cb: IntersectionObserverCallback
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb
      }
      observe(target: Element) {
        this.cb([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
  )
  vi.stubGlobal(
    'matchMedia',
    () =>
      ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function counterNodes(): HTMLElement[] {
  return [...document.querySelectorAll('span.tabular-nums')] as HTMLElement[]
}

describe('Stats count-up', () => {
  it('never renders a negative value when the first frame is timestamped early', () => {
    render(<Stats />)
    expect(callbacks.length).toBeGreaterThan(0)

    // Deliver a timestamp from before the animation was scheduled.
    const early = performance.now() - 500
    for (const cb of callbacks.splice(0, callbacks.length)) cb(early)

    const nodes = counterNodes()
    expect(nodes.length).toBeGreaterThan(0)
    const texts = nodes.map((n) => n.textContent ?? '')
    expect(texts.some((t) => t.includes('-'))).toBe(false)
    expect(screen.queryByText(/-/)).toBeNull()
  })

  it('reaches the target value once the animation completes', () => {
    render(<Stats />)
    const start = performance.now()
    for (let elapsed = 0; elapsed <= 2000; elapsed += 200) {
      for (const cb of callbacks.splice(0, callbacks.length)) cb(start + elapsed)
    }
    const texts = counterNodes().map((n) => n.textContent ?? '')
    expect(texts).toContain('50+')
    expect(texts).toContain('100+')
  })
})
