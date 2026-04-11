/**
 * Strips HTML tags from a string using a linear character loop
 * (no regex backtracking risk).
 */
export function stripHtml(html: string): string {
  let result = '';
  let inTag = false;
  for (const char of html) {
    if (char === '<') { inTag = true; result += ' '; }
    else if (char === '>') { inTag = false; }
    else if (!inTag) { result += char; }
  }
  return result.replaceAll(/\s+/g, ' ').trim();
}
