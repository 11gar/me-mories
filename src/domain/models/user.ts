import { z } from 'zod';

import { userIdSchema } from './ids';

export const themePreferenceSchema = z.enum(['system', 'light', 'dark']);
export type ThemePreference = z.infer<typeof themePreferenceSchema>;

/**
 * Per-user settings. Kept as its own object so new preferences are additive and
 * an older document stays valid — every field has a default.
 */
export const userSettingsSchema = z.object({
  theme: themePreferenceSchema.default('system'),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

export const defaultUserSettings: UserSettings = { theme: 'system' };

export const userProfileSchema = z.object({
  id: userIdSchema,
  email: z.string().min(1),
  displayName: z.string().min(1).nullable().default(null),
  createdAt: z.date(),
  updatedAt: z.date(),
  settings: userSettingsSchema.default(defaultUserSettings),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

/** The authenticated identity, as far as the UI is concerned. */
export interface AuthUser {
  id: z.infer<typeof userIdSchema>;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
}
