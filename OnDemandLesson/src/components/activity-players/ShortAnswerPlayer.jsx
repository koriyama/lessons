export default function ShortAnswerPlayer({ activity, value, onChange }) {
  return (
    <div>
      <p className="leading-relaxed mb-2">{activity.prompt}</p>
      <textarea
        className="field-input"
        rows={3}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write your answer here."
      />
    </div>
  )
}
