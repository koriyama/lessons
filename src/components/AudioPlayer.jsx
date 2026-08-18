export default function AudioPlayer({ src }) {
  if (!src) return null
  return (
    <div className="card p-4">
      <audio controls preload="metadata" src={src} className="w-full">
        Your browser does not support the audio element.
      </audio>
    </div>
  )
}
