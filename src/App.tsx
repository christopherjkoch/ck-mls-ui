import { useEffect, useState } from 'react'
import { ApiError, fromQueryString, toQueryString, type SearchParams } from './api/listings'
import { useCities, useListingSearch } from './api/queries'
import { SearchForm } from './components/SearchForm'
import { SearchResults } from './components/SearchResults'

export default function App() {
  const [params, setParams] = useState<SearchParams>(() => fromQueryString(window.location.search))

  // Mirror the search in the URL so refresh and shared links restore it.
  useEffect(() => {
    window.history.replaceState(null, '', `?${toQueryString(params)}`)
  }, [params])

  const search = useListingSearch(params)
  const cities = useCities()
  const fieldErrors = search.error instanceof ApiError ? search.error.fieldErrors : {}

  return (
    <main>
      <h1>Listing Search</h1>
      <SearchForm
        initialFilters={params}
        cities={cities.data ?? []}
        fieldErrors={fieldErrors}
        isSearching={search.isFetching}
        onSearch={(filters) => setParams({ ...filters, page: 1 })}
      />
      <hr />
      <SearchResults query={search} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />
    </main>
  )
}
