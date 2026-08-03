import { z } from 'zod';

/**
 * Environment variables, validated once at module load.
 *
 * A missing or malformed variable is a configuration error, not a runtime
 * condition to handle: failing loudly here beats a cryptic Firebase error three
 * screens deep.
 */
const booleanFlag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const port = z.coerce.number().int().positive().max(65535);

const envSchema = z.object({
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),

  VITE_USE_FIREBASE_EMULATORS: booleanFlag,
  VITE_FIREBASE_EMULATOR_HOST: z.string().min(1).default('127.0.0.1'),
  VITE_AUTH_EMULATOR_PORT: port.default(9099),
  VITE_FIRESTORE_EMULATOR_PORT: port.default(8080),
});

function parseEnv(source: Record<string, unknown>) {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')} — ${issue.message}`)
      .join('\n');

    throw new Error(
      `Configuration Firebase invalide.\n${details}\n\n` +
        'Copiez .env.example vers .env.local et renseignez les valeurs de votre projet Firebase.',
    );
  }

  return result.data;
}

const parsed = parseEnv(import.meta.env as unknown as Record<string, unknown>);

export const firebaseConfig = {
  apiKey: parsed.VITE_FIREBASE_API_KEY,
  authDomain: parsed.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: parsed.VITE_FIREBASE_PROJECT_ID,
  storageBucket: parsed.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: parsed.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: parsed.VITE_FIREBASE_APP_ID,
} as const;

export const emulatorConfig = {
  enabled: parsed.VITE_USE_FIREBASE_EMULATORS,
  host: parsed.VITE_FIREBASE_EMULATOR_HOST,
  authPort: parsed.VITE_AUTH_EMULATOR_PORT,
  firestorePort: parsed.VITE_FIRESTORE_EMULATOR_PORT,
} as const;

export const isDev = import.meta.env.DEV;

/** A `demo-` prefix puts the Firebase SDK in demo mode: it refuses to reach any
 * real backend, so this project id only ever makes sense with the emulators. */
const isDemoProject = firebaseConfig.projectId.startsWith('demo-');

// The demo defaults live in `.env`, which Vite loads in every mode — including
// production builds. Shipping one would produce an app that silently fails
// every write, so it fails loudly here instead.
if (import.meta.env.PROD && isDemoProject && !emulatorConfig.enabled) {
  throw new Error(
    `Build de production configuré sur le projet de démonstration "${firebaseConfig.projectId}".\n` +
      'Renseignez .env.local (ou .env.production) avec les identifiants de votre projet Firebase.',
  );
}

// Which backend is in use is the first thing you want to know when data does not
// show up — and the last thing you think to check.
if (isDev) {
  console.info(
    `[me-mories] Projet Firebase : ${firebaseConfig.projectId} · ` +
      (emulatorConfig.enabled
        ? `émulateurs ${emulatorConfig.host} (auth ${emulatorConfig.authPort}, firestore ${emulatorConfig.firestorePort})`
        : 'backend réel'),
  );
}
