import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { ROUTES, memoryPath, searchPath } from '@/app/router/paths';
import { criteriaToSearchParams, emptySearchCriteria } from '@/domain/services/searchQuery';
import { useHotkey } from '@/hooks';
import { firstLine, truncate } from '@/lib/text';
import { cn } from '@/lib/cn';
import { useSearchResults } from '@/search/useSearch';
import { useUiStore } from '@/store';
import { HighlightedText, Icon, Modal } from '@/ui';
import type { IconName } from '@/ui';

import styles from './CommandPalette.module.scss';

/** Memories offered inside the palette before it turns into a wall of text. */
const MEMORY_RESULT_LIMIT = 6;

const LISTBOX_ID = 'command-palette-listbox';

interface Command {
  id: string;
  label: string;
  icon: IconName;
  hint?: string;
  run: () => void;
}

/**
 * `Ctrl/Cmd + K`: go anywhere, or find any memory, without touching the mouse.
 *
 * It searches the same index as the Memories page, so the fastest path from
 * "what was that thing about Kyoto" to reading it is two keystrokes and a word.
 */
export function CommandPalette() {
  const navigate = useNavigate();
  const openCapture = useUiStore((state) => state.openCapture);
  const captureOpen = useUiStore((state) => state.captureOpen);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useHotkey('k', () => setOpen((value) => !value), {
    meta: true,
    allowInInput: true,
    enabled: !captureOpen,
  });

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const timeout = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(timeout);
  }, [open]);

  const criteria = useMemo(() => ({ ...emptySearchCriteria, text: query }), [query]);
  const memories = useSearchResults(criteria);

  const commands = useMemo<Command[]>(() => {
    const close = () => setOpen(false);

    const actions: Command[] = [
      {
        id: 'capture',
        label: 'Nouvelle mémoire',
        icon: 'plus',
        hint: 'N',
        run: () => {
          close();
          openCapture();
        },
      },
      {
        id: 'home',
        label: 'Accueil',
        icon: 'home',
        run: () => {
          close();
          void navigate(ROUTES.home);
        },
      },
      {
        id: 'memories',
        label: 'Toutes les mémoires',
        icon: 'layers',
        run: () => {
          close();
          void navigate(ROUTES.memories);
        },
      },
      {
        id: 'swipe',
        label: 'Relire',
        icon: 'shuffle',
        run: () => {
          close();
          void navigate(ROUTES.swipe);
        },
      },
      {
        id: 'calendar',
        label: 'Calendrier',
        icon: 'calendar',
        run: () => {
          close();
          void navigate(ROUTES.calendar);
        },
      },
      {
        id: 'tags',
        label: 'Tags',
        icon: 'tag',
        run: () => {
          close();
          void navigate(ROUTES.tags);
        },
      },
      {
        id: 'dateTags',
        label: 'Dates',
        icon: 'sparkles',
        run: () => {
          close();
          void navigate(ROUTES.dateTags);
        },
      },
      {
        id: 'settings',
        label: 'Réglages',
        icon: 'settings',
        run: () => {
          close();
          void navigate(ROUTES.settings);
        },
      },
    ];

    const needle = query.trim().toLowerCase();
    const filteredActions =
      needle.length === 0
        ? actions
        : actions.filter((action) => action.label.toLowerCase().includes(needle));

    if (needle.length === 0) return filteredActions;

    const memoryCommands: Command[] = memories.slice(0, MEMORY_RESULT_LIMIT).map((memory) => ({
      id: memory.id,
      label: truncate(firstLine(memory.text), 80),
      icon: 'inbox',
      run: () => {
        close();
        void navigate(memoryPath(memory.id));
      },
    }));

    const seeAll: Command[] =
      memories.length > MEMORY_RESULT_LIMIT
        ? [
            {
              id: 'see-all',
              label: `Voir les ${memories.length} résultats`,
              icon: 'search',
              run: () => {
                close();
                void navigate(
                  searchPath(criteriaToSearchParams({ ...emptySearchCriteria, text: query })),
                );
              },
            },
          ]
        : [];

    return [...filteredActions, ...memoryCommands, ...seeAll];
  }, [query, memories, navigate, openCapture]);

  // Keep the highlight inside the list as it shrinks while typing.
  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(commands.length - 1, 0)));
  }, [commands.length]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % Math.max(commands.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + commands.length) % Math.max(commands.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      commands[activeIndex]?.run();
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Palette de commandes"
      hideTitle
      size="md"
    >
      <div className={styles.root}>
        <div className={styles.searchRow}>
          <Icon name="search" size={18} className={styles.searchIcon} />
          {/* The WAI-ARIA combobox pattern: focus stays in the input, the
              listbox is owned via aria-controls, and the highlighted option is
              announced through aria-activedescendant. A native <select> cannot
              do this — it cannot be filtered by a text field or hold rich rows —
              which is why jsx-a11y's tag-over-role suggestion is bypassed below. */}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={commands.length > 0}
            aria-controls={LISTBOX_ID}
            aria-autocomplete="list"
            className={styles.input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Chercher une mémoire ou une action…"
            aria-label="Chercher une mémoire ou une action"
            aria-activedescendant={commands[activeIndex]?.id}
          />
        </div>

        {commands.length === 0 ? (
          <p className={styles.empty}>Aucun résultat.</p>
        ) : (
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
          <div className={styles.list} id={LISTBOX_ID} role="listbox" aria-label="Résultats">
            {commands.map((command, index) => (
              // Keyboard interaction lives on the combobox input (arrows and
              // Enter), per the ARIA pattern — hence the click-only handler here.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
              <div
                key={command.id}
                id={command.id}
                // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
                role="option"
                // Reachable programmatically but never in the Tab order: focus
                // must stay in the input so typing keeps working.
                tabIndex={-1}
                aria-selected={index === activeIndex}
                className={cn(styles.item, index === activeIndex && styles.itemActive)}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={command.run}
              >
                <Icon name={command.icon} size={16} className={styles.itemIcon} />
                <span className={styles.itemLabel}>
                  <HighlightedText text={command.label} query={query} />
                </span>
                {command.hint === undefined ? null : <kbd>{command.hint}</kbd>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
