# Album scanner (feature/album-scanner)

Identify releases via Discogs database search — similar in spirit to Record Scanner, but Discogs-backed (no proprietary cover ML).

## Modes

| Mode | Input | Discogs API |
|------|--------|-------------|
| **Barcode** | Live camera (`expo-camera`) | `GET /database/search?barcode=` |
| **Cat No** | Typed catalog number, or photo (camera/gallery) → OCR | `?catno=` with spaced variants (`COOKCD302` → `COOK CD 302`); barcode only if OCR finds no catno |
| **Cover** | Photo (camera/gallery) → OCR → auto search | barcode (if found), then `?catno=` + `format=Vinyl`, then `?q=` + Vinyl, then fallbacks |

Results open **Album detail** (same stack screen as collection rows).

## Cat No photo

Same capture/OCR stack as Cover (full quality, resize, ML Kit). **Take photo** skips the system crop editor so you can snap the number and search. Gallery still offers a crop. Extraction scores catalog-number tokens and prefers mixed letter+digit values (`PCS-7088`) over UPC-like digit strings. Auto-search tries Discogs-friendly spacing (`COOKCD302` → `COOK CD 302`) without a Vinyl-only filter. If OCR finds no catno but a barcode is in the photo, search the barcode instead. Artist/title `q=` is not used in this mode.

## Cover pipeline

1. Capture at full quality. Crop is optional and **not** locked to 1:1, so titles on the sleeve edge stay in frame.
2. Resize the long side to ~1600px (`expo-image-manipulator`) and OCR **original + resized** with ML Kit, merging unique lines.
3. Still-image barcode scan (`Camera.scanFromURLAsync`) is best-effort: iOS is QR-only; Android wants the code large in the frame.
4. Score ML Kit lines (frame height, drop sleeve noise like STEREO / SIDE A / LP, keep catno and year separate). Take the best 1–2 artist/title lines.
5. Search Discogs in order: barcode → catno+Vinyl → catno → query+Vinyl → query → shorter query. Stop at the first non-empty result set.
6. Re-rank hits by token overlap with the OCR query, Vinyl/LP format, matching year, and exact catno.
7. The query field stays editable so the user can correct OCR and search again.

Uses `@react-native-ml-kit/text-recognition` when present in the native binary. If OCR is missing or finds nothing, type artist/title from the cover and search.

**Requires a new native build** (`eas build` / `npm run android`) after adding ML Kit or `expo-image-manipulator` — OTA/JS-only updates are not enough.

## Limits vs Record Scanner

- No Discogs “match this photo” API — cover ID is OCR + text search (plus optional barcode in the photo), not visual embedding match.
- Local/import-only accounts cannot search (need Discogs PAT or OAuth).
- Adding a scanned release to your collection: **Add to Collection** on album detail. Local/offline accounts save in the app; Discogs-connected accounts also POST to Uncategorized (folder 1).
