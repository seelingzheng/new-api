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
import { QueryCache, QueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import i18next from 'i18next'
import { toast } from 'sonner'

import { handleServerError } from '@/lib/handle-server-error'

/**
 * Boot requests were previously issued from three independent places
 * (`main.tsx` branding, `__root.tsx` system config, `useStatus()`), each
 * firing its own `/api/status` call. `/api/status` is `no-store` and measured
 * 1.1-7.2s TTFB, so every duplicate cost a full round trip before first paint.
 *
 * Sharing one key through one QueryClient collapses them into a single request.
 */
export const STATUS_QUERY_KEY = ['status'] as const

/** `/api/status` is public system configuration; 5 minutes matches useStatus. */
export const STATUS_STALE_TIME = 5 * 60 * 1000

/**
 * Set by `main.tsx` once the router exists, so a 500 can redirect without this
 * module having to import the router (which would create a cycle).
 */
let navigateToServerError: (() => void) | null = null

export function setQueryErrorNavigator(navigate: () => void): void {
  navigateToServerError = navigate
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // eslint-disable-next-line no-console
        if (import.meta.env.DEV) console.log({ failureCount, error })

        if (failureCount >= 0 && import.meta.env.DEV) return false
        if (failureCount > 3 && import.meta.env.PROD) return false

        return !(
          error instanceof AxiosError &&
          [401, 403].includes(error.response?.status ?? 0)
        )
      },
      // Keep focused tabs from silently re-running heavy pages like logs.
      refetchOnWindowFocus: false,
      staleTime: 10 * 1000, // 10s
    },
    mutations: {
      onError: (error) => {
        handleServerError(error)

        if (error instanceof AxiosError) {
          if (error.response?.status === 304) {
            toast.error(i18next.t('Content not modified!'))
          }
        }
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof AxiosError) {
        if (error.response?.status === 500) {
          toast.error(i18next.t('Internal Server Error!'))
          navigateToServerError?.()
        }
      }
    },
  }),
})
