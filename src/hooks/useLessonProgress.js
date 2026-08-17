import { useState, useEffect, useCallback } from 'react';

/**
 * Temporary local-storage version with sessionStorage for name recall.
 */
export function useLessonProgress(lessonId, studentIdentifier) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const storageKey = `lesson_progress_${lessonId}_${studentIdentifier || 'anonymous'}`;

  useEffect(() => {
    setLoading(true);
    if (!lessonId || !studentIdentifier) {
      setProgress(null);
      setLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setProgress(JSON.parse(stored));
      } else {
        setProgress(null);
      }
    } catch (err) {
      console.warn('Failed to read progress from localStorage:', err);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [storageKey, lessonId, studentIdentifier]);

  const save = useCallback(async (sectionIdx, answers) => {
    if (!lessonId || !studentIdentifier) {
      console.warn('Cannot save: missing lessonId or studentIdentifier');
      return;
    }

    try {
      const data = {
        student_identifier: studentIdentifier,
        lesson_id: lessonId,
        current_section_index: sectionIdx,
        current_activity_index: 0,
        draft_answers: answers,
        updated_at: new Date().toISOString()
      };

      localStorage.setItem(storageKey, JSON.stringify(data));
      setProgress(data);

      // 🔥 NEW: Remember this student name for this lesson
      sessionStorage.setItem(`last_lesson_student_${lessonId}`, studentIdentifier);

      return data;
    } catch (err) {
      console.error('Save to localStorage failed:', err);
      throw err;
    }
  }, [lessonId, studentIdentifier, storageKey]);

  return { progress, loading, save };
}