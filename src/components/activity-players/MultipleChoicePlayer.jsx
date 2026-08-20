// src/components/activity-players/MultipleChoicePlayer.jsx
import { renderInline } from '../../lib/inlineMarkup';

export default function MultipleChoicePlayer({ activity, value = '', onChange, disabled, autoFocus }) {
  const config = activity.config || {};
  const options = config.options || [];
  const prompt = activity.prompt || '';

  console.log('🔍 MultipleChoicePlayer config:', config);
  console.log('🔍 MultipleChoicePlayer options:', options);

  if (!options || options.length === 0) {
    return (
      <div className="space-y-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
        <p className="text-red-700 dark:text-red-300 text-sm font-bold">⚠️ Missing options in multiple-choice</p>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Activity ID: {activity.id}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Config: <pre className="inline bg-gray-100 dark:bg-gray-800 px-1 rounded">{JSON.stringify(config, null, 2)}</pre>
        </p>
        {prompt && <div className="text-sm mt-2">{renderInline(prompt)}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {prompt && <div className="text-sm font-medium">{renderInline(prompt)}</div>}
      <div className="space-y-1.5">
        {options.map((option, idx) => {
          const isChecked = parseInt(value, 10) === idx;
          return (
            <label key={idx} className="flex items-center gap-2 cursor-pointer text-gray-800 dark:text-gray-200">
              <input
                type="radio"
                name={`mc-${activity.id}`}
                value={idx}
                checked={isChecked}
                onChange={() => onChange(String(idx))}
                disabled={disabled}
                autoFocus={autoFocus && idx === 0}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}