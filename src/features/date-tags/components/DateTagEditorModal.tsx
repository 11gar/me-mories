import { useEffect, useState } from 'react';

import { useToast } from '@/app/providers/toastContext';
import { toAppError } from '@/domain/errors';
import type { DateTag } from '@/domain/models';
import { asIsoDate, isIsoDate } from '@/domain/models';
import { deleteDateTag, updateDateTag } from '@/store';
import { Button, Icon, Input, Modal } from '@/ui';

import styles from './DateTagEditorModal.module.scss';

export interface DateTagEditorModalProps {
  dateTag: DateTag | null;
  usageCount: number;
  onClose: () => void;
}

export function DateTagEditorModal({ dateTag, usageCount, onClose }: DateTagEditorModalProps) {
  const { showToast } = useToast();

  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (dateTag === null) return;
    setDate(dateTag.date);
    setLabel(dateTag.label ?? '');
    setConfirmingDelete(false);
  }, [dateTag]);

  if (dateTag === null) return null;

  const dateError = isIsoDate(date) ? undefined : 'Choisissez une date valide.';
  const trimmedLabel = label.trim();
  const changed = date !== dateTag.date || trimmedLabel !== (dateTag.label ?? '');

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
      title={confirmingDelete ? 'Supprimer la date' : 'Modifier la date'}
      size="sm"
      footer={
        confirmingDelete ? (
          <>
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
              Retour
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => void run(() => deleteDateTag(dateTag.id), 'Date supprimée.')}
            >
              Supprimer
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button
              variant="primary"
              disabled={!changed || dateError !== undefined}
              loading={pending}
              onClick={() =>
                void run(
                  () =>
                    updateDateTag(dateTag.id, {
                      date: asIsoDate(date),
                      label: trimmedLabel.length === 0 ? null : trimmedLabel,
                    }),
                  'Date mise à jour.',
                )
              }
            >
              Enregistrer
            </Button>
          </>
        )
      }
    >
      {confirmingDelete ? (
        <p className={styles.explain}>
          {usageCount === 0
            ? 'Cette date n’est associée à aucune mémoire.'
            : `La date sera retirée des ${usageCount} mémoire${usageCount > 1 ? 's' : ''} qui la portent. Les mémoires elles-mêmes sont conservées.`}
        </p>
      ) : (
        <div className={styles.form}>
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            error={dateError}
          />

          <Input
            label="Libellé"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Voyage au Japon, naissance de Léa…"
            hint="Facultatif. Sans libellé, seule la date s’affiche — mais un libellé rend la date lisible des années plus tard."
          />

          <p className={styles.usage}>
            Associée à {usageCount} mémoire{usageCount > 1 ? 's' : ''}.
          </p>

          <div className={styles.secondaryActions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(true)}
              iconLeft={<Icon name="trash" size={16} />}
            >
              Supprimer
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
