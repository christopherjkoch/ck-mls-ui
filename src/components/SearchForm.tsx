import { useState, type FormEvent } from 'react'
import { emptyFilters, type FieldErrors, type SearchFilters } from '../api/listings'

interface Props {
  initialFilters: SearchFilters
  cities: string[]
  fieldErrors: FieldErrors
  isSearching: boolean
  onSearch: (filters: SearchFilters) => void
}

const fields: { name: keyof SearchFilters; label: string; numeric: boolean }[] = [
  { name: 'minPrice', label: 'Min price', numeric: true },
  { name: 'maxPrice', label: 'Max price', numeric: true },
  { name: 'minBedrooms', label: 'Min bedrooms', numeric: true },
  { name: 'city', label: 'City', numeric: false },
  { name: 'keyword', label: 'Keyword', numeric: false },
  { name: 'targetBudget', label: 'Target budget', numeric: true },
  { name: 'pageSize', label: 'Page size', numeric: true },
]

export function SearchForm({ initialFilters, cities, fieldErrors, isSearching, onSearch }: Props) {
  const [draft, setDraft] = useState<SearchFilters>(initialFilters)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSearch(draft)
  }

  function handleReset() {
    setDraft(emptyFilters)
    onSearch(emptyFilters)
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Search listings">
      {fields.map(({ name, label, numeric }) => (
        <div key={name}>
          <label>
            {label}{' '}
            <input
              name={name}
              type="text"
              inputMode={numeric ? 'numeric' : undefined}
              list={name === 'city' ? 'city-options' : undefined}
              value={draft[name]}
              aria-invalid={fieldErrors[name] ? true : undefined}
              onChange={(e) => setDraft((d) => ({ ...d, [name]: e.target.value }))}
            />
          </label>
          {fieldErrors[name]?.map((message) => (
            <div key={message}>
              <small>{message}</small>
            </div>
          ))}
        </div>
      ))}
      <datalist id="city-options">
        {cities.map((city) => (
          <option key={city} value={city} />
        ))}
      </datalist>
      <button type="submit" disabled={isSearching}>
        Search
      </button>{' '}
      <button type="button" onClick={handleReset}>
        Reset
      </button>
    </form>
  )
}
