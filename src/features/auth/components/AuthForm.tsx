import { useState } from 'react';
import type { FormEvent } from 'react';

import { useAuth } from '@/app/providers/authContext';
import { AUTH_LABELS, VALIDATION } from '@/config/labels';
import { toAppError } from '@/domain/errors';
import { Button, Icon, Input } from '@/ui';

import styles from './AuthForm.module.scss';

export type AuthMode = 'signIn' | 'signUp' | 'reset';

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(mode: AuthMode, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  if (email.trim().length === 0) errors.email = VALIDATION.emailRequired;
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = VALIDATION.emailInvalid;

  if (mode !== 'reset') {
    if (password.length === 0) errors.password = VALIDATION.passwordRequired;
    else if (mode === 'signUp' && password.length < MIN_PASSWORD_LENGTH) {
      errors.password = VALIDATION.passwordTooShort;
    }
  }

  return errors;
}

/**
 * Sign in, sign up and password reset in one form.
 *
 * It deliberately does not navigate on success: the route guard reacts to the
 * auth state and decides where the user lands, so there is a single source of
 * truth for that decision.
 */
export function AuthForm() {
  const { signIn, signUp, signInWithGoogle, sendPasswordReset } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<'form' | 'google' | null>(null);

  function switchMode(next: AuthMode) {
    setMode(next);
    setFieldErrors({});
    setFormError(null);
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    const errors = validate(mode, email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPending('form');

    try {
      if (mode === 'signIn') {
        await signIn({ email: email.trim(), password });
      } else if (mode === 'signUp') {
        await signUp({ email: email.trim(), password });
      } else {
        await sendPasswordReset(email.trim());
        setNotice(
          'Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d’être envoyé.',
        );
      }
    } catch (error) {
      setFormError(toAppError(error).message);
    } finally {
      setPending(null);
    }
  }

  async function handleGoogle() {
    setFormError(null);
    setNotice(null);
    setPending('google');

    try {
      await signInWithGoogle();
    } catch (error) {
      setFormError(toAppError(error).message);
    } finally {
      setPending(null);
    }
  }

  const submitLabel =
    mode === 'signIn'
      ? AUTH_LABELS.signIn
      : mode === 'signUp'
        ? AUTH_LABELS.signUp
        : 'Envoyer le lien';

  return (
    <div className={styles.root}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Input
          label={AUTH_LABELS.email}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          required
        />

        {mode === 'reset' ? null : (
          <div className={styles.passwordField}>
            <Input
              label={AUTH_LABELS.password}
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
              hint={mode === 'signUp' ? 'Au moins 6 caractères.' : undefined}
              required
            />
            <button
              type="button"
              className={styles.reveal}
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
            </button>
          </div>
        )}

        {formError === null ? null : (
          <p className={styles.error} role="alert">
            <Icon name="alert" size={16} />
            {formError}
          </p>
        )}

        {notice === null ? null : (
          // <output> is the element for a form's result, and carries the
          // polite live-region semantics we want here for free.
          <output className={styles.notice}>
            <Icon name="check" size={16} />
            {notice}
          </output>
        )}

        <Button type="submit" variant="primary" size="lg" fullWidth loading={pending === 'form'}>
          {submitLabel}
        </Button>
      </form>

      {mode === 'reset' ? null : (
        <>
          <div className={styles.separator}>
            <span>ou</span>
          </div>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            loading={pending === 'google'}
            onClick={handleGoogle}
            iconLeft={<Icon name="google" size={18} />}
          >
            {AUTH_LABELS.continueWithGoogle}
          </Button>
        </>
      )}

      <div className={styles.switches}>
        {mode === 'signIn' ? (
          <>
            <button type="button" className={styles.link} onClick={() => switchMode('reset')}>
              {AUTH_LABELS.forgotPassword}
            </button>
            <p className={styles.hint}>
              Pas encore de compte&nbsp;?{' '}
              <button type="button" className={styles.link} onClick={() => switchMode('signUp')}>
                {AUTH_LABELS.signUp}
              </button>
            </p>
          </>
        ) : (
          <p className={styles.hint}>
            {mode === 'signUp' ? 'Vous avez déjà un compte' : 'Retour à la connexion'}&nbsp;?{' '}
            <button type="button" className={styles.link} onClick={() => switchMode('signIn')}>
              {AUTH_LABELS.signIn}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
