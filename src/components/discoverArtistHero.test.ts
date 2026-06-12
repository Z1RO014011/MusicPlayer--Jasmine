import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractImageUrlFromCoverColor,
  hasImageCoverBackground,
  shouldHydrateArtistArtwork,
} from './discoverArtistHero.ts';

test('extracts artist image url from image-backed coverColor', () => {
  assert.equal(
    extractImageUrlFromCoverColor('url("https://example.com/drake.jpg") center/cover no-repeat'),
    'https://example.com/drake.jpg',
  );
});

test('extracts artist image url from single-quoted image-backed coverColor', () => {
  assert.equal(
    extractImageUrlFromCoverColor("url('https://example.com/drake.webp') center/cover no-repeat"),
    'https://example.com/drake.webp',
  );
});

test('returns null for gradient backgrounds', () => {
  assert.equal(
    extractImageUrlFromCoverColor('linear-gradient(135deg, #667eea, #764ba2)'),
    null,
  );
});

test('returns null for empty coverColor', () => {
  assert.equal(extractImageUrlFromCoverColor(''), null);
});

test('detects whether coverColor contains an image background', () => {
  assert.equal(
    hasImageCoverBackground('url(https://example.com/drake.jpg) center/cover no-repeat'),
    true,
  );
  assert.equal(
    hasImageCoverBackground('linear-gradient(135deg, #667eea, #764ba2)'),
    false,
  );
});

test('hydrates artist artwork when an artist id exists but picUrl is missing', () => {
  assert.equal(
    shouldHydrateArtistArtwork({ id: 53283, name: 'Drake', picUrl: '' }),
    true,
  );
});
