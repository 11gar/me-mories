import { describe, expect, it } from 'vitest';

import { highlightSegments } from './highlight';

/** Compact view of the result: matched parts wrapped in brackets. */
const render = (text: string, query: string) =>
  highlightSegments(text, query)
    .map((segment) => (segment.match ? `[${segment.text}]` : segment.text))
    .join('');

describe('highlightSegments', () => {
  it('renvoie le texte intact sans requête', () => {
    expect(render('Un café', '')).toBe('Un café');
  });

  it('surligne une correspondance simple', () => {
    expect(render('Un bon café', 'bon')).toBe('Un [bon] café');
  });

  it('ignore la casse', () => {
    expect(render('Un Café', 'café')).toBe('Un [Café]');
  });

  it('ignore les accents, dans les deux sens', () => {
    // Le point clé : la recherche tolère les accents manquants, le surlignage
    // doit suivre, sinon un résultat s'affiche sans rien de surligné.
    expect(render('Un café', 'cafe')).toBe('Un [café]');
    expect(render('Un cafe', 'café')).toBe('Un [cafe]');
    expect(render('Élève modèle', 'eleve')).toBe('[Élève] modèle');
  });

  it('préserve exactement le texte source', () => {
    const text = 'Le café Kitsuné à Paris';
    const segments = highlightSegments(text, 'cafe paris');

    expect(segments.map((segment) => segment.text).join('')).toBe(text);
  });

  it('surligne toutes les occurrences', () => {
    expect(render('café et café', 'cafe')).toBe('[café] et [café]');
  });

  it('gère plusieurs termes', () => {
    expect(render('Le café de Paris', 'cafe paris')).toBe('Le [café] de [Paris]');
  });

  it('ignore les termes d’une seule lettre', () => {
    // Sinon "à" surlignerait la moitié du texte.
    expect(render('Un café à Paris', 'à')).toBe('Un café à Paris');
  });

  it('fusionne des correspondances qui se chevauchent', () => {
    expect(render('abcdef', 'abcd cdef')).toBe('[abcdef]');
  });

  it('ne renvoie aucune correspondance quand rien ne matche', () => {
    expect(highlightSegments('Un café', 'thé').every((segment) => !segment.match)).toBe(true);
  });

  it('gère un texte vide', () => {
    expect(highlightSegments('', 'café')).toEqual([{ text: '', match: false }]);
  });
});
