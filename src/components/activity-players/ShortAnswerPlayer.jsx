import { renderInline } from '../../lib/inlineMarkup.jsx';

export default function ShortAnswerPlayer({ activity, value, onChange }) {
  const config = activity.config || {};
  const prompt = activity.prompt || 'Write your answer:';
  const suggestedAnswer = config.suggestedAnswer || '';

  const preventPaste = (e) => {
    e.preventDefault();
    return false;
  };

  return (
    <div className="text-ink space-y-2">
      {prompt && <div className="text-sm text-muted">{renderInline(prompt)}</div>}
      <textarea
        className="w-full border-b border-ink bg-transparent px-1 py-1 outline-none focus:border-crest resize-y min-h-[80px]"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onPaste={preventPaste}
        onDrop={preventPaste}
        onContextMenu={preventPaste}
        placeholder="Type your answer here..."
      />
      {suggestedAnswer && (
        <p className="text-xs text-muted italic">Suggested answer: {suggestedAnswer}</p>
      )}
    </div>
  );
}