export default function GapFillPlayer({ activity, value, onChange }) {
  const parts = activity.prompt.split('____')
  return (
    <div className="text-ink">
      <p className="leading-relaxed">
        {parts[0]}
        <input
          className="inline-block w-40 border-b-2 border-ink bg-transparent px-1 mx-1 outline-none focus:border-crest"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
        {parts[1]}
      </p>
    </div>
  )
}
