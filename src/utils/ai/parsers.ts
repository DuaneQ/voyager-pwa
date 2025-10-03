// Defensive JSON parsing helpers for AI assistant text responses
// These functions were extracted from useAIGeneration to reduce file size
// and improve reusability across the codebase.

// Try to extract a JSON object substring from a free-form string. This is
// defensive parsing for assistant responses that sometimes wrap JSON in
// surrounding text or stringify it. Returns the parsed object or null.
export function extractJSONFromString(s: string | null): any | null {
  if (!s || typeof s !== 'string') return null;
  // Find the first `{` and attempt to find the matching `}` using a simple
  // brace counter. This avoids greedy regex pitfalls.
  let start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth === 0) {
      const candidate = s.slice(start, i + 1);
      try {
        return JSON.parse(candidate);
      } catch (e) {
        // If parsing fails for this candidate, continue scanning for next
        // possible object by finding the next `{` after start.
        const nextStart = s.indexOf('{', start + 1);
        if (nextStart === -1) return null;
        // Recurse on the substring from the next start to try again.
        return extractJSONFromString(s.slice(nextStart));
      }
    }
  }
  return null;
}

// Parse assistant text defensively. Handles cases where the assistant returns
// a JSON string (double-encoded) or raw JSON embedded in text. Returns the
// parsed object or null.
export function parseAssistantJSON(assistantText: string | null): any | null {
  if (!assistantText || typeof assistantText !== 'string') return null;
  // Trim surrounding whitespace
  const txt = assistantText.trim();
  // If it looks like a quoted JSON string (starts and ends with a quote), try JSON.parse
  try {
    const firstTry = JSON.parse(txt);
    // If parsing yields a string, it was double-encoded; try parse again
    if (typeof firstTry === 'string') {
      try {
        return JSON.parse(firstTry);
      } catch (e) {
        // fall through to extractJSONFromString
      }
    }
    if (typeof firstTry === 'object') return firstTry;
  } catch (e) {
    // ignore and try substring extraction
  }

  // If JSON.parse didn't work, try to extract a JSON substring
  try {
    const extracted = extractJSONFromString(txt);
    if (extracted) return extracted;
  } catch (e) {
    // ignore
  }

  // As a last-resort, attempt to locate a transportation object fragment
  // (cases where the assistant returned '"transportation": { ... }' without
  // an outer object). Detect the marker and extract the following object.
  try {
    const keyIdx = txt.indexOf('transportation');
    if (keyIdx !== -1) {
      const braceStart = txt.indexOf('{', keyIdx);
      if (braceStart !== -1) {
        // Find matching closing brace
        let depth = 0;
        for (let i = braceStart; i < txt.length; i++) {
          const ch = txt[i];
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
          if (depth === 0) {
            const candidate = txt.slice(braceStart, i + 1);
            try {
              return JSON.parse(candidate);
            } catch (e) {
              return null;
            }
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return null;
}
