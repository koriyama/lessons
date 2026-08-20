// src/components/activity-players/GapFillPlayer.jsx
import { renderInline } from '../../lib/inlineMarkup';

export default function GapFillPlayer({ activity, value = '', onChange, disabled, autoFocus }) {
  const config = activity.config || {};
  const prompt = activity.prompt || '';
  const textWithBlanks = config.text || '';

  // Parse the text to extract blanks and text segments
  const parts = [];
  let blankIndex = 0;
  let lastIndex = 0;
  const regex = /(\[\[.*?\]\]|____|___)/g;
  let match;

  while ((match = regex.exec(textWithBlanks)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: textWithBlanks.slice(lastIndex, match.index)
      });
    }
    parts.push({
      type: 'blank',
      index: blankIndex++
    });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < textWithBlanks.length) {
    parts.push({
      type: 'text',
      content: textWithBlanks.slice(lastIndex)
    });
  }

  const blankValues = value ? value.split(',').map(s => s.trim()) : [];

  if (!textWithBlanks) {
    return (
      <div className="space-y-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
        {prompt && <div className="text-sm font-medium">{renderInline(prompt)}</div>}
        <p className="text-yellow-700 dark:text-yellow-300 text-sm">⚠️ This gap-fill activity has no text.</p>
      </div>
    );
  }

  if (blankIndex === 0) {
    return (
      <div className="space-y-2">
        {prompt && <div className="text-sm font-medium">{renderInline(prompt)}</div>}
        <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {renderInline(textWithBlanks)}
        </div>
        <p className="text-xs text-gray-400">No blanks found in this activity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {prompt && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {renderInline(prompt)}
        </div>
      )}

      <div className="text-base text-gray-800 dark:text-gray-200 leading-relaxed">
        {parts.map((part, idx) => {
          if (part.type === 'text') {
            return <span key={`text-${idx}`}>{renderInline(part.content)}</span>;
          }
          return (
            <input
              key={`blank-${idx}`}
              type="text"
              value={blankValues[part.index] || ''}
              onChange={(e) => {
                const newValues = [...blankValues];
                newValues[part.index] = e.target.value;
                onChange(newValues.join(', '));
              }}
              disabled={disabled}
              autoFocus={autoFocus && part.index === 0}
              className="mx-1 px-2 py-0.5 border-b-2 border-blue-400 bg-transparent focus:outline-none focus:border-blue-600 min-w-[80px] w-auto inline-block text-center disabled:opacity-50 disabled:border-gray-300"
              placeholder="__"
              style={{ minWidth: '80px' }}
            />
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        {blankIndex} blank{blankIndex > 1 ? 's' : ''} • Enter each answer separated by commas if needed
      </p>
    </div>
  );
}