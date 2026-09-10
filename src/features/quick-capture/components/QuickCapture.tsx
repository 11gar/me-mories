import { subDays } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useToast } from '@/app/providers/toastContext';
import { toAppError } from '@/domain/errors';
import type { DateTagId, IsoDate, Tag, TagId } from '@/domain/models';
import { asIsoDate, isIsoDate, toIsoDate, todayIso } from '@/domain/models';
import { parseQuickCapture, removeTokensWithValue } from '@/domain/services/quickParse';
import { TagPickerPanel } from '@/features/tags/components/TagPickerPanel';
import { useLocalStorage } from '@/hooks';
import { formatLongDate } from '@/lib/date';
import { fromIsoDate } from '@/domain/models';
import {
  createMemory,
  findOrCreateDateTags,
  findOrCreateTags,
  updateMemory,
  useDateTagsStore,
  useMemoriesStore,
  useTagsStore,
  useUiStore,
} from '@/store';
import { Button, Icon, Modal, TagChip } from '@/ui';

import styles from './QuickCapture.module.scss';

const DRAFT_KEY = 'me-mories:capture-draft';

interface Draft {
  text: string;
  tagIds: string[];
  dateTagIds: string[];
}

const EMPTY_DRAFT: Draft = { text: '', tagIds: [], dateTagIds: [] };

/**
 * One-tap shortcuts for the dates people reach for most: something noted a day
 * or two after it happened. `offset` is days back from today.
 */
const QUICK_DATES: ReadonlyArray<{ label: string; offset: number }> = [
  { label: "Aujourd'hui", offset: 0 },
  { label: 'Hier', offset: 1 },
  { label: 'Avant-hier', offset: 2 },
];

/**
 * The capture overlay — the single most important screen in the app.
 *
 * Everything here serves one number: how long it takes to get a thought out of
 * your head and stored. Hence an overlay rather than a route (the page behind
 * is never lost), focus straight into the textarea, `#tag` and `@date` parsed
 * from what you type so tagging never costs a click, Ctrl+Enter to save, and a
 * draft persisted on every keystroke so a mis-tap can't destroy a thought.
 */
export function QuickCapture() {
  const captureOpen = useUiStore((state) => state.captureOpen);
  const editingMemoryId = useUiStore((state) => state.editingMemoryId);
  const closeCapture = useUiStore((state) => state.closeCapture);

  const memoriesById = useMemoriesStore((state) => state.byId);
  const tagsById = useTagsStore((state) => state.byId);
  const dateTagsById = useDateTagsStore((state) => state.byId);
  const { showToast } = useToast();

  const isEditing = editingMemoryId !== null;
  const editedMemory = editingMemoryId === null ? undefined : memoriesById[editingMemoryId];

  const [draft, setDraft, clearDraft] = useLocalStorage<Draft>(DRAFT_KEY, EMPTY_DRAFT);

  const [text, setText] = useState('');
  const [manualTagIds, setManualTagIds] = useState<TagId[]>([]);
  const [manualDateTagIds, setManualDateTagIds] = useState<DateTagId[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [saving, setSaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Seed the form when the overlay opens: the edited memory, or the saved draft.
  useEffect(() => {
    if (!captureOpen) return;

    if (editedMemory !== undefined) {
      setText(editedMemory.text);
      setManualTagIds([...editedMemory.tagIds]);
      setManualDateTagIds([...editedMemory.dateTagIds]);
    } else {
      setText(draft.text);
      setManualTagIds(draft.tagIds as TagId[]);
      setManualDateTagIds(draft.dateTagIds as DateTagId[]);
    }

    setShowTagPicker(false);
    setShowDatePicker(false);
    setDateInput('');

    // Focus after the open animation has started, so the caret lands reliably.
    const timeout = setTimeout(() => {
      const textarea = textareaRef.current;
      textarea?.focus();
      textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 60);

    return () => clearTimeout(timeout);
    // Seeding must happen on open only — re-running on every draft keystroke
    // would fight the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureOpen, editingMemoryId]);

  const parsed = useMemo(() => parseQuickCapture(text), [text]);

  // Persist the draft on every change, but never for an edit — that would
  // overwrite a pending new memory with an existing one's text.
  useEffect(() => {
    if (!captureOpen || isEditing) return;

    setDraft({ text, tagIds: manualTagIds, dateTagIds: manualDateTagIds });
  }, [captureOpen, isEditing, text, manualTagIds, manualDateTagIds, setDraft]);

  const manualTags = manualTagIds
    .map((id) => tagsById[id])
    .filter((tag): tag is Tag => tag !== undefined);

  const manualDateTags = manualDateTagIds
    .map((id) => dateTagsById[id])
    .filter((dateTag) => dateTag !== undefined);

  const canSave = parsed.text.trim().length > 0 && !saving;

  function toggleTag(tag: Tag) {
    setManualTagIds((current) =>
      current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id],
    );
  }

  function addDate(value: IsoDate) {
    // Append as an inline token so the text stays the single source of truth
    // for parsed dates. Skip it when that day is already tagged, so tapping the
    // same shortcut twice does not litter the text with a duplicate token.
    setText((current) =>
      parseQuickCapture(current).dates.includes(value)
        ? current
        : `${current.trimEnd()} @${value}`.trim(),
    );
    setShowDatePicker(false);
    setDateInput('');
  }

  function addRelativeDate(offset: number) {
    addDate(offset === 0 ? todayIso() : toIsoDate(subDays(new Date(), offset)));
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);

    try {
      const [tags, dateTags] = await Promise.all([
        findOrCreateTags(parsed.tagTitles),
        findOrCreateDateTags(parsed.dates),
      ]);

      const tagIds = [...new Set([...manualTagIds, ...tags.map((tag) => tag.id)])];
      const dateTagIds = [...new Set([...manualDateTagIds, ...dateTags.map((tag) => tag.id)])];

      if (editingMemoryId !== null) {
        await updateMemory(editingMemoryId, { text: parsed.text, tagIds, dateTagIds });
        showToast('Mémoire mise à jour.', { tone: 'success' });
      } else {
        await createMemory({ text: parsed.text, tagIds, dateTagIds });
        clearDraft();
        showToast('Mémoire enregistrée.', { tone: 'success' });
      }

      setText('');
      setManualTagIds([]);
      setManualDateTagIds([]);
      closeCapture();
    } catch (error) {
      showToast(toAppError(error).message, { tone: 'danger', duration: null });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={captureOpen}
      onClose={closeCapture}
      title={isEditing ? 'Modifier la mémoire' : 'Nouvelle mémoire'}
      size="lg"
      footer={
        <>
          <span className={styles.shortcut}>
            <kbd>Ctrl</kbd> + <kbd>↵</kbd>
          </span>
          <Button variant="ghost" onClick={closeCapture}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSave()}
            disabled={!canSave}
            loading={saving}
          >
            {isEditing ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void handleSave();
            }
          }}
          placeholder="Qu'avez-vous envie de retenir ?"
          aria-label="Texte de la mémoire"
          rows={6}
        />

        <p className={styles.hint}>
          <Icon name="sparkles" size={14} />
          Tapez <code>#tag</code> ou <code>@2024-03-12</code>, <code>@hier</code> — c’est reconnu
          automatiquement.
        </p>

        {manualTags.length > 0 ||
        manualDateTags.length > 0 ||
        parsed.tagTitles.length > 0 ||
        parsed.dates.length > 0 ? (
          <div className={styles.chips}>
            {manualTags.map((tag) => (
              <TagChip
                key={tag.id}
                label={tag.title}
                color={tag.color}
                icon="tag"
                size="sm"
                onRemove={() => toggleTag(tag)}
              />
            ))}

            {manualDateTags.map((dateTag) => (
              <TagChip
                key={dateTag.id}
                label={dateTag.label ?? formatLongDate(fromIsoDate(dateTag.date))}
                icon="calendar"
                size="sm"
                onRemove={() =>
                  setManualDateTagIds((current) => current.filter((id) => id !== dateTag.id))
                }
              />
            ))}

            {parsed.tagTitles.map((title) => {
              const existing = Object.values(tagsById).find(
                (tag) => tag.titleNormalized === title.toLowerCase(),
              );

              return (
                <TagChip
                  key={`parsed-tag-${title}`}
                  label={title}
                  color={existing?.color}
                  icon="tag"
                  size="sm"
                  isNew={existing === undefined}
                  onRemove={() =>
                    setText((current) => removeTokensWithValue(current, 'tag', title))
                  }
                />
              );
            })}

            {parsed.dates.map((date) => (
              <TagChip
                key={`parsed-date-${date}`}
                label={formatLongDate(fromIsoDate(date))}
                icon="calendar"
                size="sm"
                onRemove={() => setText((current) => removeTokensWithValue(current, 'date', date))}
              />
            ))}
          </div>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => {
              setShowTagPicker((open) => !open);
              setShowDatePicker(false);
            }}
            aria-expanded={showTagPicker}
          >
            <Icon name="tag" size={15} />
            Tag
          </button>

          <button
            type="button"
            className={styles.actionButton}
            onClick={() => {
              setShowDatePicker((open) => !open);
              setShowTagPicker(false);
              if (dateInput.length === 0) setDateInput(todayIso());
            }}
            aria-expanded={showDatePicker}
          >
            <Icon name="calendar" size={15} />
            Date
          </button>
        </div>

        {showTagPicker ? (
          <TagPickerPanel
            selectedIds={manualTagIds}
            onToggle={toggleTag}
            onCreate={(title) => {
              // Written into the text as `#title` rather than created straight
              // away: nothing is persisted until the memory is saved, so an
              // abandoned capture leaves no orphan tag behind.
              setText((current) => `${current.trimEnd()} #${title.replace(/\s+/g, '-')}`.trim());
              setShowTagPicker(false);
            }}
          />
        ) : null}

        {showDatePicker ? (
          <div className={styles.datePanel}>
            <div className={styles.quickDates}>
              {QUICK_DATES.map(({ label, offset }) => (
                <button
                  key={label}
                  type="button"
                  className={styles.quickDate}
                  onClick={() => addRelativeDate(offset)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={styles.dateRow}>
              <input
                type="date"
                className={styles.dateInput}
                value={dateInput}
                onChange={(event) => setDateInput(event.target.value)}
                aria-label="Date à associer"
              />
              <Button
                size="sm"
                variant="primary"
                disabled={!isIsoDate(dateInput)}
                onClick={() => {
                  if (isIsoDate(dateInput)) addDate(asIsoDate(dateInput));
                }}
              >
                Ajouter
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
