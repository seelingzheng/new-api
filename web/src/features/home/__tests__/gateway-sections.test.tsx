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
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Gateway, Hero, HowItWorks } from '../components'

vi.mock('@/components/animate-in-view', () => ({
  AnimateInView: (props: { children: React.ReactNode }) => props.children,
}))

afterEach(cleanup)

function renderSections() {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Hero />
        <Gateway />
        <HowItWorks />
      </>
    ),
  })
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ['/'] }),
    routeTree: rootRoute.addChildren([
      createRoute({
        component: () => <div />,
        getParentRoute: () => rootRoute,
        path: '/',
      }),
    ]),
  })

  render(<RouterProvider router={router} />)
}

describe('homepage gateway sections', () => {
  it('keeps the NexToken logo at the center of the routing card', async () => {
    renderSections()

    await waitFor(() => {
      expect(
        document.querySelector(
          '.nextoken-hub-core img[src="/nextoken-logo.png"]'
        )
      ).toBeInTheDocument()
    })
  })

  it('lists every supported vendor once per marquee row', async () => {
    renderSections()

    const vendors = [
      '通义千问',
      'DeepSeek',
      'Google Gemini',
      'Anthropic',
      'OpenAI',
      '智谱 GLM',
    ]

    await waitFor(() => {
      expect(screen.getAllByRole('button')).toHaveLength(1)
    })

    const zone = document.querySelector('.nextoken-vendor-zone')
    expect(zone).toBeTruthy()

    // Two rows, each duplicated once so the marquee can loop seamlessly.
    const chips = [...(zone?.querySelectorAll('.nextoken-vendor-chip') ?? [])]
    expect(chips).toHaveLength(24)
    expect(
      chips.filter((chip) => !chip.closest('[aria-hidden="true"]'))
    ).toHaveLength(12)

    for (const vendor of vendors) {
      expect(
        within(zone as HTMLElement).getAllByText(vendor, {
          selector: '.nextoken-vendor-chip',
        })
      ).toHaveLength(4)
    }
  })

  it('renders the three onboarding steps with their numbered badges', async () => {
    renderSections()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: '3 steps to get started' })
      ).toBeInTheDocument()
    })

    expect(document.querySelectorAll('.nextoken-step-number')).toHaveLength(3)
    expect(screen.getByText('Register and top up')).toBeInTheDocument()
  })
})
