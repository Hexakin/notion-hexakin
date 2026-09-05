export const WAITLIST_KEY = 'hexakin-notion-waitlist';

export function readWaitlist() {
  try {
    const raw = localStorage.getItem(WAITLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((row) => row && typeof row.email === 'string');
    }
    if (parsed && typeof parsed.email === 'string') {
      return [parsed];
    }
    return [];
  } catch {
    return [];
  }
}

export function hasWaitlistEntry() {
  return readWaitlist().length > 0;
}

export function saveWaitlistEmail(email) {
  const entry = { email, at: Date.now() };
  localStorage.setItem(WAITLIST_KEY, JSON.stringify([entry]));
}
