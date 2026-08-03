import { Fragment } from 'react';

import { highlightSegments } from '@/lib/highlight';
import { cn } from '@/lib/cn';

import styles from './HighlightedText.module.scss';

export interface HighlightedTextProps {
  text: string;
  /** Search query. Empty or whitespace renders the text untouched. */
  query?: string;
  className?: string;
}

/**
 * Renders text with the search terms marked.
 *
 * Uses `<mark>`, whose meaning ("relevant in the current context") is exactly
 * right and which screen readers can expose — a styled `<span>` would lose that.
 */
export function HighlightedText({ text, query = '', className }: HighlightedTextProps) {
  if (query.trim().length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {highlightSegments(text, query).map((segment, index) => (
        <Fragment key={index}>
          {segment.match ? <mark className={cn(styles.mark)}>{segment.text}</mark> : segment.text}
        </Fragment>
      ))}
    </span>
  );
}
