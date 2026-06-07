/**
 * Attempts to parse a potentially incomplete JSON string by closing any
 * unclosed braces, brackets, and strings. This enables "real-time" preview
 * updates while the AI is still streaming the JSON response.
 *
 * @param text  The (possibly incomplete) JSON text accumulated so far
 * @returns     A parsed object if recovery succeeds, or null
 */
export function tryParsePartialJson(
  text: string
): Record<string, unknown> | null {
  // Fast path: try parsing as-is first
  try {
    const result = JSON.parse(text);
    return typeof result === "object" && result !== null ? result : null;
  } catch {
    // Fall through to best-effort recovery
  }

  // --- Best-effort recovery ---
  // Walk the string tracking structural state, then close everything.
  let inString = false;
  let escape = false;
  let openBraces = 0;
  let openBrackets = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") openBraces++;
    else if (ch === "}") openBraces--;
    else if (ch === "[") openBrackets++;
    else if (ch === "]") openBrackets--;
  }

  let balanced = text;

  // If we're still inside a string literal, close it
  if (inString) {
    balanced += '"';
  }

  // Strip any trailing comma (invalid after closing a value)
  balanced = balanced.replace(/,\s*$/, "");

  // Close unclosed brackets then braces (inner-to-outer)
  for (let i = 0; i < openBrackets; i++) balanced += "]";
  for (let i = 0; i < openBraces; i++) balanced += "}";

  try {
    const result = JSON.parse(balanced);
    return typeof result === "object" && result !== null ? result : null;
  } catch {
    return null;
  }
}
