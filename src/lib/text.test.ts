import { describe, expect, it } from 'vitest';

import { collapseWhitespace, firstLine, normalizeText, truncate } from './text';

describe('normalizeText', () => {
  it('rend équivalentes les variantes de casse et d’accents', () => {
    expect(normalizeText('Café')).toBe('cafe');
    expect(normalizeText('CAFÉ')).toBe('cafe');
    expect(normalizeText('cafe')).toBe('cafe');
  });

  it('gère les caractères français composés', () => {
    expect(normalizeText('Élève')).toBe('eleve');
    expect(normalizeText('Noël')).toBe('noel');
    expect(normalizeText('Où ça')).toBe('ou ca');
  });

  it('réduit les espaces et supprime ceux des extrémités', () => {
    expect(normalizeText('  idée   cadeau  ')).toBe('idee cadeau');
  });
});

describe('collapseWhitespace', () => {
  it('préserve casse et accents', () => {
    expect(collapseWhitespace('  Idée   Cadeau ')).toBe('Idée Cadeau');
  });
});

describe('truncate', () => {
  it('ne touche pas à une chaîne assez courte', () => {
    expect(truncate('court', 10)).toBe('court');
  });

  it('coupe et ajoute une ellipse', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
  });

  it('ne laisse pas d’espace avant l’ellipse', () => {
    expect(truncate('abcd efgh', 6)).toBe('abcd…');
  });
});

describe('firstLine', () => {
  it('renvoie la première ligne non vide', () => {
    expect(firstLine('\n\n  Première ligne\nSeconde')).toBe('Première ligne');
  });

  it('renvoie une chaîne vide si tout est vide', () => {
    expect(firstLine('\n   \n')).toBe('');
  });
});
