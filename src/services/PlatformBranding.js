const PLAYSTATION_PUBLISHERS = [
  'sony interactive entertainment',
  'playstation studios',
  'sony america',
  'sony europe',
  'sony japan',
  'xdev',
  'housemarque oy'
];

const PLAYSTATION_TITLE_KEYWORDS = [
  'spider-man',
  'god of war',
  'ghost of tsushima',
  'horizon zero dawn',
  'horizon forbidden west',
  'uncharted',
  'last of us',
  'death stranding',
  'helldivers',
  'returnal',
  'ratchet & clank',
  'sackboy',
  'days gone',
  'killszone',
  'gran turismo'
];

export const getBrandPlatform = ({ developer = '', publisher = '', gameName = '', tags = [] } = {}) => {
  const combined = [developer, publisher, gameName, ...tags].join(' ').toLowerCase();
  if (PLAYSTATION_PUBLISHERS.some((hint) => combined.includes(hint))) {
    return 'PlayStation';
  }

  if (PLAYSTATION_TITLE_KEYWORDS.some((keyword) => combined.includes(keyword))) {
    return 'PlayStation';
  }

  return null;
};
