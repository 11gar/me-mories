import { create } from 'zustand';

import type { MemoryId } from '@/domain/models';

interface UiState {
  /** Quick capture is an overlay rather than a route: it must be reachable from
   * anywhere without losing the page underneath. */
  captureOpen: boolean;
  /** When set, the overlay edits an existing memory instead of creating one. */
  editingMemoryId: MemoryId | null;

  openCapture: () => void;
  openMemoryEditor: (memoryId: MemoryId) => void;
  closeCapture: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  captureOpen: false,
  editingMemoryId: null,

  openCapture: () => set({ captureOpen: true, editingMemoryId: null }),
  openMemoryEditor: (memoryId) => set({ captureOpen: true, editingMemoryId: memoryId }),
  closeCapture: () => set({ captureOpen: false, editingMemoryId: null }),
}));
