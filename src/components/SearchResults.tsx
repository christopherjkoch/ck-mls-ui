import type { UseQueryResult } from '@tanstack/react-query'
import { ApiError, type SearchResponse } from '../api/listings'
import { Pagination } from './Pagination'

interface Props {
  query: UseQueryResult<SearchResponse, Error>
  onPageChange: (page: number) => void
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const subScore = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export function SearchResults({ query, onPageChange }: Props) {
  if (query.isPending) return <p role="status">Loading listings…</p>

  if (query.isError) return <ErrorPanel error={query.error} />

  const data = query.data
  if (data.totalCount === 0) {
    return (
      <p role="status">
        No listings match your filters. Try widening the price range, lowering bedrooms, or removing the keyword.
      </p>
    )
  }

  const firstRank = (data.page - 1) * data.pageSize + 1
  const lastRank = firstRank + data.items.length - 1

  return (
    <section aria-busy={query.isFetching}>
      <p role="status">
        {query.isFetching
          ? 'Loading…'
          : `Showing ${firstRank}–${lastRank} of ${data.totalCount} listings, ranked by relevance.`}
      </p>
      <table border={1} cellPadding={4}>
        <thead>
          <tr>
            <th>#</th>
            <th>Address</th>
            <th>Price</th>
            <th>Beds</th>
            <th>Baths</th>
            <th>Sq ft</th>
            <th>Listed</th>
            <th>Status</th>
            <th>Relevance</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={item.id}>
              <td>{firstRank + i}</td>
              <td title={item.description}>
                {item.address}
                <br />
                <small>
                  {item.city}, {item.state} {item.zip}
                </small>
              </td>
              <td>{currency.format(item.price)}</td>
              <td>{item.bedrooms}</td>
              <td>{item.bathrooms}</td>
              <td>{item.sqft.toLocaleString('en-US')}</td>
              <td>{item.listedDate}</td>
              <td>{item.status}</td>
              <td>
                <strong>{item.relevanceScore.toFixed(2)}</strong>
                <br />
                <small>
                  {item.budgetScore !== null && `budget ${subScore.format(item.budgetScore)} · `}
                  recency {subScore.format(item.recencyScore)}
                </small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        hasPrevious={data.hasPrevious}
        hasNext={data.hasNext}
        disabled={query.isFetching}
        onPageChange={onPageChange}
      />
    </section>
  )
}

function ErrorPanel({ error }: { error: Error }) {
  const messages = error instanceof ApiError ? Object.values(error.fieldErrors).flat() : []

  return (
    <div role="alert">
      <p>
        <strong>{error.message}</strong>
      </p>
      {messages.length > 0 && (
        <ul>
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
