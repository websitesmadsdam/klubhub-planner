import { toast } from 'sonner';

const ERROR_MAP: Record<string, string> = {
  'Only one training plan can be active': 'Der kan kun være én aktiv plan ad gangen.',
  'Invalid login credentials': 'Forkert email eller adgangskode.',
  'Email not confirmed': 'Din email er ikke bekræftet endnu.',
  'User not found': 'Brugeren blev ikke fundet.',
  'JWT expired': 'Din session er udløbet. Log ind igen.',
  'permission denied': 'Du har ikke adgang til denne handling.',
  'violates row-level security': 'Du har ikke adgang til denne handling.',
  'violates foreign key constraint': 'Handlingen kunne ikke gennemføres – relaterede data mangler.',
  'duplicate key value': 'Denne post findes allerede.',
  'violates unique constraint': 'Denne post findes allerede.',
  'violates check constraint': 'De indtastede data er ugyldige.',
  'weekday must be between 1 and 7': 'Ugyldig ugedag valgt.',
  'end_time must be after start_time': 'Sluttid skal være efter starttid.',
};

function getUserMessage(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  for (const [key, userMsg] of Object.entries(ERROR_MAP)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return userMsg;
  }
  return fallback;
}

export function handleMutationError(error: unknown, fallback: string) {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  console.error('[Mutation error]', msg);
  toast.error(getUserMessage(error, fallback));
}

export function handleAuthError(error: { message: string }) {
  console.error('[Auth error]', error.message);
  toast.error(getUserMessage(error, 'Login mislykkedes. Prøv igen.'));
}
