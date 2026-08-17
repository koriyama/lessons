import { renderInline } from '../lib/inlineMarkup.jsx'

export default function ReadingText({ text }) {
  const paragraphs = (text || '').split('\n').filter((p) => p.trim().length)
  return (
    <div className="card p-6 md:p-8">
      <p className="rail-label mb-4">reading</p>
      <div className="font-display text-[1.05rem] leading-relaxed text-ink space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i}>{renderInline(p, `read-${i}`)}</p>
        ))}
      </div>
    </div>
  )
}
