// src/lib/grading.js

export function isAutoGraded(type) {
  return ['gap_fill', 'multiple_choice'].includes(type);
}

export function gradeActivity(activity, value) {
  const type = activity.type;
  const config = activity.config || {};

  switch (type) {
    case 'gap_fill':
      return gradeGapFill(config, value);
    case 'multiple_choice':
      return gradeMultipleChoice(config, value);
    case 'short_answer':
      return gradeShortAnswer(config, value);
    case 'reasoning':
      return gradeReasoning(config, value);
    default:
      return { score: 0, autoCorrect: null };
  }
}

function gradeGapFill(config, value) {
  const studentAnswers = value
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s !== '');

  // Parse correct answers: each item may contain pipe-separated alternatives
  const correctAnswerSets = (config.answers || [])
    .map(item => item.split('|').map(s => s.trim().toLowerCase()).filter(Boolean));

  if (correctAnswerSets.length === 0) {
    return { score: 0, autoCorrect: null };
  }

  let score = 0;
  let allCorrect = true;

  for (let i = 0; i < Math.min(studentAnswers.length, correctAnswerSets.length); i++) {
    const studentAns = studentAnswers[i] || '';
    const allowed = correctAnswerSets[i] || [];
    const isMatch = allowed.includes(studentAns);
    if (isMatch) {
      score++;
    } else {
      allCorrect = false;
    }
  }

  // If student filled fewer blanks than expected, mark as incomplete
  const allFilled = studentAnswers.length >= correctAnswerSets.length;
  // If there are extra blanks, they are ignored for scoring but we mark as incorrect? Usually we ignore extra.
  // We'll treat extra as not all correct.
  if (studentAnswers.length > correctAnswerSets.length) {
    allCorrect = false;
  }

  const autoCorrect = allFilled ? allCorrect : null;

  return {
    score: score,
    autoCorrect: autoCorrect,
  };
}

function gradeMultipleChoice(config, value) {
  const correctIndex = config.correctIndex;
  if (correctIndex === undefined || correctIndex === null) {
    return { score: 0, autoCorrect: null };
  }
  const selected = parseInt(value, 10);
  const isCorrect = selected === correctIndex;
  return {
    score: isCorrect ? 1 : 0,
    autoCorrect: isCorrect,
  };
}

function gradeShortAnswer(config, value) {
  return { score: 0, autoCorrect: null };
}

function gradeReasoning(config, value) {
  return { score: 0, autoCorrect: null };
}