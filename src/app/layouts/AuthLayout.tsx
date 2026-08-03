import { Outlet } from 'react-router';

import styles from './AuthLayout.module.scss';

export function AuthLayout() {
  return (
    <main className={styles.root}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <span className={styles.mark} aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28">
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
          <h1 className={styles.wordmark}>Me&rsquo;Mories</h1>
          <p className={styles.tagline}>
            Notez en quelques secondes. Retrouvez des années plus tard.
          </p>
        </header>

        <Outlet />
      </div>
    </main>
  );
}
