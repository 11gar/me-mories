/**
 * Strings that appear in more than one place.
 *
 * Deliberately *not* an exhaustive catalogue of every string in the app:
 * page-specific prose stays inline, where it is readable next to the markup it
 * belongs to. Centralising everything would mean reading `labels.home.title`
 * instead of the actual sentence, for no benefit until i18n actually lands.
 *
 * What lives here is what has to stay identical across screens — navigation,
 * action verbs, shared validation messages — which is also exactly what a
 * future extraction pass would need first.
 */
export const NAV_LABELS = {
  home: 'Accueil',
  memories: 'Mémoires',
  todos: 'À faire',
  calendar: 'Calendrier',
  swipe: 'Relire',
  tags: 'Tags',
  dateTags: 'Dates',
  settings: 'Réglages',
} as const;

export const ACTIONS = {
  save: 'Enregistrer',
  cancel: 'Annuler',
  delete: 'Supprimer',
  edit: 'Modifier',
  create: 'Créer',
  close: 'Fermer',
  restore: 'Restaurer',
  undo: 'Annuler',
  retry: 'Réessayer',
  search: 'Rechercher',
  newMemory: 'Nouvelle mémoire',
  newTodo: 'Nouvelle tâche',
  postpone: 'Remettre à demain',
} as const;

export const AUTH_LABELS = {
  signIn: 'Se connecter',
  signUp: 'Créer un compte',
  signOut: 'Se déconnecter',
  email: 'Adresse e-mail',
  password: 'Mot de passe',
  displayName: 'Prénom',
  forgotPassword: 'Mot de passe oublié ?',
  continueWithGoogle: 'Continuer avec Google',
} as const;

export const VALIDATION = {
  emailRequired: 'Renseignez votre adresse e-mail.',
  emailInvalid: "Cette adresse e-mail n'est pas valide.",
  passwordRequired: 'Renseignez votre mot de passe.',
  passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères.',
  textRequired: 'Écrivez quelque chose avant d’enregistrer.',
} as const;
