import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getCities, searchListings, type SearchParams } from './listings'

export function useListingSearch(params: SearchParams) {
  return useQuery({
    queryKey: ['listings', 'search', params],
    queryFn: ({ signal }) => searchListings(params, signal),
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

export function useCities() {
  return useQuery({
    queryKey: ['listings', 'cities'],
    queryFn: ({ signal }) => getCities(signal),
    staleTime: Infinity,
  })
}
