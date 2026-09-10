import { useState } from 'react';
import { Link } from 'react-router';

import { useAuth } from '@/app/providers/authContext';
import { useTheme } from '@/app/providers/themeContext';
import { useToast } from '@/app/providers/toastContext';
import { searchPath } from '@/app/router/paths';
import { AUTH_LABELS } from '@/config/labels';
import { toAppError } from '@/domain/errors';
import type { ThemePreference } from '@/domain/models';
import { exportFilename, toJsonExport, toMarkdownExport } from '@/domain/services/export';
import { criteriaToSearchParams, emptySearchCriteria } from '@/domain/services/searchQuery';
import { cn } from '@/lib/cn';
import { downloadTextFile } from '@/lib/download';
import {
  emptyTodoTrash,
  emptyTrash,
  useDateTagsStore,
  useMemoriesStore,
  useTagsStore,
  useTodosStore,
} from '@/store';
import { Button, Card, Icon, Page } from '@/ui';
import type { IconName } from '@/ui';

import styles from './SettingsPage.module.scss';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'system', label: 'Système', icon: 'monitor' },
  { value: 'light', label: 'Clair', icon: 'sun' },
  { value: 'dark', label: 'Sombre', icon: 'moon' },
];

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { preference, setPreference } = useTheme();
  const { showToast } = useToast();

  const memories = useMemoriesStore((state) => state.all);
  const activeCount = useMemoriesStore((state) => state.active.length);
  const trashed = useMemoriesStore((state) => state.trashed);
  const tags = useTagsStore((state) => state.all);
  const dateTags = useDateTagsStore((state) => state.all);
  const todos = useTodosStore((state) => state.all);
  const trashedTodos = useTodosStore((state) => state.trashed);

  const [signingOut, setSigningOut] = useState(false);
  const [confirmingPurge, setConfirmingPurge] = useState(false);
  const [purging, setPurging] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  function handleExport(format: 'json' | 'md') {
    const input = { memories, tags, dateTags, todos };

    downloadTextFile(
      format === 'json' ? toJsonExport(input) : toMarkdownExport(input),
      exportFilename(format),
      format === 'json' ? 'application/json' : 'text/markdown',
    );
  }

  async function handleEmptyTrash() {
    setPurging(true);
    try {
      // Both collections soft-delete, so both are purged by the one gesture —
      // a hidden pile of deleted todos with no way to empty it would grow
      // forever, which is exactly what the trash exists to prevent.
      await Promise.all([emptyTrash(), emptyTodoTrash()]);
      showToast('Corbeille vidée.', { tone: 'success' });
      setConfirmingPurge(false);
    } catch (error) {
      showToast(toAppError(error).message, { tone: 'danger' });
    } finally {
      setPurging(false);
    }
  }

  return (
    <Page title="Réglages">
      <div className={styles.sections}>
        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Compte</h2>
          <p className={styles.email}>{user?.email}</p>
          <Button
            variant="secondary"
            onClick={() => void handleSignOut()}
            loading={signingOut}
            iconLeft={<Icon name="logout" size={17} />}
          >
            {AUTH_LABELS.signOut}
          </Button>
        </Card>

        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Apparence</h2>

          {/* Native radios rather than buttons with role="radio": arrow-key
              navigation, grouping and form semantics all come for free. */}
          <fieldset className={styles.themeOptions}>
            <legend className={styles.legend}>Thème de l’interface</legend>

            {THEME_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  styles.themeOption,
                  preference === option.value && styles.themeOptionActive,
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={preference === option.value}
                  onChange={() => setPreference(option.value)}
                  className={styles.themeRadio}
                />
                <Icon name={option.icon} size={18} />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
        </Card>

        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Vos données</h2>
          <p className={styles.sectionHint}>
            {activeCount} mémoire{activeCount > 1 ? 's' : ''} · {tags.length} tag
            {tags.length > 1 ? 's' : ''} · {dateTags.length} date{dateTags.length > 1 ? 's' : ''}.
            Tout est exportable, à tout moment, sans passer par nous.
          </p>

          <div className={styles.buttonRow}>
            <Button
              variant="secondary"
              onClick={() => handleExport('json')}
              iconLeft={<Icon name="layers" size={17} />}
            >
              Export JSON
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleExport('md')}
              iconLeft={<Icon name="edit" size={17} />}
            >
              Export Markdown
            </Button>
          </div>
        </Card>

        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Corbeille</h2>

          {trashed.length === 0 && trashedTodos.length === 0 ? (
            <p className={styles.sectionHint}>La corbeille est vide.</p>
          ) : (
            <>
              <p className={styles.sectionHint}>
                {[
                  trashed.length > 0
                    ? `${trashed.length} mémoire${trashed.length > 1 ? 's' : ''}`
                    : null,
                  trashedTodos.length > 0
                    ? `${trashedTodos.length} tâche${trashedTodos.length > 1 ? 's' : ''}`
                    : null,
                ]
                  .filter((part) => part !== null)
                  .join(' et ')}{' '}
                en attente de suppression définitive. Tout reste restaurable tant que vous ne videz
                pas la corbeille.
              </p>

              <div className={styles.buttonRow}>
                {trashed.length === 0 ? null : (
                  <Link
                    to={searchPath(
                      criteriaToSearchParams({ ...emptySearchCriteria, scope: 'trash' }),
                    )}
                    className={styles.link}
                  >
                    <Button variant="secondary" iconLeft={<Icon name="restore" size={17} />}>
                      Consulter
                    </Button>
                  </Link>
                )}

                {confirmingPurge ? (
                  <>
                    <Button variant="ghost" onClick={() => setConfirmingPurge(false)}>
                      Annuler
                    </Button>
                    <Button
                      variant="danger"
                      loading={purging}
                      onClick={() => void handleEmptyTrash()}
                    >
                      Supprimer définitivement
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmingPurge(true)}
                    iconLeft={<Icon name="trash" size={17} />}
                  >
                    Vider
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </Page>
  );
}
