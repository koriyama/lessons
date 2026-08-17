import { useEffect, useMemo, useState, memo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  getLessonBySlug,
  getDraftLessonBySlug,
  listSections,
  listActivities,
  listVocabulary,
  startSubmission,
  completeSubmission
} from '../lib/api'
import { gradeActivity, isAutoGraded } from '../lib/grading'
import { renderInline } from '../lib/inlineMarkup.jsx'
import AudioPlayer from '../components/AudioPlayer.jsx'
import ReadingText from '../components/ReadingText.jsx'
import GapFillPlayer from '../components/activity-players/GapFillPlayer.jsx'
import MultipleChoicePlayer from '../components/activity-players/MultipleChoicePlayer.jsx'
import ShortAnswerPlayer from '../components/activity-players/ShortAnswerPlayer.jsx'
import ReasoningPlayer from '../components/activity-players/ReasoningPlayer.jsx'
import { useLessonProgress } from '../hooks/useLessonProgress';
import { SaveExitButton } from '../components/SaveExitButton';

const PLAYERS = {
  gap_fill: GapFillPlayer,
  multiple_choice: MultipleChoicePlayer,
  short_answer: ShortAnswerPlayer,
  reasoning: ReasoningPlayer
}

const STAGE_LABEL = {
  gap_fill: 'Comprehension',
  multiple_choice: 'Comprehension',
  short_answer: 'Evidence-based response',
  reasoning: 'Reasoning'
}

// ---------- Memoised Reference Panel ----------
const ReferencePanel = memo(function ReferencePanel({
  lesson,
  vocabulary,
  showAudio,
  setShowAudio,
  showReading,
  setShowReading,
  showVocab,
  setShowVocab
}) {
  return (
    <div className="space-y-6">
      {/* Audio */}
      {lesson.audio_url && (
        <div>
          <button
            className="flex items-center justify-between w-full text-left mb-2"
            onClick={() => setShowAudio((v) => !v)}
          >
            <span className="rail-label">audio</span>
            <span className="text-xs text-muted">{showAudio ? 'hide' : 'show'}</span>
          </button>
          {showAudio && <AudioPlayer src={lesson.audio_url} />}
        </div>
      )}

      {lesson.images?.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {lesson.images.map((url) => (
            <img key={url} src={url} alt="" className="max-h-56 rounded-sm border border-rule" />
          ))}
        </div>
      )}

      {/* Reading */}
      {lesson.reading_text && (
        <div>
          <button
            className="flex items-center justify-between w-full text-left mb-2"
            onClick={() => setShowReading((v) => !v)}
          >
            <span className="rail-label">reading</span>
            <span className="text-xs text-muted">{showReading ? 'hide' : 'show'}</span>
          </button>
          {showReading && <ReadingText text={lesson.reading_text} />}
        </div>
      )}

      {/* Vocabulary */}
      {vocabulary.length > 0 && (
        <div className="card p-6">
          <button
            className="flex items-center justify-between w-full text-left"
            onClick={() => setShowVocab((v) => !v)}
          >
            <span className="rail-label">vocabulary support</span>
            <span className="text-xs text-muted">{showVocab ? 'hide' : 'show'}</span>
          </button>
          {showVocab && (
            <dl className="mt-4 space-y-3">
              {vocabulary.map((v) => (
                <div key={v.id}>
                  <dt className="font-medium">{v.term}</dt>
                  <dd className="text-sm text-muted">{v.definition}</dd>
                  {v.example && <dd className="text-sm italic text-muted">“{v.example}”</dd>}
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  );
});

export default function StudentLesson() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const isDraftPreview = searchParams.get('draft') === 'true'

  const [lesson, setLesson] = useState(null)
  const [sections, setSections] = useState([])
  const [activities, setActivities] = useState([])
  const [vocabulary, setVocabulary] = useState([])
  const [error, setError] = useState(null)

  const [studentName, setStudentName] = useState('')
  const [submissionId, setSubmissionId] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Toggle states – all default to 'true' (expanded)
  const [showAudio, setShowAudio] = useState(true)
  const [showReading, setShowReading] = useState(true)
  const [showVocab, setShowVocab] = useState(true)

  const [pageIndex, setPageIndex] = useState(0)

  // ---------- 1. Load lesson data ----------
  useEffect(() => {
    ;(async () => {
      try {
        const fetchLesson = isDraftPreview ? getDraftLessonBySlug : getLessonBySlug
        const l = await fetchLesson(slug)
        setLesson(l)
        setSections(await listSections(l.id))
        setActivities(await listActivities(l.id))
        setVocabulary(await listVocabulary(l.id))
      } catch (e) {
        setError('This lesson link is not available. Check the link with your teacher.')
      }
    })()
  }, [slug, isDraftPreview])

  // ---------- 2. Define pages ----------
  const pages = useMemo(() => {
    if (sections.length === 0) {
      return [{ title: null, intro_text: null, activities }]
    }
    const grouped = sections.map((s) => ({
      title: s.title,
      intro_text: s.intro_text,
      activities: activities.filter((a) => a.section_id === s.id)
    }))
    const ungrouped = activities.filter((a) => !a.section_id || !sections.some((s) => s.id === a.section_id))
    if (ungrouped.length) grouped.push({ title: 'Other questions', intro_text: null, activities: ungrouped })
    return grouped
  }, [sections, activities])

  // ---------- 3. Save & Exit hook ----------
  const { progress, loading: progressLoading, save } = useLessonProgress(lesson?.id, studentName);

  // ---------- 4. Restore saved progress ----------
  useEffect(() => {
    if (!progress) return;
    if (progress.draft_answers && Object.keys(progress.draft_answers).length > 0) {
      setAnswers(progress.draft_answers);
    }
    if (progress.current_section_index !== undefined) {
      if (pages.length > 0 && progress.current_section_index < pages.length) {
        setPageIndex(progress.current_section_index);
      }
    }
  }, [progress, pages.length]);

  // ---------- 5. Auto-save (debounced) ----------
  useEffect(() => {
    if (!lesson?.id || activities.length === 0) return;
    const timer = setTimeout(() => {
      save(pageIndex, answers);
    }, 800);
    return () => clearTimeout(timer);
  }, [answers, pageIndex, lesson?.id, activities.length, save]);

  // ---------- 6. Event Handlers ----------
  async function handleStart(e) {
    e.preventDefault()
    if (!studentName.trim()) return
    const submission = await startSubmission(lesson.id, studentName.trim())
    setSubmissionId(submission.id)
  }

  function setAnswer(activityId, value) {
    setAnswers((a) => ({ ...a, [activityId]: value }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      let score = 0
      let maxAutoScore = 0
      const responses = activities.map((activity) => {
        const value = answers[activity.id] ?? ''
        const graded = gradeActivity(activity, value)
        if (isAutoGraded(activity.type)) {
          maxAutoScore += activity.points ?? 1
          score += graded.score || 0
        }
        return {
          activityId: activity.id,
          responseText: value,
          autoCorrect: graded.autoCorrect,
          score: graded.score
        }
      })
      await completeSubmission(submissionId, { score, maxAutoScore, responses })
      save(0, {});
      setResult({ score, maxAutoScore })
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ---------- 7. Restart ----------
  function handleRestart() {
    if (window.confirm('This will delete all your saved progress for this lesson. Are you sure?')) {
      setAnswers({});
      setPageIndex(0);
      save(0, {});
      alert('Progress has been reset. You are back at the start.');
    }
  }

  // ---------- 8. Navigation (SCROLL FIX) ----------
  function goNext() {
    if (isLastPage) {
      handleSubmit()
    } else {
      setPageIndex((p) => p + 1)
      // Wait for the DOM to update, then scroll to top
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    }
  }

  function goBack() {
    setPageIndex((p) => Math.max(0, p - 1))
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  // ---------- 9. Early Returns ----------
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 max-w-md text-center">
          <p className="text-crest">{error}</p>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Loading lesson…</p>
      </div>
    )
  }

  if (!submissionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <form onSubmit={handleStart} className="card p-8 max-w-sm w-full space-y-4">
          <p className="rail-label">{lesson.level}</p>
          <h1 className="text-2xl font-display">{lesson.title}</h1>
          <div className="text-sm text-muted space-y-1">
            <p>Enter your name to begin this lesson.</p>
            <p>名前を入力してください。</p>
            <p className="mt-2">Please use the <strong>exact same name</strong> you used before to continue your saved lesson.</p>
            <p>以前使用したものと<strong>まったく同じ名前</strong>を入力して、続きを再開してください。</p>
          </div>
          <input
            className="field-input"
            placeholder="Full name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            autoFocus
          />
          <button className="btn-primary w-full" type="submit">
            Begin lesson
          </button>
        </form>
      </div>
    )
  }

  if (result) {
    const hasAuto = result.maxAutoScore > 0
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 max-w-md w-full text-center space-y-3">
          <p className="text-forest text-3xl">✓</p>
          <h1 className="text-2xl font-display">Lesson complete</h1>
          <p className="text-muted text-sm">Thank you, {studentName}. Your responses have been recorded.</p>
          {hasAuto && (
            <p className="font-mono text-sm">
              Auto-marked score: {result.score} / {result.maxAutoScore}
            </p>
          )}
          <p className="text-xs text-muted">
            Short-answer and reasoning responses will be reviewed by your teacher.
          </p>
        </div>
      </div>
    )
  }

  // ---------- 10. Main Lesson View ----------
  const isPaginated = sections.length > 0
  const currentPage = pages[pageIndex] || pages[0]
  const isLastPage = pageIndex === pages.length - 1
  const hasReference = Boolean(lesson.audio_url || lesson.reading_text || lesson.images?.length || vocabulary.length)

  return (
    <div className="min-h-screen">
      {/* ---------- NEW & IMPROVED HEADER (Mobile-friendly) ---------- */}
      <header className="border-b border-rule bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-3">
          {/* Row 1: Level + Page info | Buttons */}
          <div className="flex flex-wrap justify-between items-center gap-2">
            <p className="rail-label mb-0 text-xs sm:text-sm">
              {lesson.level} · English On Demand Lesson
              {isPaginated && ` · page ${pageIndex + 1} of ${pages.length}`}
              {isDraftPreview && <span className="ml-2 text-orange-500 font-medium">(DRAFT PREVIEW)</span>}
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleRestart}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 transition-colors min-h-[44px] flex items-center"
              >
                🔄 Restart
              </button>
              <SaveExitButton
                onSave={() => save(pageIndex, answers)}
                isLoading={progressLoading}
                slug={slug}
              />
            </div>
          </div>
          {/* Row 2: Lesson Title (clean, on its own line) */}
          <h1 className="text-xl sm:text-2xl font-display mt-1 leading-tight">{lesson.title}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {/* ---------- TOP NAVIGATION BAR ---------- */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          {isPaginated && pageIndex > 0 ? (
            <button className="btn-secondary text-sm" onClick={goBack}>
              ← Back
            </button>
          ) : (
            <span />
          )}
          <span className="text-sm text-gray-400">
            {isPaginated && `Page ${pageIndex + 1} of ${pages.length}`}
          </span>
          <button className="btn-primary text-sm" onClick={goNext} disabled={submitting}>
            {isLastPage ? (submitting ? 'Submitting…' : 'Submit lesson') : 'Next →'}
          </button>
        </div>

        {/* ---------- SECTION TITLE & INSTRUCTIONS (MOVED TO THE TOP) ---------- */}
        {isPaginated && currentPage.title && (
          <div className="mb-4">
            <h2 className="text-xl font-display mb-1">{renderInline(currentPage.title, 'sec-title')}</h2>
            {currentPage.intro_text && (
              <p className="text-sm text-muted">{renderInline(currentPage.intro_text, 'sec-intro')}</p>
            )}
          </div>
        )}

        {/* ---------- MAIN CONTENT (Reference Panel + Activities) ---------- */}
        <div className={hasReference ? 'grid grid-cols-1 lg:grid-cols-2 lg:gap-10 lg:items-start' : 'max-w-3xl mx-auto'}>
          {hasReference && (
            <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pb-6 mb-8 lg:mb-0">
              <ReferencePanel
                lesson={lesson}
                vocabulary={vocabulary}
                showAudio={showAudio}
                setShowAudio={setShowAudio}
                showReading={showReading}
                setShowReading={setShowReading}
                showVocab={showVocab}
                setShowVocab={setShowVocab}
              />
            </div>
          )}

          <div>
            {/* Activities */}
            <div className="space-y-4">
              {currentPage.activities.map((activity) => {
                const Player = PLAYERS[activity.type]
                const globalIndex = activities.findIndex((a) => a.id === activity.id)
                return (
                  <div key={activity.id} className="card p-6">
                    <p className="rail-label mb-3">
                      {String(globalIndex + 1).padStart(2, '0')} · {STAGE_LABEL[activity.type]}
                    </p>
                    <Player
                      activity={activity}
                      value={answers[activity.id]}
                      onChange={(v) => setAnswer(activity.id, v)}
                    />
                  </div>
                )
              })}
            </div>

            {/* Bottom Navigation */}
            <div className="flex justify-between pt-6">
              {isPaginated && pageIndex > 0 ? (
                <button className="btn-secondary" onClick={goBack}>
                  ← Back
                </button>
              ) : (
                <span />
              )}
              <button className="btn-primary" onClick={goNext} disabled={submitting}>
                {isLastPage ? (submitting ? 'Submitting…' : 'Submit lesson') : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}