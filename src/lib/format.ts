/** Format a raw phone number string for display. */
export function formatPhone(raw: string): string {
  if (!raw) return raw;
  const cleaned = raw.replace(/\s+/g, '');
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1); // strip '+'
    const cc = digits.slice(0, 2);   // e.g. "49"
    const rest = digits.slice(2);
    if (rest.length >= 4) {
      // split rest into first 3 digits + remainder
      return `+${cc} ${rest.slice(0, 3)} ${rest.slice(3)}`;
    }
    return cleaned;
  }
  if (cleaned.startsWith('0') && cleaned.length >= 5) {
    // local format: 4-digit prefix + rest, e.g. "0176 70205191"
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  }
  return raw;
}
