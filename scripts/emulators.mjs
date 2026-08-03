#!/usr/bin/env node
/**
 * Starts the Firebase Emulator Suite, working around a Windows/JDK issue.
 *
 * Since JDK 21, java.nio's Pipe is backed by an AF_UNIX socket created inside
 * `jdk.net.unixdomain.tmpdir` (which defaults to `java.io.tmpdir`). On some
 * Windows profiles — roaming, AzureAD-joined, redirected, or exposed as an 8.3
 * short path like C:\Users\ANSGAR~1 — connecting to that socket fails with
 * "java.net.SocketException: Invalid argument: connect", and the Firestore
 * emulator dies at startup with "failed to create a child event loop".
 *
 * Pointing the JDK at the machine-wide temp directory avoids it. Everything
 * here is a no-op on macOS and Linux, and an explicit JAVA_TOOL_OPTIONS or
 * MEMORIES_JAVA_TMPDIR always wins.
 */
import { spawn } from 'node:child_process';
import { accessSync, constants } from 'node:fs';

const FALLBACK_WINDOWS_TMPDIR = 'C:\\Windows\\Temp';

function isWritableDirectory(path) {
  try {
    accessSync(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveJavaToolOptions() {
  if (process.env.JAVA_TOOL_OPTIONS) return process.env.JAVA_TOOL_OPTIONS;
  if (process.platform !== 'win32') return undefined;

  const tmpdir = process.env.MEMORIES_JAVA_TMPDIR ?? FALLBACK_WINDOWS_TMPDIR;

  if (!isWritableDirectory(tmpdir)) {
    console.warn(
      `[emulators] ${tmpdir} n'est pas accessible en écriture. Si l'émulateur Firestore\n` +
        '            échoue avec "failed to create a child event loop", définissez\n' +
        '            MEMORIES_JAVA_TMPDIR sur un dossier temporaire accessible.',
    );
    return undefined;
  }

  return `-Djdk.net.unixdomain.tmpdir=${tmpdir}`;
}

const javaToolOptions = resolveJavaToolOptions();
const env = { ...process.env };

if (javaToolOptions) {
  env.JAVA_TOOL_OPTIONS = javaToolOptions;
}

// `--exec "<command>"` boots the emulators, runs the command against them and
// shuts everything down (used by the rules tests). Without it, the emulators
// stay up for local development.
const argv = process.argv.slice(2);
const execIndex = argv.indexOf('--exec');
const hasExec = execIndex !== -1;
const execCommand = hasExec ? argv[execIndex + 1] : undefined;
const passthrough = hasExec ? argv.filter((_, i) => i !== execIndex && i !== execIndex + 1) : argv;

if (hasExec && !execCommand) {
  console.error('[emulators] --exec attend une commande à exécuter.');
  process.exit(1);
}

// `shell: true` means Node joins argv without quoting, so the command — which
// contains spaces — has to be quoted here.
const firebaseArgs = hasExec
  ? ['emulators:exec', '--only', 'auth,firestore', ...passthrough, `"${execCommand}"`]
  : ['emulators:start', '--only', 'auth,firestore', ...passthrough];

const child = spawn('firebase', firebaseArgs, { stdio: 'inherit', env, shell: true });

child.on('exit', (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0));
});
