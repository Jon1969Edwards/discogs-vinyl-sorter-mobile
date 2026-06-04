/**
 * Discogs collection folder notes may be a plain string or structured fields
 * `{ field_id, value }[]` (see API collection release instance notes).
 */

export interface DiscogsCollectionNoteField {
  field_id: number;
  value: string;
}

export function formatCollectionNotes(notes: unknown): string {
  if (notes == null || notes === '') return '';
  if (typeof notes === 'string') return notes;
  if (Array.isArray(notes)) {
    return notes
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        if (entry && typeof entry === 'object' && 'value' in entry) {
          const v = (entry as DiscogsCollectionNoteField).value;
          return v != null ? String(v) : '';
        }
        return '';
      })
      .filter((line) => line.length > 0)
      .join('\n');
  }
  if (typeof notes === 'object' && notes !== null && 'value' in notes) {
    const v = (notes as DiscogsCollectionNoteField).value;
    return v != null ? String(v) : '';
  }
  return String(notes);
}
