import { renderInline } from '../lib/inlineMarkup.jsx'

export default function ReadingText({ text }) {
  if (!text) return null
  return (
    <div className="whitespace-pre-wrap break-words text-ink">
      {renderInline(text, 'reading-text')}
    </div>
  )
}