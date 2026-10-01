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
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SpaceField } from '../space-field'

/*
Behaviour contract for the ambient backdrop (OpenSpec: ambient-background-fx).

Screenshots cannot verify this layer in this environment — the available
browser surfaces report a zero-size viewport — so the contract is asserted
against a recording 2D context instead. Frames are driven manually: no timers,
no sleeps, no reliance on real animation.
*/

interface DrawRecorder {
  arcCalls: number
  strokeCalls: number
  clears: number
  setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => void
  clearRect: () => void
  beginPath: () => void
  moveTo: () => void
  lineTo: () => void
  stroke: () => void
  fill: () => void
  arc: () => void
  getImageData: () => { data: Uint8ClampedArray }
  fillRect: () => void
  fillStyle: string
  strokeStyle: string
  lineWidth: number
}

function createRecorder(): DrawRecorder {
  return {
    arcCalls: 0,
    strokeCalls: 0,
    clears: 0,
    setTransform: () => {},
    clearRect() {
      this.clears += 1
    },
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke() {
      this.strokeCalls += 1
    },
    fill: () => {},
    arc() {
      this.arcCalls += 1
    },
    getImageData: () => ({ data: new Uint8ClampedArray([1, 2, 3, 255]) }),
    fillRect: () => {},
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  }
}

let recorder: DrawRecorder
let frames = new Map<number, FrameRequestCallback>()
let nextFrameId = 1
let cancelledIds: number[] = []
let reducedMotion = false

function stepFrames(count: number) {
  for (let n = 0; n < count; n += 1) {
    const queued = [...frames.entries()]
    frames.clear()
    for (const [, frame] of queued) frame(performance.now())
  }
}

beforeEach(() => {
  recorder = createRecorder()
  reducedMotion = false

  frames = new Map()
  nextFrameId = 1
  cancelledIds = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = nextFrameId
    nextFrameId += 1
    frames.set(id, cb)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    cancelledIds.push(id)
    frames.delete(id)
  })
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: query.includes('reduced-motion') && reducedMotion,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => recorder as unknown as CanvasRenderingContext2D
  )
  Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true })
  Object.defineProperty(window, 'devicePixelRatio', {
    value: 2,
    configurable: true,
  })
  Object.defineProperty(document, 'hidden', {
    value: false,
    configurable: true,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('SpaceField', () => {
  it('renders as a decorative, non-focusable layer', () => {
    const { container } = render(<SpaceField />)
    const field = container.querySelector<HTMLElement>('.space-field')
    expect(field).not.toBeNull()
    expect(field?.getAttribute('aria-hidden')).toBe('true')
    expect(field?.className).toContain('pointer-events-none')
    expect(field?.querySelector('[tabindex]')).toBeNull()
    expect(field?.querySelector('a, button, input')).toBeNull()
  })

  it('does not start the loop when motion is reduced', () => {
    reducedMotion = true
    const { container } = render(<SpaceField />)
    expect(container.querySelector('canvas')).toBeNull()
    expect(frames.size).toBe(0)
  })

  it('sizes the canvas to the viewport and paints one node per particle', () => {
    const { container } = render(<SpaceField />)
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    // 1440x900 at DPR 2, capped at MAX_PIXEL_RATIO.
    expect(canvas?.width).toBe(2880)
    expect(canvas?.height).toBe(1800)

    stepFrames(1)
    // Desktop density: 130 nodes, drawn once per frame.
    expect(recorder.arcCalls).toBe(130)
    expect(recorder.clears).toBe(1)
  })

  it('draws proximity links between neighbouring nodes', () => {
    render(<SpaceField />)
    stepFrames(1)
    // Not every pair is within range, so links must be non-zero but bounded by
    // the linear neighbour window rather than an O(n²) sweep.
    expect(recorder.strokeCalls).toBeGreaterThan(0)
    expect(recorder.strokeCalls).toBeLessThan(130 * 20)
  })

  it('skips painting while the tab is hidden', () => {
    const { container } = render(<SpaceField />)
    stepFrames(1)
    const painted = recorder.arcCalls
    expect(painted).toBeGreaterThan(0)

    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    const canvas = container.querySelector('canvas')
    const before = canvas?.width
    act(() => stepFrames(3))
    expect(recorder.arcCalls).toBe(painted)
    expect(canvas?.width).toBe(before)
  })

  it('cancels the pending frame and stops painting after unmount', () => {
    const { unmount } = render(<SpaceField />)
    stepFrames(2)
    const painted = recorder.arcCalls
    expect(painted).toBeGreaterThan(0)

    unmount()
    expect(cancelledIds.length).toBeGreaterThan(0)
    // Whatever is still queued must not paint again.
    stepFrames(3)
    expect(recorder.arcCalls).toBe(painted)
  })
})
