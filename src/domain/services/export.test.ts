import { describe, expect, it } from 'vitest';

import { asIsoDate } from '@/domain/models';
import { makeDateTag, makeMemory, makeTag } from '@/test/factories';

import { exportFilename, toJsonExport, toMarkdownExport } from './export';

const EXPORTED_AT = new Date(2026, 7, 3, 10, 0);

describe('toJsonExport', () => {
  it('produit un JSON valide et complet', () => {
    const tag = makeTag({ title: 'Cuisine', titleNormalized: 'cuisine' });
    const memory = makeMemory({ text: 'Une note', tagIds: [tag.id] });

    const parsed = JSON.parse(
      toJsonExport({
        memories: [memory],
        tags: [tag],
        dateTags: [],
        todos: [],
        exportedAt: EXPORTED_AT,
      }),
    );

    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.memories).toHaveLength(1);
    expect(parsed.memories[0].text).toBe('Une note');
    expect(parsed.memories[0].tagIds).toEqual([tag.id]);
    expect(parsed.tags[0].title).toBe('Cuisine');
  });

  it('sérialise les dates en ISO 8601', () => {
    const memory = makeMemory({ createdAt: new Date(Date.UTC(2024, 2, 12, 9, 30)) });

    const parsed = JSON.parse(
      toJsonExport({
        memories: [memory],
        tags: [],
        dateTags: [],
        todos: [],
        exportedAt: EXPORTED_AT,
      }),
    );

    expect(parsed.memories[0].createdAt).toBe('2024-03-12T09:30:00.000Z');
  });

  it('conserve les mémoires en corbeille', () => {
    // Un export doit être complet : la corbeille fait partie des données.
    const deleted = makeMemory({ deletedAt: new Date(2026, 0, 5) });

    const parsed = JSON.parse(
      toJsonExport({
        memories: [deleted],
        tags: [],
        dateTags: [],
        todos: [],
        exportedAt: EXPORTED_AT,
      }),
    );

    expect(parsed.memories[0].deletedAt).not.toBeNull();
  });
});

describe('toMarkdownExport', () => {
  it('résout les identifiants en noms lisibles', () => {
    const tag = makeTag({ title: 'Voyage', titleNormalized: 'voyage' });
    const dateTag = makeDateTag({ label: 'Japon', date: asIsoDate('2019-05-04') });
    const memory = makeMemory({
      text: 'Kyoto en novembre.',
      tagIds: [tag.id],
      dateTagIds: [dateTag.id],
    });

    const markdown = toMarkdownExport({
      memories: [memory],
      tags: [tag],
      dateTags: [dateTag],
      todos: [],
      exportedAt: EXPORTED_AT,
    });

    // Un fichier plein d'UUID serait inutilisable dans dix ans.
    expect(markdown).toContain('#Voyage');
    expect(markdown).toContain('@Japon (2019-05-04)');
    expect(markdown).not.toContain(tag.id);
  });

  it('groupe par mois, du plus récent au plus ancien', () => {
    const older = makeMemory({ text: 'Ancienne', createdAt: new Date(2024, 0, 15) });
    const newer = makeMemory({ text: 'Récente', createdAt: new Date(2026, 5, 2) });

    const markdown = toMarkdownExport({
      memories: [older, newer],
      tags: [],
      dateTags: [],
      todos: [],
      exportedAt: EXPORTED_AT,
    });

    expect(markdown.indexOf('## 2026-06')).toBeLessThan(markdown.indexOf('## 2024-01'));
    expect(markdown.indexOf('Récente')).toBeLessThan(markdown.indexOf('Ancienne'));
  });

  it('omet la ligne de tags quand il n’y en a pas', () => {
    const markdown = toMarkdownExport({
      memories: [makeMemory({ text: 'Sans tag' })],
      tags: [],
      dateTags: [],
      todos: [],
      exportedAt: EXPORTED_AT,
    });

    expect(markdown).not.toContain('*#');
  });

  it('ignore un identifiant orphelin plutôt que de l’afficher', () => {
    const memory = makeMemory({ tagIds: [makeTag().id] });

    const markdown = toMarkdownExport({
      memories: [memory],
      tags: [],
      dateTags: [],
      todos: [],
      exportedAt: EXPORTED_AT,
    });

    expect(markdown).not.toContain('undefined');
  });
});

describe('exportFilename', () => {
  it('date le fichier', () => {
    expect(exportFilename('json', EXPORTED_AT)).toBe('me-mories-2026-08-03.json');
    expect(exportFilename('md', EXPORTED_AT)).toBe('me-mories-2026-08-03.md');
  });
});
