export default function ShortAnswerEditor({ activity, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="field-label">Question</label>
        <input
          className="field-input"
          value={activity.prompt}
          onChange={(e) => onChange({ ...activity, prompt: e.target.value })}
          placeholder="Why does separation of powers matter?"
        />
      </div>
      <p className="text-xs text-muted">
        Short-answer responses are stored for you to review — they are not auto-marked.
      </p>
    </div>
  )
}
