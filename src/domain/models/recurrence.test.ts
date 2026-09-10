import { describe, expect, it } from 'vitest';

import { asIsoDate } from './isoDate';
import { advanceOccurrence, describeRecurrence, nextOccurrence } from './recurrence';

const iso = asIsoDate;

describe('nextOccurrence', () => {
  it('avance de n jours', () => {
    expect(nextOccurrence(iso('2026-03-10'), { unit: 'day', interval: 2 })).toBe('2026-03-12');
  });

  it('avance de n semaines', () => {
    expect(nextOccurrence(iso('2026-03-10'), { unit: 'week', interval: 2 })).toBe('2026-03-24');
  });

  it('avance de n mois', () => {
    expect(nextOccurrence(iso('2026-03-10'), { unit: 'month', interval: 1 })).toBe('2026-04-10');
  });

  it('franchit un changement de mois et d’année', () => {
    expect(nextOccurrence(iso('2026-12-30'), { unit: 'day', interval: 3 })).toBe('2027-01-02');
  });

  it('borne le jour du mois au lieu de déborder', () => {
    // Le 31 janvier + 1 mois est le 28 février, pas le 3 mars : une corvée
    // mensuelle ne doit pas dériver vers le mois suivant.
    expect(nextOccurrence(iso('2026-01-31'), { unit: 'month', interval: 1 })).toBe('2026-02-28');
  });

  it('gère le 29 février d’une année bissextile', () => {
    expect(nextOccurrence(iso('2024-02-29'), { unit: 'month', interval: 12 })).toBe('2025-02-28');
  });
});

describe('advanceOccurrence', () => {
  it('avance d’un cran quand la date prévue est aujourd’hui', () => {
    const next = advanceOccurrence(
      iso('2026-03-10'),
      { unit: 'day', interval: 2 },
      iso('2026-03-10'),
    );

    expect(next).toBe('2026-03-12');
  });

  it('ne saute rien quand la date prévue est dans le futur', () => {
    const next = advanceOccurrence(
      iso('2026-03-20'),
      { unit: 'week', interval: 1 },
      iso('2026-03-10'),
    );

    expect(next).toBe('2026-03-27');
  });

  it('rattrape un retard sans casser le rythme', () => {
    // Prévue le 5, validée le 10, tous les 2 jours : la série garde sa parité
    // (5, 7, 9, 11) et repart au 11 — pas à une nouvelle date arbitraire.
    const next = advanceOccurrence(
      iso('2026-03-05'),
      { unit: 'day', interval: 2 },
      iso('2026-03-10'),
    );

    expect(next).toBe('2026-03-11');
  });

  it('produit toujours une date strictement postérieure à la référence', () => {
    const next = advanceOccurrence(
      iso('2020-01-01'),
      { unit: 'week', interval: 1 },
      iso('2026-03-10'),
    );

    expect(next > '2026-03-10').toBe(true);
  });

  it('termine même pour une série abandonnée depuis des années', () => {
    // Le garde-fou de boucle doit rendre la main : une série quotidienne
    // délaissée pendant dix ans ne doit pas figer l’interface.
    const next = advanceOccurrence(
      iso('2010-01-01'),
      { unit: 'day', interval: 1 },
      iso('2026-03-10'),
    );

    expect(typeof next).toBe('string');
  });
});

describe('describeRecurrence', () => {
  it('formule le singulier sans répéter l’intervalle', () => {
    expect(describeRecurrence({ unit: 'day', interval: 1 })).toBe('tous les jours');
    expect(describeRecurrence({ unit: 'week', interval: 1 })).toBe('toutes les semaines');
    expect(describeRecurrence({ unit: 'month', interval: 1 })).toBe('tous les mois');
  });

  it('accorde l’article au pluriel', () => {
    expect(describeRecurrence({ unit: 'day', interval: 2 })).toBe('tous les 2 jours');
    expect(describeRecurrence({ unit: 'week', interval: 2 })).toBe('toutes les 2 semaines');
    expect(describeRecurrence({ unit: 'month', interval: 3 })).toBe('tous les 3 mois');
  });
});
