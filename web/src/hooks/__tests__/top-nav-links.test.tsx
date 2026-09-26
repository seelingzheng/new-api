import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { STATUS_QUERY_KEY } from '@/lib/query-client'
import { useAuthStore } from '@/stores/auth-store'

import { useTopNavLinks } from '../use-top-nav-links'

afterEach(() => {
  cleanup()
  useAuthStore.getState().auth.reset()
})

function renderTopNavLinks(status: Record<string, unknown>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(STATUS_QUERY_KEY, status)
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'alice',
    role: 1,
  })

  function Wrapper(props: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {props.children}
      </QueryClientProvider>
    )
  }

  return renderHook(() => useTopNavLinks(), { wrapper: Wrapper })
}

describe('authenticated top navigation', () => {
  it('places the self-hosted usage docs after the model square', () => {
    const { result } = renderTopNavLinks({
      HeaderNavModules: JSON.stringify({
        home: true,
        console: true,
        pricing: true,
        rankings: false,
        docs: false,
        about: false,
      }),
      docs_link: 'https://docs.newapi.pro',
    })

    expect(result.current.map((link) => link.href)).toEqual([
      '/',
      '/dashboard',
      '/pricing',
      '/docs/usedocs.html',
    ])
    expect(result.current[3]).toMatchObject({
      title: 'Usage Docs',
      external: true,
    })
  })
})
