# Album scanner (feature/album-scanner)

Identify releases via Discogs database search — similar in spirit to Record Scanner, but Discogs-backed (no proprietary cover ML).

## Modes

| Mode | Input | Discogs API |
|------|--------|-------------|
| **Barcode** | Live camera (`expo-camera`) | `GET /database/search?barcode=` |
| **Cat No** | Typed catalog number | `?catno=` |
| **Cover** | Photo (camera/gallery) → optional OCR → editable query | `?q=` (or `catno` if OCR finds one) |

Results open **Album detail** (same stack screen as collection rows).

## Cover OCR

Uses `@react-native-ml-kit/text-recognition` when present in the native binary. If OCR is missing or finds nothing, type artist/title from the cover and search.

**Requires a new native build** (`eas build` / `npm run android`) after this branch — camera + ML Kit are native modules. OTA/JS-only updates are not enough.

## Limits vs Record Scanner

- No Discogs “match this photo” API — cover ID is OCR + text search, not visual embedding match.
- Local/import-only accounts cannot search (need Discogs PAT or OAuth).
- Adding a scanned release **to** your Discogs collection is not implemented yet (identify only).
