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
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PublicHeader } from '@/components/layout/components/public-header'

import { HOME_NAV_LINKS } from '../constants'

vi.mock('@/components/dialog', () => ({ Dialog: () => null }))
vi.mock('@/components/language-switcher', () => ({
  LanguageSwitcher: () => null,
}))
vi.mock('@/components/notification-popover', () => ({
  NotificationPopover: () => null,
}))
vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => null,
}))
vi.mock('@/components/theme-switch', () => ({ ThemeSwitch: () => null }))
vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => ({
    activeTab: 'notice',
    announcements: [],
    loading: false,
    notice: '',
    popoverOpen: false,
    setActiveTab: vi.fn(),
    setPopoverOpen: vi.fn(),
    unreadCount: 0,
  }),
}))
vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({
    loading: false,
    logo: '',
    logoLoaded: true,
    systemName: 'New API',
  }),
}))
vi.mock('@/hooks/use-top-nav-links', () => ({
  useTopNavLinks: () => [{ title: 'About', href: '/about' }],
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({ auth: { user: null } }),
}))

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

function createNavigationRouter() {
  const rootRoute = createRootRoute({
    component: () => (
      <PublicHeader
        logo={<span>brand</span>}
        navLinks={[...HOME_NAV_LINKS]}
        preferCustomNavLinks
        showAuthButtons={false}
        showLanguageSwitcher={false}
        showNotifications={false}
        showThemeSwitch={false}
      />
    ),
  })
  const makeDestination = (path: '/' | '/dashboard' | '/pricing') =>
    createRoute({
      component: () => <div />,
      getParentRoute: () => rootRoute,
      path,
    })

  return createRouter({
    history: createMemoryHistory({ initialEntries: ['/'] }),
    routeTree: rootRoute.addChildren([
      makeDestination('/'),
      makeDestination('/dashboard'),
      makeDestination('/pricing'),
    ]),
  })
}

describe('homepage primary navigation', () => {
  it('defines exactly the three internal product routes in order', () => {
    expect(HOME_NAV_LINKS).toEqual([
      { title: 'Home', href: '/' },
      { title: 'Console', href: '/dashboard' },
      { title: 'Model Square', href: '/pricing' },
    ])
    expect(HOME_NAV_LINKS.every((link) => !('external' in link))).toBe(true)
    expect(HOME_NAV_LINKS.some((link) => link.href.startsWith('#'))).toBe(false)
  })

  it('keeps backend dynamic links out of the homepage primary navigation', async () => {
    const router = createNavigationRouter()
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'Home' })).toHaveLength(2)
    })

    for (const [title, href] of [
      ['Home', '/'],
      ['Console', '/dashboard'],
      ['Model Square', '/pricing'],
    ] as const) {
      const links = screen.getAllByRole('link', { name: title })
      expect(links).toHaveLength(2)
      expect(links[0]).toHaveAttribute('href', href)
      expect(links[1]).toHaveAttribute('href', href)
    }
    expect(
      screen.queryByRole('link', { name: 'About' })
    ).not.toBeInTheDocument()
  })

  it('uses the same internal links in the mobile menu and closes after navigation', async () => {
    const user = userEvent.setup()
    const router = createNavigationRouter()
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Toggle navigation menu' })
      ).toBeInTheDocument()
    })
    await user.click(
      screen.getByRole('button', { name: 'Toggle navigation menu' })
    )
    expect(document.body.style.overflow).toBe('hidden')

    const mobileNavigation = screen
      .getAllByRole('navigation')
      .find((navigation) => navigation.classList.contains('flex-col'))
    expect(mobileNavigation).toBeDefined()
    const consoleLink = within(mobileNavigation as HTMLElement).getByRole(
      'link',
      {
        name: 'Console',
      }
    )
    expect(consoleLink).toHaveAttribute('href', '/dashboard')

    await user.click(consoleLink)
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/dashboard')
    )
    await waitFor(() => expect(document.body.style.overflow).toBe(''))
  })
})
