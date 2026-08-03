import { addDays, subDays } from 'date-fns';

import { asIsoDate, isIsoDate, toIsoDate } from '../models/isoDate';
import type { IsoDate } from '../models/isoDate';

/**
 * Extracts `#tags` and `@dates` while the user types.
 *
 * This is the single biggest lever on capture speed: typing
 * "Le café Kitsuné est excellent #café #paris @hier" tags and dates a memory
 * without ever leaving the keyboard or opening a picker.
 *
 * ## Why trailing tokens are stripped and inline ones are not
 *
 * People write one of two ways: they append tags at the end ("…excellent
 * #café #paris"), or they use one inside a sentence ("J'ai adoré le #café
 * Kitsuné"). Stripping everything would mangle the second case into "J'ai adoré
 * le Kitsuné" — the memory loses its meaning, permanently, and the user finds
 * out years later.
 *
 * So: every token creates or links an entity, but only the trailing run of
 * tokens is removed from the stored text. The common case gets clean text, the
 * inline case stays readable.
 */

export type QuickParseTokenKind = 'tag' | 'date';

export interface QuickParseToken {
  kind: QuickParseTokenKind;
  /** Raw source text, `#` or `@` included. */
  raw: string;
  /** Tag title, or the resolved IsoDate for a date token. */
  value: string;
  start: number;
  end: number;
  /** Part of the trailing run, and therefore removed from `text`. */
  trailing: boolean;
}

export interface QuickParseResult {
  /** Text to store, with the trailing token run removed. */
  text: string;
  /** Distinct tag titles, in order of first appearance. */
  tagTitles: string[];
  /** Distinct dates, in order of first appearance. */
  dates: IsoDate[];
  /** Every token found, with positions — lets the capture box highlight live. */
  tokens: QuickParseToken[];
}

export interface QuickParseOptions {
  /** Reference point for relative keywords such as `@hier`. */
  now?: Date;
}

// A tag starts on a word boundary so that "C#" or "prix: 30#" is not a tag.
// Unicode letters keep "#idée" and "#café" working.
const TAG_PATTERN = /(?<=^|\s)#(\p{L}[\p{L}\p{N}_-]*)/gu;
const DATE_PATTERN = /(?<=^|\s)@([\p{L}\p{N}'’/-]+)/gu;

const RELATIVE_DAYS: Record<string, number> = {
  "aujourd'hui": 0,
  'aujourd’hui': 0,
  aujourdhui: 0,
  auj: 0,
  hier: -1,
  'avant-hier': -2,
  demain: 1,
  'apres-demain': 2,
  'après-demain': 2,
};

const FRENCH_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function parseQuickCapture(
  input: string,
  options: QuickParseOptions = {},
): QuickParseResult {
  const now = options.now ?? new Date();
  const tokens: QuickParseToken[] = [];

  for (const match of input.matchAll(TAG_PATTERN)) {
    const title = match[1];
    if (title === undefined || match.index === undefined) continue;

    tokens.push({
      kind: 'tag',
      raw: match[0],
      value: title,
      start: match.index,
      end: match.index + match[0].length,
      trailing: false,
    });
  }

  for (const match of input.matchAll(DATE_PATTERN)) {
    const candidate = match[1];
    if (candidate === undefined || match.index === undefined) continue;

    const resolved = resolveDate(candidate, now);
    // `@someone` is not a date — leave it alone in the text.
    if (resolved === null) continue;

    tokens.push({
      kind: 'date',
      raw: match[0],
      value: resolved,
      start: match.index,
      end: match.index + match[0].length,
      trailing: false,
    });
  }

  tokens.sort((a, b) => a.start - b.start);
  markTrailingTokens(input, tokens);

  return {
    text: stripTrailingTokens(input, tokens),
    tagTitles: distinct(tokens.filter((token) => token.kind === 'tag').map((t) => t.value)),
    dates: distinct(
      tokens.filter((token) => token.kind === 'date').map((t) => t.value),
    ) as IsoDate[],
    tokens,
  };
}

/**
 * Walks backwards from the end of the input, flagging tokens as long as nothing
 * but whitespace and other tokens sits between them and the end.
 */
function markTrailingTokens(input: string, tokens: QuickParseToken[]): void {
  let boundary = input.length;

  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token === undefined) continue;

    const between = input.slice(token.end, boundary);
    if (between.trim().length > 0) break;

    token.trailing = true;
    boundary = token.start;
  }
}

function stripTrailingTokens(input: string, tokens: QuickParseToken[]): string {
  const firstTrailing = tokens.find((token) => token.trailing);
  const text = firstTrailing === undefined ? input : input.slice(0, firstTrailing.start);
  return text.trim();
}

function resolveDate(candidate: string, now: Date): IsoDate | null {
  if (isIsoDate(candidate)) return asIsoDate(candidate);

  const french = FRENCH_DATE_PATTERN.exec(candidate);
  if (french) {
    const [, day, month, year] = french;
    const iso = `${year}-${month?.padStart(2, '0')}-${day?.padStart(2, '0')}`;
    return isIsoDate(iso) ? asIsoDate(iso) : null;
  }

  const offset = RELATIVE_DAYS[candidate.toLowerCase()];
  if (offset === undefined) return null;

  return toIsoDate(offset >= 0 ? addDays(now, offset) : subDays(now, -offset));
}

function distinct(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Removes a token from the raw input.
 *
 * The text is the source of truth for inline tags, so dismissing a chip has to
 * edit the text rather than keep a separate exclusion list — otherwise the
 * preview and what gets saved drift apart. The leading separator goes with the
 * token so no double space is left behind.
 */
export function removeToken(input: string, token: QuickParseToken): string {
  const before = input.slice(0, token.start).replace(/[ \t]+$/, '');
  const after = input.slice(token.end);

  // Re-join with a single space unless one side is empty or `after` already
  // starts with whitespace or punctuation.
  const needsSpace =
    before.length > 0 && after.length > 0 && !/^[\s,.;:!?)]/.test(after) && !/\n$/.test(before);

  return `${before}${needsSpace ? ' ' : ''}${after}`;
}

/** Removes every token resolving to the same value (a tag title or a date). */
export function removeTokensWithValue(
  input: string,
  kind: QuickParseTokenKind,
  value: string,
  options: QuickParseOptions = {},
): string {
  let result = input;

  // Right to left so earlier offsets stay valid as we splice.
  const targets = parseQuickCapture(input, options)
    .tokens.filter((token) => token.kind === kind && token.value === value)
    .reverse();

  for (const token of targets) {
    result = removeToken(result, token);
  }

  return result;
}
