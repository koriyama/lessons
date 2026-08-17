import { useState } from 'react';

export function SaveExitButton({ onSave, isLoading }) {
  const [saving, setSaving] = useState(false);

  const handleClick = async () => {
    setSaving(true);
    try {
      await onSave();
      // Reload the current page to reset state and show the name entry screen
      window.location.reload();
    } catch (err) {
      alert('Failed to save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={saving || isLoading}
      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg shadow-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
    >
      {saving ? 'Saving...' : '💾 Save & Exit'}
    </button>
  );
}