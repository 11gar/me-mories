import { create } from 'zustand';

import type { MemoryId, TodoId } from '@/domain/models';

interface UiState {
  /** Quick capture is an overlay rather than a route: it must be reachable from
   * anywhere without losing the page underneath. */
  captureOpen: boolean;
  /** When set, the overlay edits an existing memory instead of creating one. */
  editingMemoryId: MemoryId | null;

  /** The todo form, on the same pattern — an overlay over the Todo page, so
   * ticking off the list is never interrupted by a navigation. */
  todoEditorOpen: boolean;
  editingTodoId: TodoId | null;

  openCapture: () => void;
  openMemoryEditor: (memoryId: MemoryId) => void;
  closeCapture: () => void;

  openTodoCreator: () => void;
  openTodoEditor: (todoId: TodoId) => void;
  closeTodoEditor: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  captureOpen: false,
  editingMemoryId: null,
  todoEditorOpen: false,
  editingTodoId: null,

  openCapture: () => set({ captureOpen: true, editingMemoryId: null }),
  openMemoryEditor: (memoryId) => set({ captureOpen: true, editingMemoryId: memoryId }),
  closeCapture: () => set({ captureOpen: false, editingMemoryId: null }),

  openTodoCreator: () => set({ todoEditorOpen: true, editingTodoId: null }),
  openTodoEditor: (todoId) => set({ todoEditorOpen: true, editingTodoId: todoId }),
  closeTodoEditor: () => set({ todoEditorOpen: false, editingTodoId: null }),
}));
