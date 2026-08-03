import { describe, expect, it } from 'vitest';

import { parseQuickCapture } from './quickParse';

const NOW = new Date(2026, 7, 2, 14, 30); // 2 août 2026, heure locale

describe('parseQuickCapture', () => {
  it('extrait les tags en fin de texte et les retire du contenu', () => {
    const result = parseQuickCapture('Le café Kitsuné est excellent #café #paris', { now: NOW });

    expect(result.text).toBe('Le café Kitsuné est excellent');
    expect(result.tagTitles).toEqual(['café', 'paris']);
  });

  it('conserve dans le texte un tag utilisé au milieu d’une phrase', () => {
    const result = parseQuickCapture("J'ai adoré le #café Kitsuné", { now: NOW });

    // Retirer le token détruirait le sens de la phrase.
    expect(result.text).toBe("J'ai adoré le #café Kitsuné");
    expect(result.tagTitles).toEqual(['café']);
  });

  it('combine tag inline et tags en fin de texte', () => {
    const result = parseQuickCapture('Note sur le #vin de Loire #oenologie #voyage', { now: NOW });

    expect(result.text).toBe('Note sur le #vin de Loire');
    expect(result.tagTitles).toEqual(['vin', 'oenologie', 'voyage']);
  });

  it('accepte les accents et les tirets dans un tag', () => {
    const result = parseQuickCapture('Idée #idée-cadeau #anniversaire', { now: NOW });

    expect(result.tagTitles).toEqual(['idée-cadeau', 'anniversaire']);
  });

  it('ignore un # collé à un mot', () => {
    const result = parseQuickCapture('Le langage C# est verbeux', { now: NOW });

    expect(result.tagTitles).toEqual([]);
    expect(result.text).toBe('Le langage C# est verbeux');
  });

  it('dédoublonne les tags répétés en gardant l’ordre d’apparition', () => {
    const result = parseQuickCapture('Test #a #b #a', { now: NOW });

    expect(result.tagTitles).toEqual(['a', 'b']);
  });

  describe('dates', () => {
    it('reconnaît une date ISO', () => {
      const result = parseQuickCapture('Concert mémorable @2024-03-12', { now: NOW });

      expect(result.dates).toEqual(['2024-03-12']);
      expect(result.text).toBe('Concert mémorable');
    });

    it('reconnaît le format français JJ/MM/AAAA', () => {
      const result = parseQuickCapture('Rendez-vous @12/03/2024', { now: NOW });

      expect(result.dates).toEqual(['2024-03-12']);
    });

    it('résout les mots-clés relatifs par rapport à maintenant', () => {
      expect(parseQuickCapture('Note @hier', { now: NOW }).dates).toEqual(['2026-08-01']);
      expect(parseQuickCapture('Note @avant-hier', { now: NOW }).dates).toEqual(['2026-07-31']);
      expect(parseQuickCapture("Note @aujourd'hui", { now: NOW }).dates).toEqual(['2026-08-02']);
      expect(parseQuickCapture('Note @demain', { now: NOW }).dates).toEqual(['2026-08-03']);
    });

    it('laisse intact un @ qui n’est pas une date', () => {
      const result = parseQuickCapture('Vu avec @marie hier soir', { now: NOW });

      expect(result.dates).toEqual([]);
      expect(result.text).toBe('Vu avec @marie hier soir');
    });

    it('rejette une date impossible', () => {
      const result = parseQuickCapture('Note @2024-02-31', { now: NOW });

      expect(result.dates).toEqual([]);
      expect(result.text).toBe('Note @2024-02-31');
    });

    it('mélange tags et dates en fin de texte', () => {
      const result = parseQuickCapture('Anniversaire de Léa #famille @2019-05-04', { now: NOW });

      expect(result.text).toBe('Anniversaire de Léa');
      expect(result.tagTitles).toEqual(['famille']);
      expect(result.dates).toEqual(['2019-05-04']);
    });
  });

  describe('tokens', () => {
    it('expose la position de chaque token pour la coloration en direct', () => {
      const result = parseQuickCapture('abc #tag', { now: NOW });

      expect(result.tokens).toEqual([
        { kind: 'tag', raw: '#tag', value: 'tag', start: 4, end: 8, trailing: true },
      ]);
    });

    it('ne marque pas comme final un token suivi de texte', () => {
      const result = parseQuickCapture('#tag suivi de texte', { now: NOW });

      expect(result.tokens[0]?.trailing).toBe(false);
      expect(result.text).toBe('#tag suivi de texte');
    });
  });

  it('gère un texte vide', () => {
    const result = parseQuickCapture('', { now: NOW });

    expect(result).toEqual({ text: '', tagTitles: [], dates: [], tokens: [] });
  });

  it('gère un texte composé uniquement de tags', () => {
    const result = parseQuickCapture('#a #b', { now: NOW });

    expect(result.text).toBe('');
    expect(result.tagTitles).toEqual(['a', 'b']);
  });
});
