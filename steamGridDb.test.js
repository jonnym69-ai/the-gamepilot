const { GRID_DIMENSIONS } = require('./electron/steamGridDb');

test('grid requests only use dimensions supported by the SteamGridDB API', () => {
  const supported = new Set(['460x215', '920x430', '600x900', '342x482', '660x930', '512x512', '1024x1024']);
  expect(GRID_DIMENSIONS.length).toBeGreaterThan(0);
  GRID_DIMENSIONS.split(',').forEach((dimension) => expect(supported.has(dimension)).toBe(true));
});
