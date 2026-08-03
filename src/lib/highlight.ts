export interface HighlightSegment {
  text: string;
  match: boolean;
}

/**
 * Folds a string for comparison while keeping a 1:1 index mapping with the
 * original.
 *
 * `normalizeText` cannot be used here: NFD decomposition turns "café" (4 chars)
 * into 5, so any offset computed against it would slice the original in the
 * wrong place. Taking the first code point of each character's decomposition
 * drops the diacritic and keeps the length identical.
 */
function foldPreservingLength(value: string): string {
  return [...value].map((char) => char.normalize('NFD')[0]?.toLowerCase() ?? char).join('');
}

/**
 * Splits `text` into matched and unmatched segments for the given query.
 *
 * Matching is accent- and case-insensitive, so searching "cafe" highlights
 * "café" — the same tolerance the search index applies, which matters because a
 * result with nothing highlighted reads like a bug.
 */
export function highlightSegments(text: string, query: string): HighlightSegment[] {
  // Always at least one segment, so callers never have to special-case an empty
  // result — the no-query branch below has the same contract.
  if (text.length === 0) return [{ text: '', match: false }];

  const terms = query
    .trim()
    .split(/\s+/)
    .map(foldPreservingLength)
    .filter((term) => term.length > 1)
    .sort((a, b) => b.length - a.length);

  if (terms.length === 0) return [{ text, match: false }];

  const haystack = foldPreservingLength(text);
  const matched = new Array<boolean>(text.length).fill(false);

  for (const term of terms) {
    let from = 0;

    for (;;) {
      const index = haystack.indexOf(term, from);
      if (index === -1) break;

      for (let offset = 0; offset < term.length; offset += 1) {
        matched[index + offset] = true;
      }

      from = index + term.length;
    }
  }

  const segments: HighlightSegment[] = [];
  let start = 0;

  for (let index = 1; index <= text.length; index += 1) {
    if (index === text.length || matched[index] !== matched[start]) {
      segments.push({ text: text.slice(start, index), match: matched[start] === true });
      start = index;
    }
  }

  return segments;
}
