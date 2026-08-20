// src/components/SaveExitButton.jsx
import { useState } from 'react';

export default function SaveExitButton({ onSave, isLoading, slug }) {
  const [saving, setSaving] = useState(false);

  const handleClick = async () => {
    if (saving || isLoading) return;
    setSaving(true);
    try {
      await onSave();
    } catch (err) {
      alert('Failed to save. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={saving || isLoading}
      className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg shadow-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 min-h-[44px] whitespace-nowrap"
    >
      {saving ? 'Saving...' : '💾 Save & Exit'}
    </button>
  );
}