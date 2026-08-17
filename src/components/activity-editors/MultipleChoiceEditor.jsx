export default function MultipleChoiceEditor({ activity, onChange }) {
  const options = activity.config?.options?.length ? activity.config.options : ['', '']
  const correctIndex = activity.config?.correct_index ?? 0

  function setOption(index, value) {
    const next = [...options]
    next[index] = value
    onChange({ ...activity, config: { ...activity.config, options: next } })
  }

  function addOption() {
    onChange({ ...activity, config: { ...activity.config, options: [...options, ''] } })
  }

  function removeOption(index) {
    const next = options.filter((_, i) => i !== index)
    const nextCorrect = correctIndex >= next.length ? 0 : correctIndex
    onChange({ ...activity, config: { ...activity.config, options: next, correct_index: nextCorrect } })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="field-label">Question</label>
        <input
          className="field-input"
          value={activity.prompt}
          onChange={(e) => onChange({ ...activity, prompt: e.target.value })}
          placeholder="Which statement best represents the argument of the text?"
        />
      </div>
      <div>
        <label className="field-label">Options — mark the correct one</label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${activity.id || 'new'}`}
                checked={correctIndex === i}
                onChange={() => onChange({ ...activity, config: { ...activity.config, correct_index: i } })}
              />
              <input
                className="field-input"
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
              {options.length > 2 && (
                <button type="button" className="btn-ghost text-xs" onClick={() => removeOption(i)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost text-xs mt-2" onClick={addOption}>
          + Add option
        </button>
      </div>
    </div>
  )
}
