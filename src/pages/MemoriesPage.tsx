import { useEffect, useState } from 'react';

import { hasActiveFilters, resetCriteria } from '@/domain/services/searchQuery';
import { MemoryCard } from '@/features/memories/components/MemoryCard';
import { useMemoryActions } from '@/features/memories/hooks/useMemoryActions';
import { SearchFilters } from '@/features/search/components/SearchFilters';
import { useSearchCriteria } from '@/features/search/hooks/useSearchCriteria';
import { useDebouncedValue } from '@/hooks';
import { useSearchResults } from '@/search/useSearch';
import { useMemoriesStore, useSessionStore, useUiStore } from '@/store';
import { Button, EmptyState, Icon, Page, Spinner } from '@/ui';

import styles from './MemoriesPage.module.scss';

export function MemoriesPage() {
  const { criteria, setCriteria, patchCriteria } = useSearchCriteria();
  const status = useSessionStore((state) => state.status);
  const loaded = useMemoriesStore((state) => state.loaded);
  const totalActive = useMemoriesStore((state) => state.active.length);
  const trashCount = useMemoriesStore((state) => state.trashed.length);
  const openCapture = useUiStore((state) => state.openCapture);
  const { edit, remove, restore } = useMemoryActions();

  // The input is local and the URL trails it, so typing stays instant and the
  // history is not rewritten on every keystroke.
  const [queryInput, setQueryInput] = useState(criteria.text);
  const debouncedQuery = useDebouncedValue(queryInput, 180);

  useEffect(() => {
    if (debouncedQuery === criteria.text) return;
    patchCriteria({ text: debouncedQuery });
  }, [debouncedQuery, criteria.text, patchCriteria]);

  const results = useSearchResults(criteria);
  const inTrash = criteria.scope === 'trash';
  const filtering = hasActiveFilters(criteria);

  function clearAll() {
    setQueryInput('');
    setCriteria(resetCriteria(criteria));
  }

  if (!loaded && status !== 'ready') {
    return (
      <Page title="Mémoires">
        <div className={styles.loading}>
          <Spinner size={24} label="Chargement de vos mémoires" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      title={inTrash ? 'Corbeille' : 'Mémoires'}
      description={
        inTrash
          ? 'Les mémoires supprimées restent ici jusqu’à ce que vous les effaciez définitivement.'
          : `${totalActive} mémoire${totalActive > 1 ? 's' : ''} enregistrée${totalActive > 1 ? 's' : ''}.`
      }
      actions={
        trashCount > 0 || inTrash ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => patchCriteria({ scope: inTrash ? 'active' : 'trash' })}
            iconLeft={<Icon name={inTrash ? 'layers' : 'trash'} size={16} />}
          >
            {inTrash ? 'Mémoires' : `Corbeille (${trashCount})`}
          </Button>
        ) : undefined
      }
    >
      <div className={styles.searchRow}>
        <Icon name="search" size={18} className={styles.searchIcon} />
        <input
          type="search"
          className={styles.search}
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          placeholder="Rechercher dans le texte, les tags, les dates…"
          aria-label="Rechercher une mémoire"
        />
      </div>

      {totalActive > 0 || filtering ? (
        <SearchFilters
          criteria={criteria}
          onChange={patchCriteria}
          onReset={clearAll}
          resultCount={results.length}
        />
      ) : null}

      {results.length === 0 ? (
        <EmptyState
          icon={<Icon name={filtering ? 'search' : 'inbox'} size={22} />}
          title={
            filtering
              ? 'Aucun résultat'
              : inTrash
                ? 'La corbeille est vide'
                : 'Rien de noté pour l’instant'
          }
          description={
            filtering
              ? 'Essayez moins de mots ou moins de filtres — la recherche tolère déjà les fautes de frappe et les accents manquants.'
              : inTrash
                ? undefined
                : 'Notez une anecdote, une idée, une citation. Vous la retrouverez dans des années.'
          }
          action={
            filtering ? (
              <Button variant="secondary" onClick={clearAll}>
                Effacer les critères
              </Button>
            ) : inTrash ? undefined : (
              <Button
                variant="primary"
                onClick={openCapture}
                iconLeft={<Icon name="plus" size={17} />}
              >
                Première mémoire
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className={styles.list}>
            {results.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                highlight={criteria.text}
                onEdit={inTrash ? undefined : (target) => edit(target.id)}
                onRestore={inTrash ? (target) => void restore(target.id) : undefined}
                onDelete={inTrash ? undefined : (target) => void remove(target.id)}
              />
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
