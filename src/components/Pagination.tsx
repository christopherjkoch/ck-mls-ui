interface Props {
  page: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
  disabled: boolean
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, hasPrevious, hasNext, disabled, onPageChange }: Props) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav aria-label="Pagination">
      <button type="button" disabled={disabled || !hasPrevious} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>{' '}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          aria-label={`Page ${p}`}
          aria-current={p === page ? 'page' : undefined}
          disabled={disabled || p === page}
          onClick={() => onPageChange(p)}
        >
          {p === page ? <strong>{p}</strong> : p}
        </button>
      ))}{' '}
      <button type="button" disabled={disabled || !hasNext} onClick={() => onPageChange(page + 1)}>
        Next
      </button>{' '}
      <span>
        Page {page} of {totalPages}
      </span>
    </nav>
  )
}
