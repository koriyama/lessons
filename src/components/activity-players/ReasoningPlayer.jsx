const SUBTYPE_HINTS = {
  claim: 'State the claim clearly, in your own words.',
  evidence: 'Point to the specific evidence the text uses, and say what it supports.',
  assumption: 'Name the assumption, then explain why the text depends on it.',
  relationship: 'Explain how the two ideas connect — cause, contrast, support, or condition.'
}

export default function ReasoningPlayer({ activity, value, onChange }) {
  const hint = SUBTYPE_HINTS[activity.config?.subtype] || ''
  return (
    <div>
      <p className="leading-relaxed mb-1">{activity.prompt}</p>
      {hint && <p className="text-xs text-muted mb-2">{hint}</p>}
      <textarea
        className="field-input"
        rows={4}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Support your answer with reference to the text."
      />
    </div>
  )
}
