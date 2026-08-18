import { useState } from 'react';

export default function GapFillPlayer({ activity, value, onChange }) {
  const config = activity.config || {};
  const text = config.text || '';
  const prompt = activity.prompt || 'Fill in the blanks';

  // Parse blanks from text (supports [[ ]] and ____)
  const parts = [];
  if (text.includes('[[') && text.includes(']]')) {
    const regex = /\[\[(.*?)\]\]/g;
    let match;
    let lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);
      if (before) parts.push({ type: 'text', content: before });
      parts.push({ type: 'blank', content: match[1] || '' });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }
  } else if (text.includes('____')) {
    const segs = text.split('____');
    parts.push({ type: 'text', content: segs[0] });
    for (let i = 1; i < segs.length; i++) {
      parts.push({ type: 'blank', content: '' });
      if (i < segs.length - 1 || segs[i]) {
        parts.push({ type: 'text', content: segs[i] });
      }
    }
  }

  const blankCount = parts.filter(p => p.type === 'blank').length;

  // Initialize from prop value (comma-separated) or empty array – only on mount
  const getInitialAnswers = () => {
    if (!value || typeof value !== 'string') return new Array(blankCount || 1).fill('');
    const vals = value.split(',').map(s => s.trim());
    while (vals.length < (blankCount || 1)) vals.push('');
    return vals.slice(0, blankCount || 1);
  };

  // No useEffect – keep local state independent of parent
  const [answers, setAnswers] = useState(getInitialAnswers);

  const handleBlankChange = (index, newVal) => {
    const newAnswers = [...answers];
    newAnswers[index] = newVal;
    setAnswers(newAnswers);
    // Combine into comma-separated string for parent
    const combined = newAnswers.join(', ');
    onChange(combined);
  };

  // If no blanks, show free-text input
  if (blankCount === 0 || !text || text.trim() === '') {
    return (
      <div className="text-ink">
        {prompt && <p className="text-sm text-muted mb-2">{prompt}</p>}
        <input
          type="text"
          className="w-full border-b-2 border-ink bg-transparent px-1 py-1 outline-none focus:border-crest"
          value={answers[0] || ''}
          onChange={(e) => {
            const val = e.target.value;
            setAnswers([val]);
            onChange(val);
          }}
          placeholder="Type your answer here..."
        />
        {!text && <p className="text-xs text-muted mt-1">(No gap text defined – free response)</p>}
      </div>
    );
  }

  // Render with blanks
  return (
    <div className="text-ink">
      {prompt && <p className="text-sm text-muted mb-2">{prompt}</p>}
      <div className="leading-relaxed">
        {parts.map((part, idx) => {
          if (part.type === 'text') {
            return <span key={idx}>{part.content}</span>;
          } else {
            const blankIndex = parts.slice(0, idx).filter(p => p.type === 'blank').length - 1;
            return (
              <input
                key={idx}
                type="text"
                className="inline-block w-40 border-b-2 border-ink bg-transparent px-1 mx-1 outline-none focus:border-crest"
                value={answers[blankIndex] || ''}
                onChange={(e) => handleBlankChange(blankIndex, e.target.value)}
                placeholder="..."
              />
            );
          }
        })}
      </div>
    </div>
  );
}