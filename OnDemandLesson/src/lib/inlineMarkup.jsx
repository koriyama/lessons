// Shared by any component that displays teacher-written text and should
// understand the same lightweight markup: **word** for bold, *word* for
// italic. Kept in one place so "does bold/italic work here?" has one answer,
// not one answer per component.
export function renderInline(text, keyPrefix) {
  if (!text) return text
  const parts = []
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let lastIndex = 0
  let match
  let i = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    if (match[1] !== undefined) {
      parts.push(<strong key={`${keyPrefix}-${i++}`}>{match[1]}</strong>)
    } else {
      parts.push(<em key={`${keyPrefix}-${i++}`}>{match[2]}</em>)
    }
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}
