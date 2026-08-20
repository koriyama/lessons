import React from 'react';

/**
 * Render inline markup with support for **bold**, *italic*, and line breaks.
 * This function escapes HTML and then applies markdown-style formatting.
 */
export function renderInline(text, className = '') {
  if (!text) return null;

  // Escape HTML entities to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold: **text** -> <strong>text</strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text* -> <em>text</em>
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Line breaks: \n -> <br />
  html = html.replace(/\n/g, '<br />');

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

// Alias for compatibility
export const renderInlineMarkup = renderInline;