'use client'

export default function LeadsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif', backgroundColor: '#faf8f5', minHeight: '100vh' }}>
      <h1 style={{ color: '#ef4444', fontSize: 24, marginBottom: 8 }}>Leads Page Error</h1>
      <pre style={{ color: '#374151', fontSize: 14, whiteSpace: 'pre-wrap', marginBottom: 16, padding: 16, background: '#fee2e2', borderRadius: 8 }}>
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
      <button
        onClick={reset}
        style={{ padding: '8px 16px', background: '#0d4f4f', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
      >
        Try Again
      </button>
    </div>
  )
}
