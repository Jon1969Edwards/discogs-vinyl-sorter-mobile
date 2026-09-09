import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyGenreOverrideMap,
  parseGenreList,
  parseOverridesPayload,
  primaryGenre,
} from '../src/domain/genre';
import {
  __resetGenreOverridesForTests,
  __unloadGenreOverridesForTests,
  applyGenreOverrides,
  clearGenreOverride,
  hasGenreOverride,
  importGenreOverridesFromJson,
  setGenreOverride,
} from '../src/services/genreOverrides';
import { sortRows } from '../src/domain/sorting';
import type { ReleaseRow } from '../src/types';

function row(releaseId: number, genre: string, artist = 'Artist'): ReleaseRow {
  return {
    artist_display: artist,
    title: 'Album',
    year: 1970,
    label: '',
    catno: '',
    country: '',
    format_str: '',
    discogs_url: '',
    notes: '',
    release_id: releaseId,
    item_id: `discogs:${releaseId}`,
    sort_artist: artist.toLowerCase(),
    sort_title: 'album',
    thumb_url: '',
    cover_image_url: '',
    genre,
    genres: genre ? [genre] : [],
    source_genre: genre,
    source_genres: genre ? [genre] : [],
  };
}

describe('genre overrides', () => {
  beforeEach(async () => {
    await __resetGenreOverridesForTests();
    await AsyncStorage.clear();
    await __resetGenreOverridesForTests();
  });

  it('keeps Folk, World, & Country as one name', () => {
    expect(parseGenreList('Folk, World, & Country')).toEqual([
      'Folk, World, & Country',
    ]);
    expect(primaryGenre(['Funk / Soul', 'Jazz'])).toBe('Funk / Soul');
  });

  it('applies a map then restores when missing', () => {
    const jazz = row(1, 'Jazz', 'Miles');
    const next = applyGenreOverrideMap([jazz], {
      'discogs:1': { genre: 'Rock', genres: ['Rock', 'Pop'] },
    })[0];
    expect(next.genre).toBe('Rock');
    expect(next.genres).toEqual(['Rock', 'Pop']);
    expect(next.source_genre).toBe('Jazz');
    const restored = applyGenreOverrideMap([next], {})[0];
    expect(restored.genre).toBe('Jazz');
  });

  it('persists across load and sorts Unknown last', async () => {
    const jazz = row(1, 'Jazz', 'Miles');
    const saved = await setGenreOverride(jazz, 'Rock; Pop');
    expect(saved?.genre).toBe('Rock');
    expect(hasGenreOverride(jazz)).toBe(true);

    __unloadGenreOverridesForTests();
    const fresh = row(1, 'Jazz', 'Miles');
    const [applied] = await applyGenreOverrides([fresh]);
    expect(applied.genre).toBe('Rock');
    expect(applied.genres).toEqual(['Rock', 'Pop']);

    const unknown = await setGenreOverride(row(3, 'Jazz', 'Mystery'), '');
    expect(unknown?.genre).toBe('Unknown');
    const sorted = sortRows([saved!, unknown!], 'normal', 'genre');
    expect(sorted[sorted.length - 1].artist_display).toBe('Mystery');

    const reset = await clearGenreOverride(applied);
    expect(reset.genre).toBe('Jazz');
    expect(hasGenreOverride(applied)).toBe(false);
  });

  it('parses desktop genre_overrides.json and merges without dropping locals', async () => {
    const local = row(1, 'Jazz', 'Miles');
    await setGenreOverride(local, 'Funk / Soul');

    const desktop = {
      version: 1,
      overrides: {
        '19000885': { genre: 'Punk/Hardcore, Reggae', genres: ['Punk/Hardcore, Reggae'] },
        'discogs:6057905': { genre: 'Indie', genres: ['Indie'] },
      },
    };
    const parsed = parseOverridesPayload(desktop);
    expect(parsed['discogs:19000885'].genre).toBe('Punk/Hardcore, Reggae');
    expect(parsed['discogs:6057905'].genre).toBe('Indie');

    const n = await importGenreOverridesFromJson(JSON.stringify(desktop));
    expect(n).toBe(2);
    const [miles] = await applyGenreOverrides([row(1, 'Jazz', 'Miles')]);
    expect(miles.genre).toBe('Funk / Soul');
    const [indie] = await applyGenreOverrides([row(6057905, 'Rock')]);
    expect(indie.genre).toBe('Indie');
  });

  it('accepts a collection JSON array with release_id', () => {
    const parsed = parseOverridesPayload([
      { release_id: 6171913, genre: 'Oi!/Streetpunk', genres: ['Oi!/Streetpunk'] },
    ]);
    expect(parsed['discogs:6171913'].genre).toBe('Oi!/Streetpunk');
  });
});
