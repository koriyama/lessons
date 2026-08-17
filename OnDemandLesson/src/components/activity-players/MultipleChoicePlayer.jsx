export default function MultipleChoicePlayer({ activity, value, onChange }) {
  const options = activity.config?.options || []
  return (
    <div className="space-y-2">
      <p className="leading-relaxed mb-2">{activity.prompt}</p>
      {options.map((opt, i) => (
        <label key={i} className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name={`mc-${activity.id}`}
            checked={String(value) === String(i)}
            onChange={() => onChange(String(i))}
            className="mt-1"
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  )
}
