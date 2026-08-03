import { describe, expect, it } from 'vitest';

import { asIsoDate, fromIsoDate, isIsoDate, isoDateSchema, toIsoDate } from './isoDate';

describe('IsoDate', () => {
  it('accepte une date bien formée', () => {
    expect(isIsoDate('2024-03-12')).toBe(true);
    expect(isoDateSchema.safeParse('2024-03-12').success).toBe(true);
  });

  it('refuse un format incorrect', () => {
    expect(isIsoDate('12/03/2024')).toBe(false);
    expect(isIsoDate('2024-3-12')).toBe(false);
    expect(isIsoDate('2024-03-12T00:00:00Z')).toBe(false);
  });

  it('refuse une date bien formée mais inexistante', () => {
    // `new Date('2024-02-31')` basculerait silencieusement au 2 mars.
    expect(isIsoDate('2024-02-31')).toBe(false);
    expect(isIsoDate('2023-02-29')).toBe(false);
    expect(isIsoDate('2024-13-01')).toBe(false);
  });

  it('accepte le 29 février d’une année bissextile', () => {
    expect(isIsoDate('2024-02-29')).toBe(true);
  });

  it('fait un aller-retour sans décalage de fuseau', () => {
    // Le piège classique : `new Date('2024-03-12')` est interprété en UTC et
    // peut retomber sur le 11 mars selon le fuseau local.
    const roundTripped = toIsoDate(fromIsoDate(asIsoDate('2024-03-12')));

    expect(roundTripped).toBe('2024-03-12');
  });

  it('convertit un instant local en date civile locale', () => {
    // 23h59 heure locale reste le même jour.
    expect(toIsoDate(new Date(2024, 2, 12, 23, 59))).toBe('2024-03-12');
    expect(toIsoDate(new Date(2024, 2, 12, 0, 1))).toBe('2024-03-12');
  });

  it('produit minuit local à la relecture', () => {
    const date = fromIsoDate(asIsoDate('2024-03-12'));

    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(12);
    expect(date.getHours()).toBe(0);
  });
});
