const SUBTYPES = [
  { value: 'claim', label: 'Identify a claim' },
  { value: 'evidence', label: 'Identify evidence' },
  { value: 'assumption', label: 'Identify an assumption' },
  { value: 'relationship', label: 'Explain a relationship between ideas' }
]

export default function ReasoningEditor({ activity, onChange }) {
  const subtype = activity.config?.subtype || 'claim'

  return (
    <div className="space-y-3">
      <div>
        <label className="field-label">Reasoning focus</label>
        <select
          className="field-input"
          value={subtype}
          onChange={(e) => onChange({ ...activity, config: { ...activity.config, subtype: e.target.value } })}
        >
          {SUBTYPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">Question / task</label>
        <textarea
          className="field-input"
          rows={3}
          value={activity.prompt}
          onChange={(e) => onChange({ ...activity, prompt: e.target.value })}
          placeholder="What assumption about democracy is challenged in the final paragraph? Explain, with reference to the text."
        />
      </div>
      <p className="text-xs text-muted">
        Reasoning responses are stored for you to review, like short answers — the value here is in the
        thinking, not a single correct string.
      </p>
    </div>
  )
}
