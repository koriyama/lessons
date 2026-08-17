import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  getLesson,
  createLesson,
  updateLesson,
  setLessonStatus,
  listSections,
  saveSections,
  listActivities,
  saveActivities,
  listVocabulary,
  saveVocabulary,
  uploadAudio,
  uploadImage
} from '../lib/api'
import GapFillEditor from '../components/activity-editors/GapFillEditor.jsx'
import MultipleChoiceEditor from '../components/activity-editors/MultipleChoiceEditor.jsx'
import ShortAnswerEditor from '../components/activity-editors/ShortAnswerEditor.jsx'
import ReasoningEditor from '../components/activity-editors/ReasoningEditor.jsx'

const ACTIVITY_LABELS = {
  gap_fill: 'Fill in the blank',
  multiple_choice: 'Multiple choice',
  short_answer: 'Short answer',
  reasoning: 'Reasoning'
}

const EDITORS = {
  gap_fill: GapFillEditor,
  multiple_choice: MultipleChoiceEditor,
  short_answer: ShortAnswerEditor,
  reasoning: ReasoningEditor
}

function newKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `k-${Date.now()}-${Math.random()}`
}

function blankActivity(type, sectionKey = null) {
  const defaults = {
    gap_fill: { config: { accepted_answers: [] } },
    multiple_choice: { config: { options: ['', ''], correct_index: 0 } },
    short_answer: { config: {} },
    reasoning: { config: { subtype: 'claim' } }
  }
  return {
    type,
    prompt: '',
    points: type === 'reasoning' ? 3 : type === 'short_answer' ? 2 : 1,
    section_key: sectionKey,
    ...defaults[type]
  }
}

function blankSection() {
  return { key: newKey(), title: '', intro_text: '' }
}

export default function LessonBuilder() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()

  const [lesson, setLesson] = useState({ title: '', level: 'B1', reading_text: '', audio_url: '', images: [] })
  const [sections, setSections] = useState([])
  const [activities, setActivities] = useState([])
  const [vocabulary, setVocabulary] = useState([])
  const [status, setStatus] = useState('draft')
  const [saving, setSaving] = useState(false)
  const [audioUploading, setAudioUploading] = useState(false)
  const [error, setError] = useState(null)
  const [savedAt, setSavedAt] = useState(null)

  async function loadAll(lessonId) {
    const secs = await listSections(lessonId)
    setSections(secs.map((s) => ({ key: s.id, title: s.title, intro_text: s.intro_text })))
    const acts = await listActivities(lessonId)
    setActivities(acts.map((a) => ({ ...a, section_key: a.section_id })))
    setVocabulary(await listVocabulary(lessonId))
  }

  useEffect(() => {
    if (isNew) return
    ;(async () => {
      try {
        const l = await getLesson(id)
        setLesson(l)
        setStatus(l.status)
        await loadAll(id)
      } catch (e) {
        setError(e.message)
      }
    })()
  }, [id])

  async function handleAudioUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAudioUploading(true)
    try {
      const url = await uploadAudio(file)
      setLesson((l) => ({ ...l, audio_url: url }))
    } catch (e) {
      setError(e.message)
    } finally {
      setAudioUploading(false)
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await uploadImage(file)
      setLesson((l) => ({ ...l, images: [...(l.images || []), url] }))
    } catch (e) {
      setError(e.message)
    }
  }

  function removeImage(url) {
    setLesson((l) => ({ ...l, images: l.images.filter((u) => u !== url) }))
  }

  // ---------- sections ----------

  function addSection() {
    setSections((s) => [...s, blankSection()])
  }

  function updateSection(index, field, value) {
    setSections((s) => s.map((sec, i) => (i === index ? { ...sec, [field]: value } : sec)))
  }

  function removeSection(index) {
    const removedKey = sections[index].key
    setSections((s) => s.filter((_, i) => i !== index))
    // Activities that were in this section become ungrouped, not deleted.
    setActivities((a) => a.map((act) => (act.section_key === removedKey ? { ...act, section_key: null } : act)))
  }

  function moveSection(index, dir) {
    setSections((s) => {
      const next = [...s]
      const target = index + dir
      if (target < 0 || target >= next.length) return s
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  // ---------- activities ----------

  function addActivity(type, sectionKey = null) {
    setActivities((a) => [...a, blankActivity(type, sectionKey)])
  }

  function updateActivity(index, next) {
    setActivities((a) => a.map((act, i) => (i === index ? next : act)))
  }

  function removeActivity(index) {
    setActivities((a) => a.filter((_, i) => i !== index))
  }

  function moveActivity(index, dir) {
    setActivities((a) => {
      const next = [...a]
      const target = index + dir
      if (target < 0 || target >= next.length) return a
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  // ---------- vocabulary ----------

  function addVocab() {
    setVocabulary((v) => [...v, { term: '', definition: '', example: '' }])
  }

  function updateVocab(index, field, value) {
    setVocabulary((v) => v.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function removeVocab(index) {
    setVocabulary((v) => v.filter((_, i) => i !== index))
  }

  // ---------- save ----------

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      let lessonRow = lesson
      if (isNew) {
        lessonRow = await createLesson(lesson)
      } else {
        lessonRow = await updateLesson(id, {
          title: lesson.title,
          level: lesson.level,
          reading_text: lesson.reading_text,
          audio_url: lesson.audio_url,
          images: lesson.images
        })
      }

      const savedSections = await saveSections(lessonRow.id, sections)
      const keyToRealId = {}
      sections.forEach((s, i) => {
        if (savedSections[i]) keyToRealId[s.key] = savedSections[i].id
      })

      const activitiesToSave = activities.map((a) => ({
        ...a,
        section_id: a.section_key ? keyToRealId[a.section_key] ?? null : null
      }))
      await saveActivities(lessonRow.id, activitiesToSave)
      await saveVocabulary(lessonRow.id, vocabulary)

      // Reload from the database so local state (keys, ids) matches exactly
      // what was saved — the full-replace pattern issues fresh ids each time.
      await loadAll(lessonRow.id)

      setSavedAt(new Date())
      if (isNew) navigate(`/lessons/${lessonRow.id}/edit`, { replace: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handlePublishToggle() {
    if (isNew) {
      setError('Save the lesson before publishing.')
      return
    }
    const next = status === 'published' ? 'draft' : 'published'
    await handleSave()
    const updated = await setLessonStatus(id, next)
    setStatus(updated.status)
  }

  const shareUrl = !isNew && lesson.share_slug ? `${window.location.origin}/l/${lesson.share_slug}` : null

  function activityCard(activity, i) {
    const Editor = EDITORS[activity.type]
    return (
      <div key={i} className="card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-paper border border-rule">
            {ACTIVITY_LABELS[activity.type]}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-muted flex items-center gap-1">
              section
              <select
                className="field-input w-32 py-1"
                value={activity.section_key || ''}
                onChange={(e) => updateActivity(i, { ...activity, section_key: e.target.value || null })}
              >
                <option value="">— none —</option>
                {sections.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.title || '(untitled section)'}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted flex items-center gap-1">
              points
              <input
                type="number"
                min={0}
                className="field-input w-16 py-1"
                value={activity.points}
                onChange={(e) => updateActivity(i, { ...activity, points: Number(e.target.value) })}
              />
            </label>
            <button className="btn-ghost text-xs" onClick={() => moveActivity(i, -1)}>
              ↑
            </button>
            <button className="btn-ghost text-xs" onClick={() => moveActivity(i, 1)}>
              ↓
            </button>
            <button className="btn-ghost text-xs text-crest" onClick={() => removeActivity(i)}>
              Remove
            </button>
          </div>
        </div>
        <Editor activity={activity} onChange={(next) => updateActivity(i, next)} />
      </div>
    )
  }

  const ungrouped = activities
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => !a.section_key || !sections.some((s) => s.key === a.section_key))

  return (
    <div className="space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <Link to="/" className="btn-ghost">
          ← My lessons
        </Link>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-muted font-mono">saved {savedAt.toLocaleTimeString()}</span>}
          <button className="btn-secondary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button className="btn-primary" onClick={handlePublishToggle} disabled={saving}>
            {status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {error && <div className="card p-4 border-crest bg-crestSoft text-crest text-sm">{error}</div>}

      {shareUrl && status === 'published' && (
        <div className="card p-4 bg-forestSoft border-forest/30 text-sm">
          <p className="font-medium text-forest mb-1">Student link</p>
          <a className="font-mono text-forest underline break-all" href={shareUrl} target="_blank" rel="noreferrer">
            {shareUrl}
          </a>
        </div>
      )}

      {/* ---------- lesson basics ---------- */}
      <section className="card p-6 space-y-4">
        <p className="rail-label">01 · lesson basics</p>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="field-label">Title</label>
            <input
              className="field-input"
              value={lesson.title}
              onChange={(e) => setLesson({ ...lesson, title: e.target.value })}
              placeholder="Government and Values"
            />
          </div>
          <div>
            <label className="field-label">CEFR level</label>
            <select
              className="field-input"
              value={lesson.level}
              onChange={(e) => setLesson({ ...lesson, level: e.target.value })}
            >
              {['A2', 'B1', 'B1+', 'B2', 'C1'].map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="field-label">Reading text</label>
          <textarea
            className="field-input font-display"
            rows={10}
            value={lesson.reading_text}
            onChange={(e) => setLesson({ ...lesson, reading_text: e.target.value })}
            placeholder="Paste or write the input text. Separate paragraphs with a blank line."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Audio (MP3)</label>
            {lesson.audio_url && <audio controls src={lesson.audio_url} className="w-full mb-2" />}
            <input type="file" accept="audio/mpeg,audio/mp3" onChange={handleAudioUpload} />
            {audioUploading && <p className="text-xs text-muted mt-1">Uploading…</p>}
          </div>
          <div>
            <label className="field-label">Images (optional)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(lesson.images || []).map((url) => (
                <div key={url} className="relative">
                  <img src={url} alt="" className="h-16 w-16 object-cover rounded-sm border border-rule" />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-crest text-white text-xs rounded-full w-5 h-5"
                    onClick={() => removeImage(url)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          </div>
        </div>
      </section>

      {/* ---------- vocabulary ---------- */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="rail-label">02 · vocabulary support</p>
          <button className="btn-ghost text-sm" onClick={addVocab}>
            + Add term
          </button>
        </div>
        {vocabulary.length === 0 && <p className="text-sm text-muted">No vocabulary items yet.</p>}
        <div className="space-y-3">
          {vocabulary.map((v, i) => (
            <div key={i} className="grid md:grid-cols-[1fr_2fr_2fr_auto] gap-2 items-start">
              <input
                className="field-input"
                placeholder="term"
                value={v.term}
                onChange={(e) => updateVocab(i, 'term', e.target.value)}
              />
              <input
                className="field-input"
                placeholder="definition"
                value={v.definition}
                onChange={(e) => updateVocab(i, 'definition', e.target.value)}
              />
              <input
                className="field-input"
                placeholder="example sentence (optional)"
                value={v.example}
                onChange={(e) => updateVocab(i, 'example', e.target.value)}
              />
              <button className="btn-ghost text-xs" onClick={() => removeVocab(i)}>
                Remove
              </button>
            </div>
          ))}
        </div>
        {vocabulary.length > 0 && (
          <button className="btn-secondary text-sm" onClick={addVocab}>
            + Add term
          </button>
        )}
      </section>

      {/* ---------- sections + activities ---------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="rail-label">03 · sections &amp; activities</p>
          <button className="btn-secondary text-sm" onClick={addSection}>
            + Add section
          </button>
        </div>
        <p className="text-xs text-muted -mt-2">
          Sections are optional. With no sections, students see all activities on one page. With sections, each
          becomes its own page with Next/Back.
        </p>

        {sections.map((section, si) => {
          const items = activities.map((a, i) => ({ a, i })).filter(({ a }) => a.section_key === section.key)
          return (
            <div key={section.key} className="card p-5 space-y-4 border-l-4 border-l-crest">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <input
                    className="field-input font-display text-lg"
                    placeholder={`Section ${si + 1} title (e.g. Comprehension)`}
                    value={section.title}
                    onChange={(e) => updateSection(si, 'title', e.target.value)}
                  />
                  <textarea
                    className="field-input"
                    rows={2}
                    placeholder="Optional intro text students see at the top of this page"
                    value={section.intro_text}
                    onChange={(e) => updateSection(si, 'intro_text', e.target.value)}
                  />
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex gap-2">
                    <button className="btn-ghost text-xs" onClick={() => moveSection(si, -1)}>
                      ↑
                    </button>
                    <button className="btn-ghost text-xs" onClick={() => moveSection(si, 1)}>
                      ↓
                    </button>
                  </div>
                  <button className="btn-ghost text-xs text-crest" onClick={() => removeSection(si)}>
                    Remove section
                  </button>
                </div>
              </div>

              <div className="space-y-3 pl-1">
                {items.length === 0 && <p className="text-sm text-muted">No activities in this section yet.</p>}
                {items.map(({ a, i }) => activityCard(a, i))}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-xs text-muted mr-1 self-center">Add to this section:</span>
                {Object.entries(ACTIVITY_LABELS).map(([type, label]) => (
                  <button key={type} className="btn-secondary text-xs" onClick={() => addActivity(type, section.key)}>
                    + {label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {/* ---------- ungrouped activities ---------- */}
        <div className="card p-5 space-y-4">
          <p className="rail-label">{sections.length ? 'ungrouped (no section)' : 'activities'}</p>
          <div className="space-y-3">
            {ungrouped.length === 0 && sections.length > 0 && (
              <p className="text-sm text-muted">Every activity is assigned to a section.</p>
            )}
            {ungrouped.map(({ a, i }) => activityCard(a, i))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted mr-2 self-center">Add activity:</span>
            {Object.entries(ACTIVITY_LABELS).map(([type, label]) => (
              <button key={type} className="btn-secondary text-sm" onClick={() => addActivity(type, null)}>
                + {label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
