import { addDays } from 'date-fns';
import { useEffect, useRef, useState } from 'react';

import { useToast } from '@/app/providers/toastContext';
import { toAppError } from '@/domain/errors';
import type { RecurrenceRule, Tag, TagId } from '@/domain/models';
import {
  RECURRENCE_PRESETS,
  asIsoDate,
  isIsoDate,
  isSameRecurrence,
  isSeries,
  toIsoDate,
  todayIso,
} from '@/domain/models';
import { TagPickerPanel } from '@/features/tags/components/TagPickerPanel';
import { cn } from '@/lib/cn';
import {
  createTodo,
  findOrCreateTag,
  updateTodo,
  useTagsStore,
  useTodosStore,
  useUiStore,
} from '@/store';
import { Button, Icon, Input, Modal, TagChip } from '@/ui';

import styles from './TodoEditor.module.scss';

/** One-tap dates, the three a task list actually needs. */
const QUICK_DATES: ReadonlyArray<{ label: string; offset: number }> = [
  { label: "Aujourd'hui", offset: 0 },
  { label: 'Demain', offset: 1 },
  { label: 'Dans une semaine', offset: 7 },
];

/**
 * The todo form — creation and edition, in an overlay rather than a route.
 *
 * Same reasoning as quick capture: adding a task happens *while* looking at the
 * list, and losing the list to a form makes people forget what they came for.
 */
export function TodoEditor() {
  const open = useUiStore((state) => state.todoEditorOpen);
  const editingTodoId = useUiStore((state) => state.editingTodoId);
  const closeTodoEditor = useUiStore((state) => state.closeTodoEditor);

  const todosById = useTodosStore((state) => state.byId);
  const tagsById = useTagsStore((state) => state.byId);
  const { showToast } = useToast();

  const edited = editingTodoId === null ? undefined : todosById[editingTodoId];
  const isEditing = edited !== undefined;

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const [tagIds, setTagIds] = useState<TagId[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    setTitle(edited?.title ?? '');
    setDueDate(edited?.dueDate ?? '');
    setRecurrence(edited?.recurrence ?? null);
    setTagIds(edited === undefined ? [] : [...edited.tagIds]);
    setShowTagPicker(false);

    // Focus once the open animation has started, so the caret lands reliably.
    const timeout = setTimeout(() => titleRef.current?.focus(), 60);
    return () => clearTimeout(timeout);
    // Seeding happens on open only; re-running would fight the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingTodoId]);

  const hasDate = isIsoDate(dueDate);
  const canSave = title.trim().length > 0 && !saving;
  const editingOccurrence = edited !== undefined && edited.seriesId !== null;

  function pickDate(offset: number) {
    setDueDate(offset === 0 ? todayIso() : toIsoDate(addDays(new Date(), offset)));
  }

  function clearDate() {
    setDueDate('');
    // Nothing left to repeat from — the same rule the domain applies on save.
    setRecurrence(null);
  }

  function toggleTag(tag: Tag) {
    setTagIds((current) =>
      current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id],
    );
  }

  /**
   * Creates a tag on the spot and selects it.
   *
   * Unlike quick capture, which defers creation by writing a `#token` into the
   * text and resolving it on save — so an abandoned capture leaves no orphan
   * tag. There is no free-text field to hide a token in here, and a picker
   * whose "create" button did nothing until save would be worse than the
   * occasional unused tag, which the Tags page already flags.
   */
  async function createAndSelectTag(newTitle: string) {
    try {
      const tag = await findOrCreateTag(newTitle);
      setTagIds((current) => (current.includes(tag.id) ? current : [...current, tag.id]));
      setShowTagPicker(false);
    } catch (error) {
      showToast(toAppError(error).message, { tone: 'danger' });
    }
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);

    const draft = {
      title: title.trim(),
      dueDate: hasDate ? asIsoDate(dueDate) : null,
      recurrence: hasDate ? recurrence : null,
      tagIds,
    };

    try {
      if (editingTodoId !== null) {
        await updateTodo(editingTodoId, draft);
        showToast('Tâche mise à jour.', { tone: 'success' });
      } else {
        await createTodo(draft);
        showToast('Tâche ajoutée.', { tone: 'success' });
      }

      closeTodoEditor();
    } catch (error) {
      showToast(toAppError(error).message, { tone: 'danger', duration: null });
    } finally {
      setSaving(false);
    }
  }

  const selectedTags = tagIds
    .map((id) => tagsById[id])
    .filter((tag): tag is Tag => tag !== undefined);

  return (
    <Modal
      open={open}
      onClose={closeTodoEditor}
      title={isEditing ? 'Modifier la tâche' : 'Nouvelle tâche'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={closeTodoEditor}>
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
        <Input
          ref={titleRef}
          label="Que faut-il faire ?"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleSave();
            }
          }}
          placeholder="Faire les courses"
          maxLength={280}
        />

        <fieldset className={styles.field}>
          <legend className={styles.legend}>Date de réalisation</legend>

          <div className={styles.quickDates}>
            {QUICK_DATES.map(({ label, offset }) => (
              <button
                key={label}
                type="button"
                className={styles.chipButton}
                onClick={() => pickDate(offset)}
              >
                {label}
              </button>
            ))}
            {dueDate === '' ? null : (
              <button type="button" className={styles.chipButton} onClick={clearDate}>
                Sans date
              </button>
            )}
          </div>

          <input
            type="date"
            className={styles.dateInput}
            value={dueDate}
            onChange={(event) => {
              setDueDate(event.target.value);
              if (event.target.value === '') setRecurrence(null);
            }}
            aria-label="Date de réalisation"
          />
        </fieldset>

        {editingOccurrence ? (
          <p className={styles.note}>
            <Icon name="repeat" size={14} />
            Occurrence détachée d’une tâche récurrente : la modifier ne change pas la récurrence.
          </p>
        ) : (
          <fieldset className={styles.field} disabled={!hasDate}>
            <legend className={styles.legend}>
              Récurrence
              {hasDate ? null : (
                <span className={styles.legendHint}>— choisissez d’abord une date</span>
              )}
            </legend>

            <div className={styles.quickDates}>
              <button
                type="button"
                className={cn(styles.chipButton, recurrence === null && styles.chipActive)}
                onClick={() => setRecurrence(null)}
                aria-pressed={recurrence === null}
              >
                Jamais
              </button>

              {RECURRENCE_PRESETS.map(({ label, rule }) => {
                const active = isSameRecurrence(recurrence, rule);

                return (
                  <button
                    key={label}
                    type="button"
                    className={cn(styles.chipButton, active && styles.chipActive)}
                    onClick={() => setRecurrence(active ? null : rule)}
                    aria-pressed={active}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {isEditing && edited !== undefined && isSeries(edited) ? (
              <p className={styles.note}>
                <Icon name="alert" size={14} />
                Changer la date déplace le rythme : la prochaine occurrence repartira de cette date.
              </p>
            ) : null}
          </fieldset>
        )}

        <fieldset className={styles.field}>
          <legend className={styles.legend}>Tags</legend>

          {selectedTags.length > 0 ? (
            <div className={styles.chips}>
              {selectedTags.map((tag) => (
                <TagChip
                  key={tag.id}
                  label={tag.title}
                  color={tag.color}
                  icon="tag"
                  size="sm"
                  onRemove={() => toggleTag(tag)}
                />
              ))}
            </div>
          ) : null}

          <button
            type="button"
            className={styles.chipButton}
            onClick={() => setShowTagPicker((value) => !value)}
            aria-expanded={showTagPicker}
          >
            <Icon name="tag" size={14} />
            {selectedTags.length === 0 ? 'Ajouter un tag' : 'Modifier les tags'}
          </button>

          {showTagPicker ? (
            <TagPickerPanel
              selectedIds={tagIds}
              onToggle={toggleTag}
              onCreate={(newTitle) => void createAndSelectTag(newTitle)}
            />
          ) : null}
        </fieldset>
      </div>
    </Modal>
  );
}
