import { useCallback } from 'react';

import { useToast } from '@/app/providers/toastContext';
import { toAppError } from '@/domain/errors';
import type { MemoryId } from '@/domain/models';
import { hardDeleteMemory, restoreMemory, softDeleteMemory, useUiStore } from '@/store';

/**
 * Memory mutations with the interaction that has to go with them.
 *
 * Deletion is soft and always offers an immediate undo. Swipe mode invites
 * people to delete quickly, and on a personal knowledge base a mis-tap that
 * cannot be taken back is the worst thing this app could do.
 */
export function useMemoryActions() {
  const { showToast } = useToast();
  const openMemoryEditor = useUiStore((state) => state.openMemoryEditor);

  const edit = useCallback(
    (memoryId: MemoryId) => {
      openMemoryEditor(memoryId);
    },
    [openMemoryEditor],
  );

  const remove = useCallback(
    async (memoryId: MemoryId) => {
      try {
        await softDeleteMemory(memoryId);

        showToast('Mémoire déplacée dans la corbeille.', {
          action: {
            label: 'Annuler',
            onClick: () => {
              void restoreMemory(memoryId).catch((error: unknown) => {
                showToast(toAppError(error).message, { tone: 'danger' });
              });
            },
          },
          duration: 8_000,
        });
      } catch (error) {
        showToast(toAppError(error).message, { tone: 'danger' });
      }
    },
    [showToast],
  );

  const restore = useCallback(
    async (memoryId: MemoryId) => {
      try {
        await restoreMemory(memoryId);
        showToast('Mémoire restaurée.', { tone: 'success' });
      } catch (error) {
        showToast(toAppError(error).message, { tone: 'danger' });
      }
    },
    [showToast],
  );

  /** Irreversible — only from the trash, behind an explicit confirmation. */
  const purge = useCallback(
    async (memoryId: MemoryId) => {
      try {
        await hardDeleteMemory(memoryId);
        showToast('Mémoire supprimée définitivement.');
      } catch (error) {
        showToast(toAppError(error).message, { tone: 'danger' });
      }
    },
    [showToast],
  );

  return { edit, remove, restore, purge };
}
