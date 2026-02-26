import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import type { Severity } from '../types'
import AppLayout from '../components/AppLayout'

type ScanSpan = {
  label: string
  severity: string
  explanation?: string
}

type ScanRecord = {
  id: string
  timestamp: Date
  text_preview: string
  summary: { risk_count: number; highest_severity: Severity | string }
  spans?: ScanSpan[]
}

const SEVERITY_CLASSES: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  MED:  'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  LOW:  'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
}

const SEV_DOT: Record<string, string> = {
  HIGH: '#ef4444',
  MED:  '#f59e0b',
  LOW:  '#22c55e',
}

export default function HistoryPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('scan')

  const [scans, setScans] = useState<ScanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(highlightId)

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'users', user.uid, 'scans'),
      orderBy('timestamp', 'desc'),
      limit(50),
    )
    getDocs(q)
      .then(snap => {
        setScans(snap.docs.map(doc => {
          const d = doc.data()
          return {
            id: doc.id,
            timestamp: d.timestamp?.toDate?.() ?? new Date(),
            text_preview: d.text_preview ?? '',
            summary: d.summary ?? { risk_count: 0, highest_severity: 'LOW' },
            spans: d.spans ?? [],
          }
        }))
      })
      .catch(e => { console.error('Failed to load scan history:', e); setError('Could not load scan history. Please refresh and try again.') })
      .finally(() => setLoading(false))
  }, [user])

  // Scroll to highlighted row after scans load
  useEffect(() => {
    if (!highlightId || scans.length === 0) return
    const el = rowRefs.current[highlightId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [scans, highlightId])

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scan History</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Your previous ToS analyses</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm">
            Failed to load history: {error}
          </div>
        )}

        {!loading && !error && scans.length === 0 && (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <p className="text-lg font-medium">No scans yet</p>
            <p className="text-sm mt-1">Analyze a Terms of Service to see it here</p>
          </div>
        )}

        <div className="space-y-3">
          {scans.map(scan => {
            const sev = String(scan.summary.highest_severity).toUpperCase()
            const colorClass = SEVERITY_CLASSES[sev] ?? SEVERITY_CLASSES.LOW
            const isExpanded = expandedId === scan.id
            const isHighlighted = highlightId === scan.id

            return (
              <div
                key={scan.id}
                ref={el => { rowRefs.current[scan.id] = el }}
                className={`bg-white dark:bg-gray-800 border rounded-xl overflow-hidden transition-colors ${
                  isHighlighted
                    ? 'border-blue-500 dark:border-blue-500'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Header row — click to expand/collapse */}
                <div
                  className="p-4 cursor-pointer select-none"
                  onClick={() => setExpandedId(prev => prev === scan.id ? null : scan.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                        {scan.text_preview || 'No preview available'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {scan.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${colorClass}`}>
                        {sev}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {scan.summary.risk_count} risk{scan.summary.risk_count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-600">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded spans */}
                {isExpanded && scan.spans && scan.spans.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-2">
                    {scan.spans.map((sp, i) => {
                      const spSev = String(sp.severity || 'LOW').toUpperCase()
                      const dotColor = SEV_DOT[spSev] ?? SEV_DOT.LOW
                      return (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span
                            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                            style={{ background: dotColor }}
                          />
                          <div>
                            <span className="font-medium">{sp.label}</span>
                            {sp.explanation && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1.5">
                                — {sp.explanation}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {isExpanded && (!scan.spans || scan.spans.length === 0) && (
                  <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                    No detailed spans available for this scan.
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </AppLayout>
  )
}
