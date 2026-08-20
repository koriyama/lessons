// src/pages/StudentLesson.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  getLessonBySlug, 
  getDraftLessonBySlug, 
  listSections, 
  listActivities,
  listVocabulary, 
  saveSubmission, 
  getSubmission 
} from '../lib/api';
import { gradeGapFill, gradeMultipleChoice } from '../lib/grading';
import { renderInline } from '../lib/inlineMarkup';
import GapFillPlayer from '../components/activity-players/GapFillPlayer';
import MultipleChoicePlayer from '../components/activity-players/MultipleChoicePlayer';
import ShortAnswerPlayer from '../components/activity-players/ShortAnswerPlayer';
import ReasoningPlayer from '../components/activity-players/ReasoningPlayer';
import ReferenceDrawer from '../components/ReferenceDrawer';
import SaveExitButton from '../components/SaveExitButton';

export default function StudentLesson() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('draft') === 'true';

  const [lesson, setLesson] = useState(null);
  const [sections, setSections] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [studentName, setStudentName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submissionId, setSubmissionId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);

  const saveTimer = useRef(null);
  const isSaving = useRef(false);

  const activitiesContainerRef = useRef(null);

  // Load lesson (unchanged)
  useEffect(() => {
    async function loadLesson() {
      try {
        console.log('🔍 Starting loadLesson, isPreview:', isPreview, 'slug:', slug);
        
        let data;
        if (isPreview) {
          data = await getDraftLessonBySlug(slug);
        } else {
          data = await getLessonBySlug(slug);
        }
        if (!data) throw new Error('Lesson not found');
        console.log('📦 Lesson data:', data);
        setLesson(data);

        const loadedVocabulary = await listVocabulary(data.id);
        console.log('📚 Vocabulary loaded:', loadedVocabulary);
        setVocabulary(loadedVocabulary || []);

        let loadedSections = await listSections(data.id);
        const allActivities = await listActivities(data.id);
        console.log('📊 All activities loaded:', allActivities);

        const activitiesBySection = {};
        allActivities.forEach(act => {
          const secId = act.section_id;
          if (!secId) return;
          if (!activitiesBySection[secId]) activitiesBySection[secId] = [];
          activitiesBySection[secId].push(act);
        });
        Object.keys(activitiesBySection).forEach(secId => {
          activitiesBySection[secId].sort((a, b) => (a.position || 0) - (b.position || 0));
        });

        loadedSections = loadedSections.map(section => ({
          ...section,
          activities: activitiesBySection[section.id] || []
        }));
        console.log('📚 Final sections with activities:', loadedSections);
        setSections(loadedSections || []);

        if (!isPreview) {
          const storedName = localStorage.getItem(`smiley_student_name_${slug}`);
          if (storedName) {
            setStudentName(storedName);
            setNameSubmitted(true);
            const existing = await getSubmission(slug, storedName);
            if (existing) {
              console.log('📋 Found existing submission:', existing.id);
              setSubmissionId(existing.id);
              setCurrentPage(existing.current_page || 0);
              setAnswers(existing.answers || {});
              if (existing.submitted_at) {
                setIsSubmitted(true);
                setScore(existing.score);
              }
            } else {
              console.log('ℹ️ No existing submission found');
            }
          }
        }
      } catch (err) {
        console.error('❌ Error loading lesson:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadLesson();
  }, [slug, isPreview]);

  // Auto-save (unchanged)
  const saveDraft = useCallback(async () => {
    if (isPreview || isSubmitted || !submissionId) return;
    if (isSaving.current) return;

    isSaving.current = true;
    try {
      await saveSubmission(submissionId, {
        current_page: currentPage,
        answers,
      });
      console.log('✅ Auto-save successful');
    } catch (err) {
      console.error('❌ Auto-save failed:', err);
    } finally {
      isSaving.current = false;
    }
  }, [isPreview, isSubmitted, submissionId, currentPage, answers]);

  useEffect(() => {
    if (!submissionId || isPreview || isSubmitted) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveDraft, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [saveDraft, submissionId, isPreview, isSubmitted, answers, currentPage]);

  // ---- Autofocus on page change ----
  useEffect(() => {
    if (loading || sections.length === 0) return;
    const container = activitiesContainerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      const firstInput = container.querySelector('input, textarea, select');
      if (firstInput) {
        firstInput.focus({ preventScroll: true });
      }
    });
  }, [currentPage, sections, loading]);

  // ---- Prevent copying / screenshots on results screen ----
  useEffect(() => {
    if (!isSubmitted) return;

    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e) => {
      // Block Ctrl+C, Ctrl+V, Ctrl+P, Cmd+C, Cmd+V, Cmd+P
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'p')) {
        e.preventDefault();
        return false;
      }
      // Also block F12 (dev tools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
    };

    const handleCopy = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    // We'll attach copy handler to the summary container via onCopy prop

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubmitted]);

  // Handle name submission – reuses existing submission
  const handleNameSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = studentName.trim().toLowerCase();
    if (!trimmedName) return;
    localStorage.setItem(`smiley_student_name_${slug}`, trimmedName);
    setNameSubmitted(true);

    if (!isPreview) {
      try {
        const existing = await getSubmission(slug, trimmedName);
        if (existing) {
          console.log('✅ Reusing existing submission:', existing.id);
          setSubmissionId(existing.id);
          setCurrentPage(existing.current_page || 0);
          setAnswers(existing.answers || {});
        } else {
          const { data, error } = await supabase
            .from('submissions')
            .insert({
              lesson_id: lesson.id,
              student_identifier: trimmedName,
              current_page: 0,
              answers: {},
              status: 'in_progress'
            })
            .select()
            .single();

          if (error) throw error;
          console.log('✅ New submission created:', data.id);
          setSubmissionId(data.id);
        }
      } catch (err) {
        console.error('❌ Error with submission:', err);
        alert('Could not start or resume lesson. Please try again.\n\nError: ' + err.message);
      }
    }
  };

  const handleAnswerChange = (activityId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [activityId]: value,
    }));
  };

  const goToPage = (index) => {
    if (index < 0 || index >= sections.length) return;
    setCurrentPage(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle final submission (grading)
  const handleFinalSubmit = async () => {
    if (isPreview || isSubmitted) {
      console.warn('⚠️ Cannot submit: preview or already submitted');
      return;
    }
    if (!submissionId) {
      alert('No submission found. Please restart the lesson.');
      return;
    }

    try {
      let totalScore = 0;
      let maxAutoScore = 0;
      const gradedAnswers = { ...answers };

      sections.forEach((section) => {
        (section.activities || []).forEach((activity) => {
          if (activity.type === 'gap_fill') {
            const result = gradeGapFill(activity.config, gradedAnswers[activity.id] || '');
            gradedAnswers[`${activity.id}_graded`] = result;
            totalScore += result.score;
            maxAutoScore += result.maxScore || 0;
          } else if (activity.type === 'multiple_choice') {
            const result = gradeMultipleChoice(activity.config, gradedAnswers[activity.id]);
            gradedAnswers[`${activity.id}_graded`] = result;
            totalScore += result.score;
            maxAutoScore += result.maxScore || 0;
          }
        });
      });

      const finalScore = maxAutoScore > 0 ? Math.round((totalScore / maxAutoScore) * 100) : 0;
      console.log(`📊 Final score: ${finalScore}% (${totalScore}/${maxAutoScore})`);

      await saveSubmission(submissionId, {
        current_page: currentPage,
        answers: gradedAnswers,
        submitted_at: new Date().toISOString(),
        score: finalScore,
        max_auto_score: maxAutoScore,
        status: 'completed'
      });

      setAnswers(gradedAnswers);
      setIsSubmitted(true);
      setScore(finalScore);
      console.log('✅ Submission completed successfully');
    } catch (err) {
      console.error('❌ Final submission failed:', err);
      alert('Failed to submit. Please try again.');
    }
  };

  // Save & Exit handler
  const handleSaveAndExit = useCallback(async () => {
    if (!submissionId) {
      console.warn('⚠️ Cannot save: no submission ID');
      return;
    }
    try {
      await saveSubmission(submissionId, {
        current_page: currentPage,
        answers,
      });
      console.log('✅ Saved before exit');
      localStorage.removeItem(`smiley_student_name_${slug}`);
      window.location.href = `/lesson/${slug}`;
    } catch (err) {
      console.error('❌ Save & Exit failed:', err);
      alert('Failed to save progress. Please try again.');
    }
  }, [submissionId, currentPage, answers, slug]);

  // Render activity player
  const renderActivity = (activity, index) => {
    if (!activity || !activity.type) {
      return <div className="text-red-500">Invalid activity</div>;
    }

    const questionNumber = index + 1;
    const displayPrompt = activity.prompt ? `Q${questionNumber}. ${activity.prompt}` : `Q${questionNumber}`;
    const activityWithNumber = { ...activity, prompt: displayPrompt };

    const commonProps = {
      key: activity.id,
      activity: activityWithNumber,
      value: answers[activity.id] || '',
      onChange: (val) => handleAnswerChange(activity.id, val),
      disabled: isSubmitted || isPreview,
      autoFocus: index === 0 && currentPage === 0,
    };

    switch (activity.type) {
      case 'gap_fill':
        return <GapFillPlayer {...commonProps} />;
      case 'multiple_choice':
        return <MultipleChoicePlayer {...commonProps} />;
      case 'short_answer':
        return <ShortAnswerPlayer {...commonProps} />;
      case 'reasoning':
        return <ReasoningPlayer {...commonProps} />;
      default:
        return (
          <div className="text-red-500 p-2 bg-red-50 dark:bg-red-900/20 rounded">
            Unknown activity type: {activity.type}
          </div>
        );
    }
  };

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // ---------- Error ----------
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <p className="text-xs text-gray-500 mt-2">Slug: {slug} | Preview: {String(isPreview)}</p>
        </div>
      </div>
    );
  }

  // ---------- Welcome / Name entry ----------
  if (!nameSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {lesson.title}
            </h1>
            {lesson.level && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Level: {lesson.level}
              </p>
            )}
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Please enter your name to start the lesson.
            </p>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
              <p>⚠️ Important: If you return later, use the <strong>exact same name</strong> (case‑sensitive) to continue your progress.</p>
              <p className="mt-1">⏳ Your answers are saved automatically as you go.</p>
            </div>
          </div>

          {isPreview && (
            <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              🔍 PREVIEW MODE
            </span>
          )}
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              autoFocus
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition text-base min-h-[48px]"
            >
              Start Lesson
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---------- Results ----------
  if (isSubmitted) {
    const allActivities = sections.flatMap(s => s.activities || []);
    const answerSummary = allActivities.map((act, idx) => {
      const qNum = idx + 1;
      const rawAnswer = answers[act.id];
      let displayAnswer = rawAnswer || '—';
      
      if (act.type === 'multiple_choice' && rawAnswer !== undefined) {
        const options = act.config?.options || [];
        const selectedIndex = parseInt(rawAnswer, 10);
        displayAnswer = (selectedIndex >= 0 && selectedIndex < options.length) 
          ? options[selectedIndex] 
          : rawAnswer;
      }

      const gradedKey = act.id + '_graded';
      const graded = answers[gradedKey];
      let status = 'teacher review';
      let statusClass = 'bg-yellow-100 text-yellow-700';
      
      if (act.type === 'gap_fill' || act.type === 'multiple_choice') {
        if (graded) {
          if (graded.autoCorrect === true) {
            status = 'correct';
            statusClass = 'bg-green-100 text-green-700';
          } else {
            status = 'incorrect';
            statusClass = 'bg-red-100 text-red-700';
          }
        } else {
          status = 'incorrect';
          statusClass = 'bg-red-100 text-red-700';
        }
      }

      return { qNum, prompt: act.prompt, answer: displayAnswer, status, statusClass };
    });

    return (
      <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Well done! 🎉
            </h2>
            {score !== null && (
              <div className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-2xl font-bold px-6 py-3 rounded-full mt-2">
                {score}%
              </div>
            )}
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              Thank you for your hard work! Your answers have been submitted.
            </p>

            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition"
            >
              {showAnswers ? 'Hide my answers' : '👀 See my answers'}
            </button>

            {/* Integrity warning banner */}
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
              📸 Screenshots and copying are not permitted. Please respect academic integrity.
            </div>
          </div>

          {showAnswers && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Your answers</h3>
              {/* Container with copy prevention */}
              <div
                className="space-y-2 max-h-96 overflow-y-auto select-none no-copy"
                onCopy={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
              >
                {answerSummary.map((item) => (
                  <div key={item.qNum} className="text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Q{item.qNum}:</span>
                      <span className="text-gray-600 dark:text-gray-400">{item.prompt}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-500 dark:text-gray-400">Your answer:</span>
                      <span className="font-mono">{item.answer}</span>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${item.statusClass}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- No sections ----------
  if (!sections || sections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 max-w-md text-center">
          <p className="text-yellow-700 dark:text-yellow-300">This lesson has no sections yet.</p>
        </div>
      </div>
    );
  }

  // ---------- Main player ----------
  const currentSection = sections[currentPage] || null;
  const totalPages = sections.length;
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32 md:pb-8">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 py-3 md:px-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
              {lesson.title}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {isPreview ? '🔍 PREVIEW' : `Student: ${studentName}`}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full whitespace-nowrap">
              {currentPage + 1} / {totalPages}
            </span>
            {!isPreview && submissionId && (
              <SaveExitButton
                onSave={handleSaveAndExit}
                isLoading={false}
                slug={slug}
              />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-8">
        {currentSection && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {renderInline(currentSection.title)}
              </h2>
              {currentSection.intro_text && (
                <div className="text-gray-600 dark:text-gray-300 text-base md:text-lg prose prose-gray dark:prose-invert max-w-none">
                  {renderInline(currentSection.intro_text)}
                </div>
              )}
            </div>

            <div ref={activitiesContainerRef} className="space-y-6">
              {(currentSection.activities || []).map((activity, idx) => (
                <div
                  key={activity.id}
                  className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 md:p-6"
                >
                  {renderActivity(activity, idx)}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {!isFirstPage && (
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  className="flex-1 py-3 px-6 rounded-lg font-medium text-base transition min-h-[48px] bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white"
                >
                  ← Previous
                </button>
              )}

              {isLastPage ? (
                <button
                  onClick={handleFinalSubmit}
                  disabled={isPreview || !submissionId}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium text-base transition min-h-[48px] ${
                    isPreview || !submissionId
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isPreview ? 'Preview Complete' : '📤 Submit Lesson'}
                </button>
              ) : (
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium text-base transition min-h-[48px]"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      <ReferenceDrawer
        lesson={lesson}
        audioUrl={lesson?.audio_url}
        imageUrls={lesson?.images || []}
        vocabulary={vocabulary}
      />
    </div>
  );
}