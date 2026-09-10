import { NavLink, Outlet } from 'react-router';

import { ROUTES } from '@/app/router/paths';
import { NAV_LABELS } from '@/config/labels';
import { CommandPalette } from '@/features/command-palette/components/CommandPalette';
import { CaptureFab } from '@/features/quick-capture/components/CaptureFab';
import { QuickCapture } from '@/features/quick-capture/components/QuickCapture';
import { cn } from '@/lib/cn';
import { Icon } from '@/ui';
import type { IconName } from '@/ui';

import styles from './AppLayout.module.scss';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /**
   * Hidden from the mobile bar, which only has room for five.
   *
   * "Relire" gave up its slot to "À faire": one is a browsing mode reached when
   * there is time to spare, the other is opened several times a day. On a phone
   * the five thumb-reachable slots go to what people actually tap.
   */
  desktopOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.home, label: NAV_LABELS.home, icon: 'home' },
  { to: ROUTES.memories, label: NAV_LABELS.memories, icon: 'layers' },
  { to: ROUTES.todos, label: NAV_LABELS.todos, icon: 'checkSquare' },
  { to: ROUTES.calendar, label: NAV_LABELS.calendar, icon: 'calendar' },
  { to: ROUTES.swipe, label: NAV_LABELS.swipe, icon: 'shuffle', desktopOnly: true },
  { to: ROUTES.tags, label: NAV_LABELS.tags, icon: 'tag', desktopOnly: true },
  { to: ROUTES.dateTags, label: NAV_LABELS.dateTags, icon: 'sparkles', desktopOnly: true },
  { to: ROUTES.settings, label: NAV_LABELS.settings, icon: 'settings' },
];

// `base` is optional because CSS-module lookups are typed through an index
// signature, which `noUncheckedIndexedAccess` widens with `undefined`.
const navLinkClass =
  (base: string | undefined) =>
  ({ isActive }: { isActive: boolean }) =>
    cn(base, isActive && styles['active']);

export function AppLayout() {
  return (
    <div className={styles.shell}>
      {/* Desktop: a persistent sidebar. Mobile: a bottom bar, thumb-reachable. */}
      <nav className={styles.sidebar} aria-label="Navigation principale">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <svg viewBox="0 0 32 32" width="26" height="26">
              <rect width="32" height="32" rx="8" fill="var(--mm-primary)" />
              <path
                d="M9 22V10.6c0-.4.5-.6.8-.3l4.9 5.2c.2.2.6.2.8 0l4.9-5.2c.3-.3.8-.1.8.3V22"
                fill="none"
                stroke="var(--mm-primary-contrast)"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className={styles.brandName}>Me&rsquo;Mories</span>
        </div>

        <ul className={styles.sidebarList} role="list">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === ROUTES.home}
                className={navLinkClass(styles.sidebarLink)}
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={styles.bottomNav} aria-label="Navigation principale">
        <ul className={styles.bottomList} role="list">
          {NAV_ITEMS.filter((item) => item.desktopOnly !== true).map((item) => (
            <li key={item.to} className={styles.bottomItem}>
              <NavLink
                to={item.to}
                end={item.to === ROUTES.home}
                className={navLinkClass(styles.bottomLink)}
              >
                <Icon name={item.icon} size={21} />
                <span className={styles.bottomLabel}>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mounted at the shell level so capture is one keystroke away from every
          screen, and never unmounts on navigation. */}
      <CaptureFab />
      <QuickCapture />
      <CommandPalette />
    </div>
  );
}
