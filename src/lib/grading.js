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
      return { score: 0, autoCorrect: null, maxScore: 0 };
  }
}

export function gradeGapFill(config, value) {
  const studentAnswers = value
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s !== '');

  const correctAnswerSets = (config.answers || [])
    .map(item => item.split('|').map(s => s.trim().toLowerCase()).filter(Boolean));

  if (correctAnswerSets.length === 0) {
    return { score: 0, autoCorrect: null, maxScore: 0 };
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

  const allFilled = studentAnswers.length >= correctAnswerSets.length;
  if (studentAnswers.length > correctAnswerSets.length) {
    allCorrect = false;
  }

  const autoCorrect = allFilled ? allCorrect : null;

  return {
    score: score,
    autoCorrect: autoCorrect,
    maxScore: correctAnswerSets.length,
  };
}

export function gradeMultipleChoice(config, value) {
  const correctIndex = config.correctIndex;
  if (correctIndex === undefined || correctIndex === null) {
    return { score: 0, autoCorrect: null, maxScore: 1 };
  }
  const selected = parseInt(value, 10);
  const isCorrect = selected === correctIndex;
  return {
    score: isCorrect ? 1 : 0,
    autoCorrect: isCorrect,
    maxScore: 1,
  };
}

function gradeShortAnswer(config, value) {
  return { score: 0, autoCorrect: null, maxScore: 0 };
}

function gradeReasoning(config, value) {
  return { score: 0, autoCorrect: null, maxScore: 0 };
}