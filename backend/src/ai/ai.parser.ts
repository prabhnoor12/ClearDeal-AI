// Parses AI output (JSON, text) into structured objects

export function parseAIJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    // Try to extract JSON from text
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function parseAIText(raw: string): string {
  // Simple text normalization
  return raw.trim();
}

export function extractSection(raw: string, section: string): string {
  // Extract a section from AI text output
  const regex = new RegExp(`${section}:([\s\S]*?)(\n[A-Z][a-zA-Z ]+:|$)`, 'i');
  const match = raw.match(regex);
  return match && match[1] ? match[1].trim() : '';
}
