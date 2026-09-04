const {
  resolveGameArtwork,
  getGameArtworkPlaceholder,
  hasMissingCoverArt,
  fileToCoverDataUri
} = require('./GameArtworkService');

describe('GameArtworkService', () => {
  describe('resolveGameArtwork', () => {
    test('builds Steam CDN art for appid games on the requested surface', () => {
      expect(resolveGameArtwork({ appid: '730' })).toContain('cdn.akamai.steamstatic.com/steam/apps/730/capsule_231x87.jpg');
      expect(resolveGameArtwork({ appid: '730' }, { surface: 'portrait' })).toContain('library_600x900.jpg');
    });

    test('cover override always wins', () => {
      expect(resolveGameArtwork({ appid: '730', coverArtOverride: 'https://example.com/cover.jpg' }))
        .toBe('https://example.com/cover.jpg');
    });

    test('returns empty string when nothing resolvable exists', () => {
      expect(resolveGameArtwork({ name: 'Manual Game', platform: 'Manual' })).toBe('');
    });
  });

  describe('hasMissingCoverArt', () => {
    test('returns true for games with no resolvable art source', () => {
      expect(hasMissingCoverArt({ name: 'Manual Game' })).toBe(true);
      expect(hasMissingCoverArt(null)).toBe(true);
    });

    test('returns false for appid games, overrides, and stored images', () => {
      expect(hasMissingCoverArt({ appid: '730' })).toBe(false);
      expect(hasMissingCoverArt({ coverArtOverride: 'https://example.com/c.jpg' })).toBe(false);
      expect(hasMissingCoverArt({ headerImage: 'https://example.com/h.jpg' })).toBe(false);
    });
  });

  describe('getGameArtworkPlaceholder', () => {
    test('returns an offline SVG data URI sized to the surface', () => {
      const placeholder = getGameArtworkPlaceholder({ game: { platform: 'Steam' }, surface: 'portrait' });
      expect(placeholder.startsWith('data:image/svg+xml')).toBe(true);
      expect(placeholder).not.toContain('placehold.co');
      const decoded = decodeURIComponent(placeholder);
      expect(decoded).toContain('width="600"');
      expect(decoded).toContain('height="900"');
      expect(decoded).toContain('#1b2838');
    });

    test('honors custom width and height options', () => {
      const placeholder = getGameArtworkPlaceholder({ platform: 'Manual', width: 96, height: 96 });
      const decoded = decodeURIComponent(placeholder);
      expect(decoded).toContain('width="96"');
      expect(decoded).toContain('height="96"');
    });
  });

  describe('fileToCoverDataUri', () => {
    test('rejects non-image files before reading', async () => {
      await expect(fileToCoverDataUri({ type: 'text/plain' })).rejects.toThrow('image');
      await expect(fileToCoverDataUri(null)).rejects.toThrow('image');
      await expect(fileToCoverDataUri(undefined)).rejects.toThrow('image');
    });
  });
});
