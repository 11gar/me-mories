import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import '@testing-library/jest-dom/vitest';

/**
 * Unmount whatever the previous test rendered.
 *
 * Testing Library only registers this automatically when the test framework
 * exposes `afterEach` globally, and this project deliberately runs Vitest
 * without `globals`. Without it every render piles up in the same `document`,
 * and queries start failing with "found multiple elements" — a confusing way to
 * learn that the previous test is still on screen.
 */
afterEach(() => {
  cleanup();
});
