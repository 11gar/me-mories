import { useEffect, useState } from 'react';

import { useToast } from '@/app/providers/toastContext';
import { toAppError } from '@/domain/errors';
import type { Tag, TagId } from '@/domain/models';
import { findTagByTitle } from '@/domain/models';
import { TAG_COLORS } from '@/domain/services/colors';
import { deleteTag, mergeTags, updateTag, useTagsStore } from '@/store';
import { Button, ColorPicker, Icon, Input, Modal } from '@/ui';

import styles from './TagEditorModal.module.scss';

export interface TagEditorModalProps {
  tag: Tag | null;
  usageCount: number;
  onClose: () => void;
}

type Mode = 'edit' | 'confirmDelete' | 'merge';

export function TagEditorModal({ tag, usageCount, onClose }: TagEditorModalProps) {
  const allTags = useTagsStore((state) => state.all);
  const { showToast } = useToast();

  const [mode, setMode] = useState<Mode>('edit');
  const [title, setTitle] = useState('');
  const [color, setColor] = useState<string>(TAG_COLORS[0]);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (tag === null) return;
    setMode('edit');
    setTitle(tag.title);
    setColor(tag.color);
    setMergeTargetId('');
  }, [tag]);

  if (tag === null) return null;

  const trimmed = title.trim();
  const duplicate = findTagByTitle(allTags, trimmed);
  const titleError =
    trimmed.length === 0
      ? 'Le nom ne peut pas être vide.'
      : duplicate !== undefined && duplicate.id !== tag.id
        ? `« ${duplicate.title} » existe déjà. Utilisez la fusion pour les réunir.`
        : undefined;

  const canSave = titleError === undefined && (trimmed !== tag.title || color !== tag.color);
  const mergeCandidates = allTags.filter((candidate) => candidate.id !== tag.id);

  async function run(action: () => Promise<void>, successMessage: string) {
    setPending(true);
    try {
      await action();
      showToast(successMessage, { tone: 'success' });
      onClose();
    } catch (error) {
      showToast(toAppError(error).message, { tone: 'danger' });
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={
        mode === 'edit'
          ? 'Modifier le tag'
          : mode === 'merge'
            ? 'Fusionner le tag'
            : 'Supprimer le tag'
      }
      size="sm"
      footer={
        mode === 'edit' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button
              variant="primary"
              disabled={!canSave}
              loading={pending}
              onClick={() =>
                void run(() => updateTag(tag.id, { title: trimmed, color }), 'Tag mis à jour.')
              }
            >
              Enregistrer
            </Button>
          </>
        ) : mode === 'merge' ? (
          <>
            <Button variant="ghost" onClick={() => setMode('edit')}>
              Retour
            </Button>
            <Button
              variant="primary"
              disabled={mergeTargetId.length === 0}
              loading={pending}
              onClick={() =>
                void run(() => mergeTags(tag.id, mergeTargetId as TagId), 'Tags fusionnés.')
              }
            >
              Fusionner
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setMode('edit')}>
              Retour
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => void run(() => deleteTag(tag.id), 'Tag supprimé.')}
            >
              Supprimer
            </Button>
          </>
        )
      }
    >
      {mode === 'edit' ? (
        <div className={styles.form}>
          <Input
            label="Nom"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={titleError}
          />

          <ColorPicker label="Couleur" value={color} onChange={setColor} colors={TAG_COLORS} />

          <p className={styles.usage}>
            Utilisé par {usageCount} mémoire{usageCount > 1 ? 's' : ''}.
          </p>

          <div className={styles.secondaryActions}>
            {mergeCandidates.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode('merge')}
                iconLeft={<Icon name="layers" size={16} />}
              >
                Fusionner avec…
              </Button>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode('confirmDelete')}
              iconLeft={<Icon name="trash" size={16} />}
            >
              Supprimer
            </Button>
          </div>
        </div>
      ) : mode === 'merge' ? (
        <div className={styles.form}>
          <p className={styles.explain}>
            Les {usageCount} mémoire{usageCount > 1 ? 's' : ''} portant «&nbsp;{tag.title}&nbsp;»
            recevront le tag choisi, puis «&nbsp;{tag.title}&nbsp;» sera supprimé.
          </p>

          <label className={styles.selectLabel} htmlFor="merge-target">
            Fusionner dans
          </label>
          <select
            id="merge-target"
            className={styles.select}
            value={mergeTargetId}
            onChange={(event) => setMergeTargetId(event.target.value)}
          >
            <option value="">Choisir un tag…</option>
            {mergeCandidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className={styles.explain}>
          {usageCount === 0
            ? 'Ce tag n’est utilisé par aucune mémoire.'
            : `Le tag sera retiré des ${usageCount} mémoire${usageCount > 1 ? 's' : ''} qui le portent. Les mémoires elles-mêmes sont conservées.`}
        </p>
      )}
    </Modal>
  );
}
