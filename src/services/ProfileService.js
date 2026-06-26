import StorageService from './StorageService';

export const DEFAULT_PROFILE_NAME = 'Pilot';

export const SOCIAL_PLATFORMS = [
  { key: 'youtube', label: 'YouTube', icon: '▶️', color: '#FF0000' },
  { key: 'twitch', label: 'Twitch', icon: '🎮', color: '#9146FF' },
  { key: 'x', label: 'X', icon: '𝕏', color: '#FFFFFF' },
  { key: 'instagram', label: 'Instagram', icon: '📷', color: '#E1306C' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵', color: '#00F2EA' },
  { key: 'discord', label: 'Discord', icon: '💬', color: '#5865F2' },
  { key: 'bluesky', label: 'Bluesky', icon: '🦋', color: '#0085FF' },
  { key: 'threads', label: 'Threads', icon: '🧵', color: '#FFFFFF' },
  { key: 'other', label: 'Other', icon: '🔗', color: '#888888' }
];

const migrateLegacyStreamLink = (links) => {
  if (!Array.isArray(links)) return links;
  const legacyUrl = StorageService.getString('shareStreamLinkUrl', '').trim();
  const legacyEnabled = StorageService.get('shareStreamLinkEnabled', false) === true;
  if (!legacyUrl) return links;
  const alreadyExists = links.some((l) => l.url === legacyUrl);
  if (alreadyExists) return links;
  const platform = SOCIAL_PLATFORMS.find((p) =>
    legacyUrl.toLowerCase().includes(p.key === 'x' ? 'twitter.com' : p.key)
  ) || SOCIAL_PLATFORMS.find((p) => p.key === 'other');
  return [
    ...links,
    {
      id: `legacy-${Date.now()}`,
      platform: platform.key,
      url: legacyUrl,
      enabled: legacyEnabled
    }
  ];
};

export const ProfileService = {
  getCurrentUsername() {
    return StorageService.getString('profileUsername', '') || DEFAULT_PROFILE_NAME;
  },

  getSocialLinks() {
    let links = StorageService.get('shareSocialLinks', []);
    if (!Array.isArray(links)) links = [];
    links = migrateLegacyStreamLink(links);
    return links.map((link) => ({
      id: link.id || `${link.platform}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      platform: link.platform || 'other',
      url: (link.url || '').trim(),
      enabled: link.enabled !== false,
      label: link.label || ''
    }));
  },

  setSocialLinks(links) {
    const clean = (links || []).map((link) => ({
      id: link.id || `${link.platform}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      platform: link.platform || 'other',
      url: (link.url || '').trim(),
      enabled: link.enabled !== false,
      label: (link.label || '').trim()
    })).filter((link) => link.url);
    StorageService.set('shareSocialLinks', clean);
  },

  getEnabledSocialLinks() {
    return this.getSocialLinks().filter((link) => link.enabled);
  },

  appendSocialLinksToShareText(text, selectedIds = null) {
    const links = this.getSocialLinks();
    if (links.length === 0) return text;
    let toInclude = links;
    if (selectedIds !== null) {
      if (selectedIds.length === 0) return text;
      toInclude = links.filter((l) => selectedIds.includes(l.id));
    } else {
      toInclude = links.filter((l) => l.enabled);
    }
    if (toInclude.length === 0) return text;
    const lines = toInclude.map((link) => {
      const platform = SOCIAL_PLATFORMS.find((p) => p.key === link.platform) || SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1];
      return `${platform.icon} ${platform.label}: ${link.url}`;
    });
    return `${text}\n\n${lines.join('\n')}`;
  }
};

export default ProfileService;
