// Central grading logic. Keeping this in one place means the teacher-facing
// preview and the real student submission always agree on what counts as correct.

function normalise(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:'"]/g, '')
}

export function gradeGapFill(activity, response) {
  const accepted = activity.config?.accepted_answers?.length
    ? activity.config.accepted_answers
    : [activity.config?.answer].filter(Boolean)
  const given = normalise(response)
  const isCorrect = accepted.some((a) => normalise(a) === given)
  return { autoCorrect: isCorrect, score: isCorrect ? activity.points ?? 1 : 0 }
}

export function gradeMultipleChoice(activity, response) {
  // response is the index (as string) of the option the student picked
  const correctIndex = activity.config?.correct_index
  const isCorrect = String(correctIndex) === String(response)
  return { autoCorrect: isCorrect, score: isCorrect ? activity.points ?? 1 : 0 }
}

// short_answer and reasoning activities are never auto-marked: they are
// stored for the teacher to read and score by hand, in line with the
// "evidence-based response" pedagogy this app is built around.
export function isAutoGraded(type) {
  return type === 'gap_fill' || type === 'multiple_choice'
}

export function gradeActivity(activity, response) {
  if (activity.type === 'gap_fill') return gradeGapFill(activity, response)
  if (activity.type === 'multiple_choice') return gradeMultipleChoice(activity, response)
  return { autoCorrect: null, score: null }
}
