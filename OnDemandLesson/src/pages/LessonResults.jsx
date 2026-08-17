import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getLesson, getResultsForLesson, deleteSubmissions } from '../lib/api'
import { supabase } from '../lib/supabaseClient'

function toCSV(lesson, submissions) {
  const rows = [['Student', 'Status', 'Submitted', 'Auto score', 'Max auto score', 'Question', 'Response', 'Auto-correct']]
  for (const s of submissions) {
    if (s.responses.length === 0) {
      rows.push([s.student_identifier, s.status, s.submitted_at || '', s.score ?? '', s.max_auto_score ?? '', '', '', ''])
      continue
    }
    for (const r of s.responses) {
      rows.push([
        s.student_identifier,
        s.status,
        s.submitted_at || '',
        s.score ?? '',
        s.max_auto_score ?? '',
        r.activities?.prompt || '',
        r.response_text,
        r.auto_correct === null ? 'teacher review' : r.auto_correct ? 'correct' : 'incorrect'
      ])
    }
  }
  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export default function LessonResults() {
  const { lessonId } = useParams()
  const [lesson, setLesson] = useState(null)
  const [submissions, setSubmissions] = useState(null)
  const [error, setError] = useState(null)
  const [exportStatus, setExportStatus] = useState(null)

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedIds, setExpandedIds] = useState(new Set())

  async function load() {
    try {
      setLesson(await getLesson(lessonId))
      setSubmissions(await getResultsForLesson(lessonId))
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    if (lessonId) load()
  }, [lessonId])

  function toggleSelect(id) {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  function toggleSelectAll() {
    if (!submissions) return
    if (selectedIds.size === submissions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(submissions.map(s => s.id)))
    }
  }

  function toggleExpand(id) {
    const newSet = new Set(expandedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setExpandedIds(newSet)
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (!confirm(`Delete ${ids.length} submission${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return

    setIsDeleting(true)
    try {
      await deleteSubmissions(ids)
      setSelectedIds(new Set())
      setExpandedIds(new Set())
      await load()
    } catch (err) {
      alert('Failed to delete: ' + err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  // ---------- FIXED: CSV Export with UTF-8 BOM ----------
  function downloadCSV() {
    // 1. Generate the raw CSV string
    const rawCsv = toCSV(lesson, submissions)
    
    // 2. Prepend the UTF-8 BOM (Byte Order Mark) so Excel recognises it as UTF-8
    const bom = '\uFEFF'
    const csvWithBom = bom + rawCsv

    // 3. Create the Blob with the correct MIME type and encoding
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8' })
    
    // 4. Download the file
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${lesson.title.replace(/\s+/g, '-').toLowerCase()}-results.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function exportToSheets() {
    setExportStatus('exporting')
    try {
      const { data, error } = await supabase.functions.invoke('export-to-sheets', {
        body: { lessonId }
      })
      if (error) throw error
      setExportStatus(data?.spreadsheetUrl ? `done:${data.spreadsheetUrl}` : 'done')
    } catch (e) {
      setExportStatus(`error:${e.message}`)
    }
  }

  if (error) return <div className="card p-4 border-crest bg-crestSoft text-crest text-sm mx-4">{error}</div>
  if (!lesson || !submissions) return <p className="text-muted mx-4">Loading…</p>

  const completed = submissions.filter((s) => s.status === 'completed')
  const allSelected = submissions.length > 0 && selectedIds.size === submissions.length

  return (
    <div className="space-y-3 pb-24 px-4">
      <Link to="/" className="btn-ghost text-sm pl-1">
        ← My lessons
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="rail-label mb-0.5">results</p>
          <h1 className="text-xl font-display">{lesson.title}</h1>
          <p className="text-xs text-muted mt-0.5">
            {completed.length} completed · {submissions.length - completed.length} in progress
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="btn-secondary text-xs px-3 py-1" onClick={downloadCSV} disabled={!submissions.length}>
            Export CSV
          </button>
          <button className="btn-secondary text-xs px-3 py-1" onClick={exportToSheets} disabled={!submissions.length}>
            Export Sheets
          </button>
        </div>
      </div>

      {exportStatus === 'exporting' && <p className="text-xs text-muted">Exporting…</p>}
      {exportStatus?.startsWith('done') && (
        <div className="card p-2 bg-forestSoft text-forest text-xs">
          Exported.{' '}
          {exportStatus.includes(':') && exportStatus.split(':')[1] && (
            <a className="underline" href={exportStatus.split('done:')[1]} target="_blank" rel="noreferrer">
              Open sheet
            </a>
          )}
        </div>
      )}
      {exportStatus?.startsWith('error') && (
        <div className="card p-2 bg-crestSoft text-crest text-xs">
          {exportStatus.split('error:')[1]}
        </div>
      )}

      {submissions.length === 0 && <p className="text-muted text-sm">No student activity yet.</p>}

      {/* Bulk Delete Toolbar */}
      {submissions.length > 0 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded px-2 py-1">
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-600">
              {selectedIds.size} / {submissions.length}
            </span>
          </div>
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0 || isDeleting}
            className="px-2.5 py-0.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '...' : `Delete (${selectedIds.size})`}
          </button>
        </div>
      )}

      {/* Submission List */}
      <div className="space-y-1">
        {submissions.map((s) => {
          const isExpanded = expandedIds.has(s.id)
          return (
            <div key={s.id} className="bg-white border border-gray-200 rounded overflow-hidden shadow-sm">
              {/* Summary Row */}
              <div
                className="flex items-center gap-1.5 px-2 py-1 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => toggleExpand(s.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(s.id)}
                  onChange={(e) => {
                    e.stopPropagation()
                    toggleSelect(s.id)
                  }}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 flex-shrink-0"
                />
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs">
                  <span className="font-medium truncate">{s.student_identifier}</span>
                  <span className="capitalize">
                    {s.status === 'completed' ? '✅' : '⏳'} {s.status}
                  </span>
                  <span>
                    {s.status === 'completed' && s.max_auto_score > 0
                      ? `${s.score}/${s.max_auto_score}`
                      : '-'}
                  </span>
                  <span className="text-gray-400 truncate hidden sm:block">
                    {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}
                  </span>
                </div>
                <span className="text-gray-400 text-[10px] px-0.5 flex-shrink-0">
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>

              {/* Details Row */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-2 py-1 bg-gray-50 space-y-1">
                  {s.responses.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic">No responses.</p>
                  ) : (
                    s.responses.map((r) => (
                      <div key={r.id} className="text-[11px] bg-white rounded px-1.5 py-0.5 border border-gray-100 flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {r.response_text || <span className="text-gray-400 italic">no response</span>}
                        </span>
                        {r.auto_correct === true && <span className="text-green-600 text-[10px] font-mono">correct</span>}
                        {r.auto_correct === false && <span className="text-red-600 text-[10px] font-mono">incorrect</span>}
                        {r.auto_correct === null && <span className="text-amber-600 text-[10px] font-mono">review</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}