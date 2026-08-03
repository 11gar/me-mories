import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TAG_COLOR,
  TAG_COLORS,
  isValidHexColor,
  readableTextColor,
  suggestTagColor,
  withAlpha,
} from './colors';

describe('isValidHexColor', () => {
  it('accepte un hexadécimal à 6 chiffres', () => {
    expect(isValidHexColor('#5b53e8')).toBe(true);
    expect(isValidHexColor('#FFFFFF')).toBe(true);
  });

  it('refuse les autres notations', () => {
    expect(isValidHexColor('#fff')).toBe(false);
    expect(isValidHexColor('5b53e8')).toBe(false);
    expect(isValidHexColor('rouge')).toBe(false);
    expect(isValidHexColor('rgb(0,0,0)')).toBe(false);
  });
});

describe('suggestTagColor', () => {
  it('propose la couleur par défaut quand rien n’est utilisé', () => {
    expect(suggestTagColor([])).toBe(DEFAULT_TAG_COLOR);
  });

  it('évite une couleur déjà prise', () => {
    expect(suggestTagColor([DEFAULT_TAG_COLOR])).not.toBe(DEFAULT_TAG_COLOR);
  });

  it('propose la couleur la moins utilisée', () => {
    // Toutes prises une fois sauf la dernière.
    const used = TAG_COLORS.slice(0, -1);

    expect(suggestTagColor(used)).toBe(TAG_COLORS.at(-1));
  });

  it('reboucle sur la palette quand tout a été utilisé', () => {
    const used = [...TAG_COLORS, TAG_COLORS[1], TAG_COLORS[1]];

    expect(TAG_COLORS).toContain(suggestTagColor(used));
  });

  it('ignore les couleurs hors palette', () => {
    expect(suggestTagColor(['#123456', '#abcdef'])).toBe(DEFAULT_TAG_COLOR);
  });
});

describe('readableTextColor', () => {
  it('met du texte clair sur un fond sombre', () => {
    expect(readableTextColor('#000000')).toBe('#ffffff');
    expect(readableTextColor('#5b53e8')).toBe('#ffffff');
  });

  it('met du texte sombre sur un fond clair', () => {
    expect(readableTextColor('#ffffff')).toBe('#111111');
    expect(readableTextColor('#f5e79e')).toBe('#111111');
  });

  it('traite correctement le vert, que la moyenne RVB classerait mal', () => {
    // Luminance perçue élevée malgré une moyenne RVB moyenne.
    expect(readableTextColor('#00ff00')).toBe('#111111');
  });

  it('garantit un texte lisible sur toute la palette', () => {
    for (const color of TAG_COLORS) {
      expect(['#ffffff', '#111111']).toContain(readableTextColor(color));
    }
  });
});

describe('withAlpha', () => {
  it('produit une couleur rgb avec pourcentage d’opacité', () => {
    expect(withAlpha('#5b53e8', 0.12)).toBe('rgb(91 83 232 / 12%)');
  });
});
