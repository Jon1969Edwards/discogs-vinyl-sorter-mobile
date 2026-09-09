/**
 * Discogs collection folder notes may be a plain string or structured fields
 * `{ field_id, value }[]` (see API collection release instance notes).
 *
 * Genre corrections sync across devices as a `spindle-genre:` line on a notes field.
 */

export interface DiscogsCollectionNoteField {
  field_id: number;
  value: string;
}

export const SPINDLE_GENRE_PREFIX = 'spindle-genre:';

export function extractSpindleGenre(text: string): string | null {
  if (!text) return null;
  for (const line of text.split(/\r?\n/)) {
    const stripped = line.trim();
    if (stripped.toLowerCase().startsWith(SPINDLE_GENRE_PREFIX)) {
      return stripped.slice(stripped.indexOf(':') + 1).trim();
    }
  }
  return null;
}

export function stripSpindleGenre(text: string): string {
  if (!text) return '';
  return text
    .split(/\r?\n/)
    .filter((ln) => !ln.trim().toLowerCase().startsWith(SPINDLE_GENRE_PREFIX))
    .join('\n')
    .trim();
}

export function injectSpindleGenre(
  userNotes: string,
  genresText: string | null
): string {
  const base = stripSpindleGenre(userNotes || '');
  if (genresText == null) return base;
  const line = `${SPINDLE_GENRE_PREFIX} ${genresText.trim()}`;
  return base ? `${base}\n${line}` : line;
}

export function iterNoteFields(
  notes: unknown
): Array<{ fieldId: number | null; value: string }> {
  if (notes == null || notes === '') return [];
  if (typeof notes === 'string') return [{ fieldId: null, value: notes }];
  if (Array.isArray(notes)) {
    return notes.map((entry) => {
      if (typeof entry === 'string') return { fieldId: null, value: entry };
      if (entry && typeof entry === 'object' && 'value' in entry) {
        const obj = entry as DiscogsCollectionNoteField;
        const fid = Number(obj.field_id);
        return {
          fieldId: Number.isFinite(fid) ? fid : null,
          value: obj.value != null ? String(obj.value) : '',
        };
      }
      return { fieldId: null, value: '' };
    });
  }
  if (typeof notes === 'object' && notes !== null && 'value' in notes) {
    const obj = notes as DiscogsCollectionNoteField;
    const fid = Number(obj.field_id);
    return [
      {
        fieldId: Number.isFinite(fid) ? fid : null,
        value: obj.value != null ? String(obj.value) : '',
      },
    ];
  }
  return [{ fieldId: null, value: String(notes) }];
}

export function extractSpindleGenreFromNotes(
  notes: unknown
): { genre: string; fieldId: number | null } | null {
  for (const { fieldId, value } of iterNoteFields(notes)) {
    const genre = extractSpindleGenre(value);
    if (genre != null) return { genre, fieldId };
  }
  return null;
}

export function valueForField(notes: unknown, fieldId: number | null): string {
  if (fieldId == null) {
    return typeof notes === 'string' ? notes : '';
  }
  for (const entry of iterNoteFields(notes)) {
    if (entry.fieldId === fieldId) return entry.value;
  }
  return typeof notes === 'string' ? notes : '';
}

export function pickNotesFieldId(
  fields: Array<{ id?: number; name?: string; type?: string }>,
  notes?: unknown
): number | null {
  const marked = extractSpindleGenreFromNotes(notes);
  if (marked?.fieldId != null) {
    const meta = fields.find((f) => f.id === marked.fieldId);
    if (!meta || (meta.type || '').toLowerCase() !== 'dropdown') {
      return marked.fieldId;
    }
  }
  for (const field of fields) {
    const name = (field.name || '').toLowerCase();
    const typ = (field.type || '').toLowerCase();
    if (name.includes('spindle') && typ !== 'dropdown' && field.id != null) {
      return field.id;
    }
  }
  for (const field of fields) {
    const name = (field.name || '').toLowerCase();
    const typ = (field.type || '').toLowerCase();
    if (name === 'notes' && typ === 'textarea' && field.id != null) {
      return field.id;
    }
  }
  for (const field of fields) {
    if ((field.type || '').toLowerCase() === 'textarea' && field.id != null) {
      return field.id;
    }
  }
  return null;
}

export function formatCollectionNotes(notes: unknown): string {
  return iterNoteFields(notes)
    .map((entry) => stripSpindleGenre(entry.value))
    .filter((line) => line.length > 0)
    .join('\n');
}
