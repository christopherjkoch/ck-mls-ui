import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { ListingResult, SearchResponse } from './api/listings'

function listing(id: string, overrides: Partial<ListingResult> = {}): ListingResult {
  return {
    id,
    source: 'MLS_A',
    address: `${id} Main St`,
    city: 'Springfield',
    state: 'VA',
    zip: '22150',
    price: 450000,
    bedrooms: 2,
    bathrooms: 1.5,
    sqft: 980,
    listedDate: '2026-10-01',
    status: 'active',
    description: 'Nice.',
    relevanceScore: 85,
    budgetScore: 90,
    recencyScore: 80,
    ...overrides,
  }
}

function page(items: ListingResult[], pageNo: number, totalCount: number, pageSize = 2): SearchResponse {
  const totalPages = Math.ceil(totalCount / pageSize)
  return { items, page: pageNo, pageSize, totalCount, totalPages, hasPrevious: pageNo > 1, hasNext: pageNo < totalPages }
}

type Handler = (url: URL) => Response | Promise<Response>
let searchHandler: Handler
let fetchMock: ReturnType<typeof vi.fn>

function searchCalls(): URLSearchParams[] {
  return fetchMock.mock.calls
    .map(([input]) => new URL(String(input), 'http://localhost'))
    .filter((u) => u.pathname === '/api/listings/search')
    .map((u) => u.searchParams)
}

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost')
    if (url.pathname === '/api/listings/cities') return Response.json(['Arlington', 'Springfield'])
    return searchHandler(url)
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

describe('App', () => {
  it('shows a loading state, then ranked results with address, price, beds and score', async () => {
    searchHandler = () =>
      Response.json(
        page([listing('A1'), listing('A2', { price: 499000, relevanceScore: 69.9, budgetScore: 99.8, recencyScore: 40 })], 1, 2),
      )

    renderApp()

    expect(screen.getByText(/loading listings/i)).toBeInTheDocument()
    const rows = await screen.findAllByRole('row')
    const first = within(rows[1])
    expect(first.getByText('A1 Main St')).toBeInTheDocument()
    expect(first.getByText('$450,000')).toBeInTheDocument()
    expect(first.getByText('85.00')).toBeInTheDocument()
    expect(first.getByText('budget 90 · recency 80')).toBeInTheDocument()
    expect(within(rows[2]).getByText('budget 99.8 · recency 40')).toBeInTheDocument()
    expect(screen.getByText(/showing 1–2 of 2 listings/i)).toBeInTheDocument()
  })

  it('sends every filter to the API and resets to page 1 on search', async () => {
    searchHandler = () => Response.json(page([listing('A1')], 1, 1))
    window.history.replaceState(null, '', '/?page=3')
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('A1 Main St')

    await user.type(screen.getByLabelText('Min price'), '100000')
    await user.type(screen.getByLabelText('Max price'), '600000')
    await user.type(screen.getByLabelText('Min bedrooms'), '2')
    await user.type(screen.getByLabelText('City'), 'Springfield')
    await user.type(screen.getByLabelText('Keyword'), 'pet friendly')
    await user.type(screen.getByLabelText('Target budget'), '450000')
    await user.clear(screen.getByLabelText('Page size'))
    await user.type(screen.getByLabelText('Page size'), '5')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await vi.waitFor(() => expect(searchCalls()).toHaveLength(2))
    expect(Object.fromEntries(searchCalls()[1])).toEqual({
      minPrice: '100000',
      maxPrice: '600000',
      minBedrooms: '2',
      city: 'Springfield',
      keyword: 'pet friendly',
      targetBudget: '450000',
      pageSize: '5',
      page: '1',
    })
    expect(window.location.search).toContain('city=Springfield')
  })

  it('shows a no-results state', async () => {
    searchHandler = () => Response.json(page([], 1, 0))

    renderApp()

    expect(await screen.findByText(/no listings match your filters/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows API validation errors in a summary and next to the field', async () => {
    searchHandler = (url) =>
      url.searchParams.has('minPrice')
        ? Response.json(
            {
              title: 'Invalid search request.',
              status: 400,
              errors: { minPrice: ['minPrice (600000) cannot be greater than maxPrice (500000).'] },
            },
            { status: 400 },
          )
        : Response.json(page([listing('A1')], 1, 1))
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('A1 Main St')

    await user.type(screen.getByLabelText('Min price'), '600000')
    await user.type(screen.getByLabelText('Max price'), '500000')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Invalid search request.')).toBeInTheDocument()
    expect(screen.getAllByText(/cannot be greater than maxPrice/)).toHaveLength(2)
    expect(screen.getByLabelText('Min price')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows an error when the API is unreachable', async () => {
    searchHandler = () => Promise.reject(new TypeError('Failed to fetch'))

    renderApp()

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the listings api/i)
  })

  it('moves between pages and disables buttons at the boundaries', async () => {
    searchHandler = (url) => {
      const p = Number(url.searchParams.get('page'))
      return Response.json(page(p === 1 ? [listing('A1'), listing('A2')] : [listing('A3')], p, 3))
    }
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('A1 Main St')

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('A3 Main St')).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(within(screen.getAllByRole('row')[1]).getByText('3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Page 1' }))
    expect(await screen.findByText('A1 Main St')).toBeInTheDocument()
    expect(searchCalls().map((p) => p.get('page'))).toEqual(['1', '2', '1'])
  })

  it('restores the search from the URL', async () => {
    searchHandler = () => Response.json(page([listing('B3')], 2, 3))
    window.history.replaceState(null, '', '/?city=Arlington&page=2')

    renderApp()

    await screen.findByText('B3 Main St')
    expect(screen.getByLabelText('City')).toHaveValue('Arlington')
    expect(searchCalls()[0].get('page')).toBe('2')
  })
})
