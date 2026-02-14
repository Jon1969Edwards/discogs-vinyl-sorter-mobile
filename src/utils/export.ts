/**
 * Export TXT, CSV, JSON – mirrors Windows app core/export.py
 */

import type { ReleaseRow } from '../types';

function getDividerLine(
  r: ReleaseRow,
  current: string | null,
  dividers: boolean
): { next: string | null; line: string | null } {
  if (!dividers) return { next: current, line: null };
  const sa = r.sort_artist.trim();
  const first = sa ? sa[0].toUpperCase() : '#';
  const letter = /[A-Z]/.test(first) ? first : '#';
  if (current !== letter) {
    return { next: letter, line: `=== ${letter} ===` };
  }
  return { next: current, line: null };
}

function formatTxtLine(r: ReleaseRow, dividers: boolean): string {
  const yearStr = r.year ? ` (${r.year})` : '';
  const labelPart = r.label || r.catno ? ` [${r.label} ${r.catno}]`.trim() : '';
  return `${r.artist_display} — ${r.title}${yearStr}${labelPart}`.trim();
}

export function generateTxt(rows: ReleaseRow[], dividers = false): string {
  const lines: string[] = [];
  let currentDiv: string | null = null;

  for (const r of rows) {
    const { next, line } = getDividerLine(r, currentDiv, dividers);
    currentDiv = next;
    if (line) lines.push(line);
    lines.push(formatTxtLine(r, dividers));
  }

  return lines.join('\n');
}

export function generateCsv(rows: ReleaseRow[]): string {
  const cols = [
    'Artist',
    'Title',
    'Year',
    'Label',
    'CatNo',
    'Country',
    'Format',
    'DiscogsURL',
    'Notes',
  ];

  const escape = (val: unknown): string => {
    const s = val === null || val === undefined ? '' : String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = cols.join(',');
  const dataRows = rows.map((r) =>
    [
      r.artist_display,
      r.title,
      r.year ?? '',
      r.label,
      r.catno,
      r.country,
      r.format_str,
      r.discogs_url,
      r.notes,
    ]
      .map(escape)
      .join(',')
  );

  return [header, ...dataRows].join('\n');
}

export function generateJson(rows: ReleaseRow[]): string {
  const data = rows.map((r) => ({
    artist: r.artist_display,
    title: r.title,
    year: r.year,
    label: r.label,
    catno: r.catno,
    country: r.country,
    format: r.format_str,
    discogs_url: r.discogs_url,
    notes: r.notes,
    sort_artist: r.sort_artist,
    sort_title: r.sort_title,
  }));

  return JSON.stringify(data, null, 2);
}
