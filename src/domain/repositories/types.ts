import type { AppError } from '../errors';

export type Unsubscribe = () => void;

/**
 * A single document change. `upserted` covers both creation and modification —
 * the store applies them identically, and collapsing the two removes a case
 * every consumer would otherwise have to handle.
 */
export type CollectionChange<TEntity> =
  { type: 'upserted'; entity: TEntity } | { type: 'removed'; id: string };

export interface CollectionSnapshot<TEntity> {
  changes: CollectionChange<TEntity>[];
  /**
   * True while the data comes from the local cache only. The first snapshot
   * after a cold start is served from IndexedDB with `fromCache: true`, which
   * is what lets the app paint instantly and reconcile a moment later.
   */
  fromCache: boolean;
  /** True on the first snapshot, once the whole collection has been delivered. */
  isInitial: boolean;
}

export interface ObserveHandlers<TEntity> {
  onSnapshot(snapshot: CollectionSnapshot<TEntity>): void;
  onError(error: AppError): void;
}
