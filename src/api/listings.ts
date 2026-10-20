export interface ListingResult {
  id: string
  source: string
  address: string
  city: string
  state: string
  zip: string
  price: number
  bedrooms: number
  bathrooms: number
  sqft: number
  listedDate: string
  status: string
  description: string
  relevanceScore: number
  budgetScore: number | null
  recencyScore: number
}

export interface SearchResponse {
  items: ListingResult[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

// Inputs are kept as raw strings so the API, not the browser, decides what is valid.
export interface SearchFilters {
  minPrice: string
  maxPrice: string
  minBedrooms: string
  city: string
  keyword: string
  targetBudget: string
  pageSize: string
}

export interface SearchParams extends SearchFilters {
  page: number
}

export type FieldErrors = Record<string, string[]>

export const emptyFilters: SearchFilters = {
  minPrice: '',
  maxPrice: '',
  minBedrooms: '',
  city: '',
  keyword: '',
  targetBudget: '',
  pageSize: '10',
}

const filterKeys = Object.keys(emptyFilters) as (keyof SearchFilters)[]

export function toQueryString(params: SearchParams): string {
  const qs = new URLSearchParams()
  for (const key of filterKeys) {
    const value = params[key].trim()
    if (value !== '') qs.set(key, value)
  }
  qs.set('page', String(params.page))
  return qs.toString()
}

export function fromQueryString(search: string): SearchParams {
  const qs = new URLSearchParams(search)
  const filters = { ...emptyFilters }
  for (const key of filterKeys) {
    const value = qs.get(key)
    if (value !== null) filters[key] = value
  }
  const page = Number.parseInt(qs.get('page') ?? '', 10)
  return { ...filters, page: Number.isNaN(page) ? 1 : page }
}

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldErrors

  constructor(message: string, status: number, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

// Model-binding errors come back as "MinPrice"; our validator uses "minPrice".
function normalizeFieldErrors(errors: unknown): FieldErrors {
  if (!errors || typeof errors !== 'object') return {}
  const result: FieldErrors = {}
  for (const [key, messages] of Object.entries(errors as Record<string, unknown>)) {
    if (!Array.isArray(messages)) continue
    const normalized = key.charAt(0).toLowerCase() + key.slice(1)
    result[normalized] = [...(result[normalized] ?? []), ...messages.map(String)]
  }
  return result
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { signal, headers: { Accept: 'application/json' } })
  } catch (err) {
    if (signal?.aborted) throw err
    throw new ApiError('Could not reach the listings API. Make sure it is running.', 0)
  }

  if (response.ok) return (await response.json()) as T

  const body = (await response.json().catch(() => null)) as { title?: string; errors?: unknown } | null
  const fallback =
    response.status >= 500
      ? `The listings API failed (HTTP ${response.status}). Make sure it is running.`
      : `Request failed (HTTP ${response.status}).`
  throw new ApiError(body?.title ?? fallback, response.status, normalizeFieldErrors(body?.errors))
}

export function searchListings(params: SearchParams, signal?: AbortSignal): Promise<SearchResponse> {
  return getJson<SearchResponse>(`/api/listings/search?${toQueryString(params)}`, signal)
}

export function getCities(signal?: AbortSignal): Promise<string[]> {
  return getJson<string[]>('/api/listings/cities', signal)
}
