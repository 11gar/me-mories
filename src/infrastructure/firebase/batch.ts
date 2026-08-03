import { writeBatch } from 'firebase/firestore';
import type { Firestore, WriteBatch } from 'firebase/firestore';

import { withMappedError } from './errorMapping';

/**
 * Firestore caps a batch at 500 operations. Cascades (deleting a tag used by
 * hundreds of memories, merging two tags) routinely go past that, so batches
 * are chunked. The margin below 500 leaves room for callers that queue more
 * than one operation per item.
 */
const MAX_OPERATIONS_PER_BATCH = 450;

export async function runBatched<TItem>(
  db: Firestore,
  items: readonly TItem[],
  queueOperation: (batch: WriteBatch, item: TItem) => void,
): Promise<void> {
  if (items.length === 0) return;

  for (let offset = 0; offset < items.length; offset += MAX_OPERATIONS_PER_BATCH) {
    const chunk = items.slice(offset, offset + MAX_OPERATIONS_PER_BATCH);
    const batch = writeBatch(db);

    for (const item of chunk) {
      queueOperation(batch, item);
    }

    await withMappedError(() => batch.commit());
  }
}
