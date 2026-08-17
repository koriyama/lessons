export default function GapFillEditor({ activity, onChange }) {
  const acceptedText = (activity.config?.accepted_answers || []).join(', ')

  return (
    <div className="space-y-3">
      <div>
        <label className="field-label">Sentence with a gap (use ____ for the blank)</label>
        <input
          className="field-input"
          value={activity.prompt}
          onChange={(e) => onChange({ ...activity, prompt: e.target.value })}
          placeholder="The critical question is whose ____?"
        />
      </div>
      <div>
        <label className="field-label">Accepted answers (comma-separated — allows spelling variants)</label>
        <input
          className="field-input"
          value={acceptedText}
          onChange={(e) =>
            onChange({
              ...activity,
              config: {
                ...activity.config,
                accepted_answers: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              }
            })
          }
          placeholder="values"
        />
      </div>
    </div>
  )
}
