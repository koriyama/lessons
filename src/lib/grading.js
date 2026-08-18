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
  console.log('🔍 Grading gap-fill with config:', config, 'value:', value);

  const studentAnswers = value
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s !== '');

  const correctAnswers = (config.answers || [])
    .map(s => s.trim().toLowerCase())
    .filter(s => s !== '');

  console.log('📝 Student answers:', studentAnswers);
  console.log('✅ Correct answers:', correctAnswers);

  if (correctAnswers.length === 0) {
    console.warn('⚠️ No answer key for gap-fill – returning 0');
    return { score: 0, autoCorrect: null };
  }

  let score = 0;
  for (let i = 0; i < Math.min(studentAnswers.length, correctAnswers.length); i++) {
    if (studentAnswers[i] === correctAnswers[i]) {
      score++;
    }
  }

  const allFilled = studentAnswers.length >= correctAnswers.length;
  const allCorrect = score === correctAnswers.length && allFilled;

  console.log('🏆 Gap-fill score:', score, 'autoCorrect:', allFilled ? allCorrect : null);
  return {
    score: score,
    autoCorrect: allFilled ? allCorrect : null,
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