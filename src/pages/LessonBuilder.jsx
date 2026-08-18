import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
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
import { renderInline } from '../lib/inlineMarkup.jsx'
import AudioPlayer from '../components/AudioPlayer.jsx'
import ReadingText from '../components/ReadingText.jsx'

// ---- Activity Editor Components ----
function GapFillEditor({ activity, onChange, inputRef }) {
  const config = activity.config || {}
  const updateConfig = (patch) => onChange({ ...activity, config: { ...config, ...patch } })

  const [answerString, setAnswerString] = useState(
    config.answers ? config.answers.join(', ') : ''
  )

  useEffect(() => {
    setAnswerString(config.answers ? config.answers.join(', ') : '')
  }, [config.answers])

  const handleAnswerBlur = () => {
    const arr = answerString.split(',').map(s => s.trim()).filter(Boolean)
    updateConfig({ answers: arr })
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-medium text-gray-600">Prompt</label>
        <input
          ref={inputRef}
          className="field-input"
          value={activity.prompt || ''}
          onChange={(e) => onChange({ ...activity, prompt: e.target.value })}
          placeholder="e.g. Fill in the missing words:"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Text with blanks</label>
        <textarea
          className="field-input"
          rows={3}
          value={config.text || ''}
          onChange={(e) => updateConfig({ text: e.target.value })}
          placeholder='Use [[curly brackets]], ____, or ___ for blanks, e.g. "The ___ sat on the ___."'
        />
        <p className="text-xs text-muted mt-1">
          Use <code className="bg-gray-100 px-1">[[ ]]</code>, <code className="bg-gray-100 px-1">____</code>, or <code className="bg-gray-100 px-1">___</code> around the missing word(s).
        </p>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Answer key (one per blank, comma separated)</label>
        <input
          className="field-input"
          value={answerString}
          onChange={(e) => setAnswerString(e.target.value)}
          onBlur={handleAnswerBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAnswerBlur()
            }
          }}
          placeholder="great, trivialised|trivialized, New York|New York City"
        />
        <p className="text-xs text-muted mt-1">
          For each blank, you can list multiple acceptable answers separated by a pipe (<code className="bg-gray-100 px-1">|</code>).
          Spaces around the pipe are ignored. Multi‑word answers are supported.
          Example: <code className="bg-gray-100 px-1">trivialised | trivialized</code> accepts both spellings;
          <code className="bg-gray-100 px-1">New York | New York City</code> accepts either phrase.
        </p>
      </div>
    </div>
  )
}

function MultipleChoiceEditor({ activity, onChange, inputRef }) {
  const config = activity.config || {}
  const updateConfig = (patch) => onChange({ ...activity, config: { ...config, ...patch } })

  const options = config.options || []
  const correctIndex = config.correctIndex !== undefined ? config.correctIndex : -1

  const addOption = () => {
    const newOptions = [...options, '']
    updateConfig({ options: newOptions })
  }

  const removeOption = (index) => {
    if (options.length <= 1) return
    const newOptions = options.filter((_, i) => i !== index)
    let newCorrectIndex = correctIndex
    if (correctIndex === index) newCorrectIndex = -1
    else if (correctIndex > index) newCorrectIndex = correctIndex - 1
    updateConfig({ options: newOptions, correctIndex: newCorrectIndex })
  }

  const updateOption = (index, value) => {
    const newOptions = [...options]
    newOptions[index] = value
    updateConfig({ options: newOptions })
  }

  const selectCorrect = (index) => {
    updateConfig({ correctIndex: index })
  }

  const radioName = `correct-option-${activity.id}`

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600">Prompt</label>
        <input
          ref={inputRef}
          className="field-input"
          value={activity.prompt || ''}
          onChange={(e) => onChange({ ...activity, prompt: e.target.value })}
          placeholder="e.g. What is the correct answer?"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Options</label>
        <div className="space-y-1">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={radioName}
                checked={correctIndex === i}
                onChange={() => selectCorrect(i)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <input
                className="field-input flex-1"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
              <button
                type="button"
                className="text-xs text-red-500 hover:text-red-700"
                onClick={() => removeOption(i)}
                disabled={options.length <= 1}
                title={options.length <= 1 ? "Must have at least one option" : "Remove option"}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-blue-600 hover:underline"
            onClick={addOption}
          >
            + Add option
          </button>
        </div>
        <p className="text-xs text-muted mt-1">
          Select the correct answer by clicking the circle next to the option.
        </p>
      </div>
    </div>
  )
}

function ShortAnswerEditor({ activity, onChange, inputRef }) {
  const config = activity.config || {}
  const updateConfig = (patch) => onChange({ ...activity, config: { ...config, ...patch } })
  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-medium text-gray-600">Prompt</label>
        <input
          ref={inputRef}
          className="field-input"
          value={activity.prompt || ''}
          onChange={(e) => onChange({ ...activity, prompt: e.target.value })}
          placeholder="e.g. Write a short paragraph about..."
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Suggested answer (optional)</label>
        <textarea
          className="field-input"
          rows={2}
          value={config.suggestedAnswer || ''}
          onChange={(e) => updateConfig({ suggestedAnswer: e.target.value })}
          placeholder="Teacher reference (not shown to students)"
        />
      </div>
    </div>
  )
}

function ReasoningEditor({ activity, onChange, inputRef }) {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-medium text-gray-600">Prompt</label>
        <textarea
          ref={inputRef}
          className="field-input"
          rows={2}
          value={activity.prompt || ''}
          onChange={(e) => onChange({ ...activity, prompt: e.target.value })}
          placeholder="e.g. Explain the author's argument in your own words."
        />
      </div>
    </div>
  )
}

const EDITORS = {
  gap_fill: GapFillEditor,
  multiple_choice: MultipleChoiceEditor,
  short_answer: ShortAnswerEditor,
  reasoning: ReasoningEditor
}

const ACTIVITY_TYPES = [
  { value: 'gap_fill', label: 'Gap Fill' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'reasoning', label: 'Reasoning' }
]

// ---- Main Builder Component ----
export default function LessonBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [lesson, setLesson] = useState(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState(null)

  const [sections, setSections] = useState([])
  const [activities, setActivities] = useState([])
  const [vocabulary, setVocabulary] = useState([])

  const [audioFile, setAudioFile] = useState(null)
  const [imageFiles, setImageFiles] = useState([])

  const activitiesContainerRef = useRef(null)
  const inputRefs = useRef({})
  const focusedRef = useRef(new Set())

  // ---------- Load existing lesson ----------
  useEffect(() => {
    if (!id) {
      setLesson({ title: '', level: 'B1', reading_text: '', audio_url: null, images: [] })
      return
    }

    async function load() {
      try {
        const l = await getLesson(id)
        setLesson(l)
        setSections(await listSections(id))
        setActivities(await listActivities(id))
        setVocabulary(await listVocabulary(id))
      } catch (err) {
        setError('Failed to load lesson: ' + err.message)
      }
    }
    load()
  }, [id])

  // ---------- Auto‑focus ----------
  useEffect(() => {
    if (activities.length > 0) {
      const lastActivity = activities[activities.length - 1]
      if (lastActivity.id && typeof lastActivity.id === 'string' && lastActivity.id.startsWith('temp-') && !focusedRef.current.has(lastActivity.id)) {
        const ref = inputRefs.current[lastActivity.id]
        if (ref) {
          ref.focus()
          focusedRef.current.add(lastActivity.id)
          const element = ref.closest('.activity-card')
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }
    }
  }, [activities])

  // ---------- Save ----------
  async function handleSave(shouldPublish = false) {
    setSaving(true)
    setError(null)
    try {
      let savedLesson
      if (isEditing) {
        savedLesson = await updateLesson(id, {
          title: lesson.title,
          level: lesson.level,
          reading_text: lesson.reading_text,
          audio_url: lesson.audio_url,
          images: lesson.images || []
        })
      } else {
        savedLesson = await createLesson({
          title: lesson.title,
          level: lesson.level,
          reading_text: lesson.reading_text,
          audio_url: lesson.audio_url,
          images: lesson.images || []
        })
      }

      const lessonId = savedLesson.id
      const savedSections = await saveSections(lessonId, sections)
      
      const sectionIdMap = {}
      sections.forEach((oldSection, index) => {
        const newSection = savedSections[index]
        if (newSection) {
          sectionIdMap[oldSection.id] = newSection.id
        }
      })

      const updatedActivities = activities.map(act => {
        if (!act.section_id) return act
        if (sectionIdMap[act.section_id]) {
          return { ...act, section_id: sectionIdMap[act.section_id] }
        }
        return { ...act, section_id: null }
      })

      await saveActivities(lessonId, updatedActivities, false)
      await saveVocabulary(lessonId, vocabulary)

      if (shouldPublish) {
        await setLessonStatus(lessonId, 'published')
      } else if (isEditing) {
        await setLessonStatus(lessonId, 'draft')
      }

      if (shouldPublish) {
        navigate('/')
      } else if (!isEditing) {
        navigate(`/builder/${lessonId}`)
      } else {
        const updated = await getLesson(lessonId)
        setLesson(updated)
        setSections(await listSections(lessonId))
        setActivities(await listActivities(lessonId))
        setVocabulary(await listVocabulary(lessonId))
        if (!isEditing) {
          navigate(`/builder/${lessonId}`, { replace: true })
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
      setPublishing(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    await handleSave(true)
  }

  // ---------- Upload ----------
  async function handleAudioUpload(file) {
    if (!file) return
    try {
      const url = await uploadAudio(file)
      setLesson({ ...lesson, audio_url: url })
      setAudioFile(null)
    } catch (err) {
      setError('Failed to upload audio: ' + err.message)
    }
  }

  async function handleImageUpload(files) {
    if (!files || files.length === 0) return
    try {
      const urls = await Promise.all(Array.from(files).map(f => uploadImage(f)))
      setLesson({
        ...lesson,
        images: [...(lesson.images || []), ...urls]
      })
      setImageFiles([])
    } catch (err) {
      setError('Failed to upload images: ' + err.message)
    }
  }

  // ---------- Activity CRUD ----------
  function addActivity(type) {
    const defaultSectionId = sections.length > 0 ? sections[0].id : null
    let newActivity = {
      id: `temp-${Date.now()}-${Math.random()}`,
      type,
      prompt: '',
      config: {},
      points: 1,
      section_id: defaultSectionId
    }
    if (type === 'multiple_choice') {
      newActivity.config = {
        options: ['', '', ''],
        correctIndex: -1
      }
    }
    setActivities([...activities, newActivity])
  }

  function updateActivity(index, updated) {
    const newActivities = [...activities]
    newActivities[index] = updated
    setActivities(newActivities)
  }

  function removeActivity(index) {
    setActivities(activities.filter((_, i) => i !== index))
  }

  function moveActivity(index, direction) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= activities.length) return
    const newActivities = [...activities]
    const [removed] = newActivities.splice(index, 1)
    newActivities.splice(newIndex, 0, removed)
    setActivities(newActivities)
  }

  // ---------- Vocabulary CRUD ----------
  function addVocabularyItem() {
    setVocabulary([...vocabulary, { id: `temp-${Date.now()}`, term: '', definition: '', example: '' }])
  }

  function updateVocabulary(index, field, value) {
    const newVocab = [...vocabulary]
    newVocab[index][field] = value
    setVocabulary(newVocab)
  }

  function removeVocabulary(index) {
    setVocabulary(vocabulary.filter((_, i) => i !== index))
  }

  // ---------- Section CRUD ----------
  function addSection() {
    setSections([...sections, { id: `temp-${Date.now()}-${Math.random()}`, title: '', intro_text: '' }])
  }

  function updateSection(index, field, value) {
    const newSections = [...sections]
    newSections[index][field] = value
    setSections(newSections)
  }

  function removeSection(index) {
    setSections(sections.filter((_, i) => i !== index))
  }

  function moveSection(index, direction) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= sections.length) return
    const newSections = [...sections]
    const [removed] = newSections.splice(index, 1)
    newSections.splice(newIndex, 0, removed)
    setSections(newSections)
  }

  // ---------- EXPORT ----------
  function handleExport() {
    const data = {
      version: '1.0',
      lesson: {
        title: lesson.title || 'Untitled',
        level: lesson.level || 'B1',
        reading_text: lesson.reading_text || '',
        audio_url: lesson.audio_url || null,
        images: lesson.images || []
      },
      sections: sections.map(({ id, ...rest }) => rest), // remove temp/real id
      activities: activities.map(({ id, ...rest }) => rest),
      vocabulary: vocabulary.map(({ id, ...rest }) => rest)
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${lesson.title || 'lesson'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ---------- IMPORT ----------
  const fileInputRef = useRef(null)

  function handleImportClick() {
    fileInputRef.current.click()
  }

  function handleImportFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        if (!data.lesson) throw new Error('Invalid lesson file: missing "lesson"')
        // Replace state
        setLesson({
          title: data.lesson.title || 'Untitled',
          level: data.lesson.level || 'B1',
          reading_text: data.lesson.reading_text || '',
          audio_url: data.lesson.audio_url || null,
          images: data.lesson.images || []
        })
        // Re‑generate temp IDs for sections, activities, vocabulary
        const newSections = (data.sections || []).map((s, i) => ({
          id: `temp-${Date.now()}-${i}-${Math.random()}`,
          title: s.title || '',
          intro_text: s.intro_text || ''
        }))
        setSections(newSections)
        // Map old section IDs to new ones for activities
        const oldToNew = {}
        ;(data.sections || []).forEach((old, i) => {
          oldToNew[old.id] = newSections[i].id
        })
        const newActivities = (data.activities || []).map((a, i) => ({
          id: `temp-${Date.now()}-${i}-${Math.random()}`,
          type: a.type || 'gap_fill',
          prompt: a.prompt || '',
          config: a.config || {},
          points: a.points ?? 1,
          section_id: a.section_id ? oldToNew[a.section_id] || null : null
        }))
        setActivities(newActivities)
        const newVocabulary = (data.vocabulary || []).map((v, i) => ({
          id: `temp-${Date.now()}-${i}-${Math.random()}`,
          term: v.term || '',
          definition: v.definition || '',
          example: v.example || ''
        }))
        setVocabulary(newVocabulary)
        // Clear any previous error
        setError(null)
        // Navigate to builder without id (new lesson) if not editing, else keep id? Better to clear id by navigating to /builder
        if (isEditing) {
          // If editing, we replace the current data but keep the same lesson id – user can save to overwrite or save as new.
          // We'll keep the id as is, but the data is replaced. Saving will update the existing lesson.
          // But we removed the id from sections etc., so it's safe.
        }
      } catch (err) {
        setError('Failed to import lesson: ' + err.message)
      }
    }
    reader.readAsText(file)
    // Reset input so the same file can be re-uploaded
    e.target.value = ''
  }

  // ---------- RENDER ----------
  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="card p-6 border-crest bg-crestSoft text-crest">
          <p>{error}</p>
          <button className="btn-secondary mt-4" onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  const isPublished = lesson.status === 'published'
  const activityCount = activities.length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-gray-500 hover:text-gray-700">
                ← Dashboard
              </Link>
              <h1 className="text-xl font-display">
                {isEditing ? 'Edit Lesson' : 'New Lesson'}
              </h1>
              {isEditing && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {isPublished ? 'Published' : 'Draft'}
                </span>
              )}
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                {activityCount} activities
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                className="btn-secondary text-sm"
                onClick={handleExport}
              >
                📤 Export
              </button>
              <button
                className="btn-secondary text-sm"
                onClick={handleImportClick}
              >
                📥 Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                className="btn-secondary text-sm"
                onClick={() => handleSave(false)}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
              {!isPublished ? (
                <button
                  className="btn-primary text-sm"
                  onClick={handlePublish}
                  disabled={publishing}
                >
                  {publishing ? 'Publishing…' : 'Publish'}
                </button>
              ) : (
                <button
                  className="text-sm bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  onClick={() => {
                    if (confirm('Unpublish this lesson? It will no longer be accessible to students.')) {
                      handleSave(false)
                    }
                  }}
                >
                  Unpublish
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* -------- Lesson Metadata -------- */}
        <section className="card p-6 space-y-4">
          <h2 className="text-lg font-display">Lesson Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                className="field-input"
                value={lesson.title || ''}
                onChange={(e) => setLesson({ ...lesson, title: e.target.value })}
                placeholder="e.g. The Great Gatsby"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Level</label>
              <select
                className="field-input"
                value={lesson.level || 'B1'}
                onChange={(e) => setLesson({ ...lesson, level: e.target.value })}
              >
                <option value="A1">A1 (Beginner)</option>
                <option value="A2">A2 (Elementary)</option>
                <option value="B1">B1 (Intermediate)</option>
                <option value="B2">B2 (Upper Intermediate)</option>
                <option value="C1">C1 (Advanced)</option>
                <option value="C2">C2 (Proficiency)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Reading Text</label>
            <textarea
              className="field-input"
              rows={6}
              value={lesson.reading_text || ''}
              onChange={(e) => setLesson({ ...lesson, reading_text: e.target.value })}
              placeholder="Paste the main reading text here. Supports inline markup: [B]bold[/B], [I]italic[/I], [UND]underline[/UND], [U]underline[/U]"
            />
            <p className="text-xs text-muted mt-1">
              Use <code className="bg-gray-100 px-1">[B]bold[/B]</code>, <code className="bg-gray-100 px-1">[I]italic[/I]</code>, <code className="bg-gray-100 px-1">[UND]underline[/UND]</code>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Audio</label>
            <div className="flex items-center gap-4 flex-wrap">
              {lesson.audio_url && (
                <div className="flex-1 min-w-[200px]">
                  <AudioPlayer src={lesson.audio_url} />
                </div>
              )}
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleAudioUpload(file)
                  e.target.value = ''
                }}
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Images</label>
            <div className="flex flex-wrap gap-3 mb-2">
              {(lesson.images || []).map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="max-h-32 rounded border border-gray-200" />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                    onClick={() => {
                      const newImages = [...(lesson.images || [])]
                      newImages.splice(i, 1)
                      setLesson({ ...lesson, images: newImages })
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = e.target.files
                if (files && files.length) handleImageUpload(files)
                e.target.value = ''
              }}
              className="text-sm"
            />
          </div>
        </section>

        {/* -------- Sections -------- */}
        <section className="card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-display">Sections (Pages)</h2>
            <button className="btn-secondary text-sm" onClick={addSection}>
              + Add Section
            </button>
          </div>
          <p className="text-xs text-muted">
            Sections group activities into pages. Students see one section at a time.
          </p>
          <div className="space-y-3">
            {sections.map((sec, idx) => (
              <div key={sec.id || idx} className="border border-gray-200 rounded p-4 bg-white">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Title</label>
                      <input
                        className="field-input text-sm"
                        value={sec.title || ''}
                        onChange={(e) => updateSection(idx, 'title', e.target.value)}
                        placeholder="e.g. Comprehension Questions"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Intro Text</label>
                      <input
                        className="field-input text-sm"
                        value={sec.intro_text || ''}
                        onChange={(e) => updateSection(idx, 'intro_text', e.target.value)}
                        placeholder="e.g. Read the text and answer the questions below."
                      />
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {idx > 0 && (
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600 px-1"
                        onClick={() => moveSection(idx, -1)}
                        title="Move up"
                      >
                        ↑
                      </button>
                    )}
                    {idx < sections.length - 1 && (
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600 px-1"
                        onClick={() => moveSection(idx, 1)}
                        title="Move down"
                      >
                        ↓
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-red-400 hover:text-red-600 px-1"
                      onClick={() => removeSection(idx)}
                      title="Remove section"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* -------- Activities -------- */}
        <section className="card p-6 space-y-4" ref={activitiesContainerRef}>
          <div className="sticky top-16 z-10 bg-white -mx-6 px-6 py-3 border-b border-gray-200 shadow-sm flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-display">Activities ({activityCount})</h2>
            </div>
            <div className="flex gap-2 flex-wrap">
              {ACTIVITY_TYPES.map((type) => (
                <button
                  key={type.value}
                  className="btn-secondary text-xs"
                  onClick={() => addActivity(type.value)}
                >
                  + {type.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted mt-2">
            Drag activities to reorder. Assign a section to group them into pages.
          </p>
          {activityCount === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded text-sm">
              ⚠️ No activities yet. Add some using the buttons above.
            </div>
          )}
          <div className="space-y-4">
            {activities.map((act, idx) => {
              const Editor = EDITORS[act.type]
              const setInputRef = (el) => {
                if (el) {
                  inputRefs.current[act.id] = el
                } else {
                  delete inputRefs.current[act.id]
                }
              }
              return (
                <div key={act.id || idx} className="border border-gray-200 rounded p-4 bg-white activity-card">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded">
                          {ACTIVITY_TYPES.find(t => t.value === act.type)?.label || act.type}
                        </span>
                        <select
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                          value={act.section_id || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            updateActivity(idx, { ...act, section_id: val || null })
                          }}
                        >
                          <option value="">No section</option>
                          {sections.map((sec, i) => (
                            <option key={sec.id || i} value={sec.id || `temp-${i}`}>
                              {sec.title || `Section ${i + 1}`}
                            </option>
                          ))}
                        </select>
                        <label className="text-xs text-gray-500 flex items-center gap-1">
                          Points:
                          <input
                            type="number"
                            className="w-12 border border-gray-300 rounded px-1 py-0.5 text-xs"
                            value={act.points ?? 1}
                            onChange={(e) => updateActivity(idx, { ...act, points: parseInt(e.target.value) || 1 })}
                            min={1}
                          />
                        </label>
                      </div>
                      <Editor
                        activity={act}
                        onChange={(updated) => updateActivity(idx, updated)}
                        inputRef={setInputRef}
                      />
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {idx > 0 && (
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600 px-1"
                          onClick={() => moveActivity(idx, -1)}
                          title="Move up"
                        >
                          ↑
                        </button>
                      )}
                      {idx < activities.length - 1 && (
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600 px-1"
                          onClick={() => moveActivity(idx, 1)}
                          title="Move down"
                        >
                          ↓
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-red-400 hover:text-red-600 px-1"
                        onClick={() => removeActivity(idx)}
                        title="Remove activity"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* -------- Vocabulary -------- */}
        <section className="card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-display">Vocabulary Support</h2>
            <button className="btn-secondary text-sm" onClick={addVocabularyItem}>
              + Add Word
            </button>
          </div>
          <div className="space-y-2">
            {vocabulary.map((v, idx) => (
              <div key={v.id || idx} className="flex flex-wrap items-center gap-2 border border-gray-200 rounded p-3 bg-white">
                <input
                  className="field-input flex-1 min-w-[100px] text-sm"
                  placeholder="Term"
                  value={v.term || ''}
                  onChange={(e) => updateVocabulary(idx, 'term', e.target.value)}
                />
                <input
                  className="field-input flex-1 min-w-[150px] text-sm"
                  placeholder="Definition"
                  value={v.definition || ''}
                  onChange={(e) => updateVocabulary(idx, 'definition', e.target.value)}
                />
                <input
                  className="field-input flex-1 min-w-[150px] text-sm"
                  placeholder="Example (optional)"
                  value={v.example || ''}
                  onChange={(e) => updateVocabulary(idx, 'example', e.target.value)}
                />
                <button
                  type="button"
                  className="text-red-400 hover:text-red-600 px-2"
                  onClick={() => removeVocabulary(idx)}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* -------- Bottom Navigation -------- */}
        <div className="flex justify-between items-center border-t border-gray-200 pt-6">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Dashboard
          </Link>
          <div className="flex gap-3">
            <button
              className="btn-secondary"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            {!isPublished ? (
              <button
                className="btn-primary"
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
            ) : (
              <button
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                onClick={() => {
                  if (confirm('Unpublish this lesson? It will no longer be accessible to students.')) {
                    handleSave(false)
                  }
                }}
              >
                Unpublish
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}