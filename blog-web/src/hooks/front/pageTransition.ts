import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'

import { publicContentQueryKeys } from '@/queries/publicContent'
import { parsePublicArticleFilters } from '@/utils/publicArticleFilters'

const getRouteMainQueryKey = (
  pathname: string,
  search: string,
): QueryKey | null => {
  if (pathname === '/') return publicContentQueryKeys.home()

  if (pathname === '/articles') {
    return publicContentQueryKeys.page(
      parsePublicArticleFilters(new URLSearchParams(search)),
    )
  }

  const detailMatch = pathname.match(/^\/articles\/([^/]+)$/)
  if (!detailMatch) return null

  const id = Number(detailMatch[1])
  return Number.isInteger(id) && id > 0
    ? publicContentQueryKeys.detail(id)
    : null
}

export const useCurrentPublicPageWaiting = () => {
  const { pathname, search } = useLocation()
  const queryClient = useQueryClient()
  const queryKey = useMemo(
    () => getRouteMainQueryKey(pathname, search),
    [pathname, search],
  )
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!queryKey) return () => undefined

      const queryCache = queryClient.getQueryCache()
      return queryCache.subscribe((event) => {
        const currentQuery = queryCache.find({ queryKey, exact: true })
        if (event.query === currentQuery) listener()
      })
    },
    [queryClient, queryKey],
  )
  const getSnapshot = useCallback(() => {
    if (!queryKey) return false
    const state = queryClient.getQueryState(queryKey)
    return state === undefined || state.fetchStatus === 'fetching'
  }, [queryClient, queryKey])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
