const tuneAudioRewardXP = (requiredXP) => {
  if (requiredXP <= 0) return 0;
  return Math.round((requiredXP * 1.9 + 1200) / 20) * 20;
};

const tuneAudioRewardLibrary = (library) => Object.freeze(Object.fromEntries(
  Object.entries(library).map(([id, reward]) => ([
    id,
    {
      ...reward,
      requiredXP: tuneAudioRewardXP(reward.requiredXP)
    }
  ]))
));

export const AMBIENT_PACK_LIBRARY = tuneAudioRewardLibrary({
  campfire: {
    label: 'Campfire Forest',
    file: 'soundreality-fire-in-the-night-forest-226199.mp3',
    description: 'Crackling embers with a soft woodland hush',
    requiredXP: 1200,
    preview: 'linear-gradient(135deg, rgba(255, 140, 66, 0.28), rgba(34, 197, 94, 0.18))'
  },
  rain: {
    label: 'Neon Rainfall',
    file: 'dragon-studio-copyright-free-rain-sounds-331497.mp3',
    description: 'Soothing rain with distant rumbles',
    requiredXP: 3600,
    preview: 'linear-gradient(135deg, rgba(59, 130, 246, 0.28), rgba(99, 102, 241, 0.2))'
  },
  ocean: {
    label: 'Digital Ocean',
    file: 'dragon-studio-deep-sea-underwater-ambience-472383.mp3',
    description: 'Submerged swells and bioluminescent pulses',
    requiredXP: 4400,
    preview: 'linear-gradient(135deg, rgba(6, 182, 212, 0.28), rgba(14, 116, 144, 0.22))'
  },
  windstorm: {
    label: 'Crystal Blizzard',
    file: 'dragon-studio-windstorm-ambience-351112.mp3',
    description: 'Frozen winds with swirling snow',
    requiredXP: 8000,
    preview: 'linear-gradient(135deg, rgba(186, 230, 253, 0.3), rgba(147, 197, 253, 0.16))'
  },
  cathedral: {
    label: 'Cathedral Echoes',
    file: 'dobcommunications-cathedral-with-distant-piano-interior-ambience-248266.mp3',
    description: 'Distant piano drifting through vaulted halls',
    requiredXP: 5400,
    preview: 'linear-gradient(135deg, rgba(196, 181, 253, 0.28), rgba(129, 140, 248, 0.18))'
  },
  city: {
    label: 'City Sunrise',
    file: 'freesound_community-ambience-city-daytime-birds-traffic-61955.mp3',
    description: 'Urban morning bustle with light birdsong',
    requiredXP: 2300,
    preview: 'linear-gradient(135deg, rgba(251, 191, 36, 0.24), rgba(249, 115, 22, 0.2))'
  },
  forest: {
    label: 'Verdant Birds',
    file: 'zehendrew-calm-nature-ambience-379478.mp3',
    description: 'Bird calls and breeze beneath the canopy',
    requiredXP: 1700,
    preview: 'linear-gradient(135deg, rgba(74, 222, 128, 0.24), rgba(21, 128, 61, 0.22))'
  },
  scifi: {
    label: 'Pulse Nebula',
    file: 'placidplace-spaceship-ambience-with-effects-21420.mp3',
    description: 'Spaceship hum with airy pulses',
    requiredXP: 6600,
    preview: 'linear-gradient(135deg, rgba(61, 217, 255, 0.26), rgba(155, 92, 255, 0.22))'
  },
  horror: {
    label: 'Hollow Signals',
    file: 'universfield-horror-background-atmosphere-09-219111.mp3',
    description: 'Haunting drones and distant machinery',
    requiredXP: 9800,
    preview: 'linear-gradient(135deg, rgba(71, 85, 105, 0.3), rgba(153, 27, 27, 0.2))'
  },
  night: {
    label: 'Night Crickets',
    file: 'alex_jauk-night-crickets-amp-church-bells-223054.mp3',
    description: 'Warm night air, crickets, and subtle bells',
    requiredXP: 2900,
    preview: 'linear-gradient(135deg, rgba(30, 41, 59, 0.34), rgba(99, 102, 241, 0.22))'
  }
});

export const AMBIENT_PACK_OPTIONS = Object.freeze(Object.keys(AMBIENT_PACK_LIBRARY));

export const MUSIC_PACK_LIBRARY = tuneAudioRewardLibrary({
  'beach-drive': {
    label: 'Beach Drive (Synthwave)',
    file: 'freesound_community-beach-drive-17046.mp3',
    description: 'Cruising neon coastline with punchy drums.',
    requiredXP: 1300,
    preview: 'linear-gradient(135deg, rgba(251, 146, 60, 0.28), rgba(236, 72, 153, 0.2))'
  },
  'calm-game-music': {
    label: 'Calm Game Music',
    file: 'freesound_community-calm_game_music_1-49209.mp3',
    description: 'Casual idle loop with mellow chiptune flair.',
    requiredXP: 600,
    preview: 'linear-gradient(135deg, rgba(125, 211, 252, 0.24), rgba(52, 211, 153, 0.18))'
  },
  'retro-game': {
    label: 'Retro Game Stage',
    file: 'freesound_community-game-49659.mp3',
    description: 'Energetic 90s platformer backing track.',
    requiredXP: 1700,
    preview: 'linear-gradient(135deg, rgba(250, 204, 21, 0.28), rgba(249, 115, 22, 0.22))'
  },
  'arcade-wave': {
    label: 'Arcade Wave',
    file: 'freesound_community-gamemusic-6082.mp3',
    description: 'Bright arps and basslines inspired by arcades.',
    requiredXP: 4100,
    preview: 'linear-gradient(135deg, rgba(45, 212, 191, 0.24), rgba(59, 130, 246, 0.22))'
  },
  'guitar-soundtrack': {
    label: 'Indie Guitar Soundtrack',
    file: 'freesound_community-guitar-soundtrack-55233.mp3',
    description: 'Lo-fi acoustic riffs for cozy sessions.',
    requiredXP: 2200,
    preview: 'linear-gradient(135deg, rgba(190, 24, 93, 0.22), rgba(251, 191, 36, 0.22))'
  },
  'orchestral-chill': {
    label: 'Orchestral Chillout',
    file: 'freesound_community-orchestral-chillout-64027.mp3',
    description: 'Strings and pads for focused playtime.',
    requiredXP: 3000,
    preview: 'linear-gradient(135deg, rgba(129, 140, 248, 0.24), rgba(59, 130, 246, 0.18))'
  },
  'piano-study': {
    label: 'Piano Study Session',
    file: 'freesound_community-piano-jam-20171-60017.mp3',
    description: 'Soft piano progressions for calm focus.',
    requiredXP: 950,
    preview: 'linear-gradient(135deg, rgba(226, 232, 240, 0.34), rgba(148, 163, 184, 0.18))'
  },
  'retro-wave-track': {
    label: 'Retro Wave Track',
    file: 'freesound_community-retro-wave-style-track-59892.mp3',
    description: 'Upbeat outrun melody for late-game browsing.',
    requiredXP: 7200,
    preview: 'linear-gradient(135deg, rgba(244, 114, 182, 0.26), rgba(96, 165, 250, 0.22))'
  },
  'uplift-pad': {
    label: 'Uplifting Pad Texture',
    file: 'samuelfjohanns-uplifting-pad-texture-113842.mp3',
    description: 'Airy pads for ambient sci-fi vibes.',
    requiredXP: 5600,
    preview: 'linear-gradient(135deg, rgba(192, 132, 252, 0.24), rgba(56, 189, 248, 0.2))'
  }
});

export const MUSIC_PACK_OPTIONS = Object.freeze(Object.keys(MUSIC_PACK_LIBRARY));

export const THEME_TO_PACK = Object.freeze({
  relaxed: 'campfire',
  'sunset-serenity': 'campfire',
  creative: 'city',
  'digital-ocean': 'ocean',
  oceanic: 'ocean',
  'rain-lounge': 'rain',
  'snowfall-hush': 'windstorm',
  'forest-mist': 'forest',
  forest: 'forest',
  'neon-pulse': 'scifi',
  'retro-pipeline': 'night',
  'midnight-synth': 'scifi',
  escapist: 'cathedral',
  'matrix-fall': 'scifi',
  'starfield-warp': 'scifi',
  'night-owl': 'night'
});

export const BUTTON_SFX_LIBRARY = tuneAudioRewardLibrary({
  'analog-soft': {
    label: 'Analog Soft Taps',
    files: [
      'floraphonic-analog-appliance-button-2-185277.mp3',
      'floraphonic-marimba-bloop-3-188151.mp3',
      'floraphonic-minimal-pop-click-ui-3-198303.mp3',
      'lesiakower-minimalist-button-hover-sound-effect-399749.mp3',
      'virtual_vibes-pop-tap-click-fx-383733.mp3'
    ],
    description: 'Muted organic taps, marimba plucks, and airy UI blips.',
    requiredXP: 0,
    preview: 'linear-gradient(135deg, rgba(226, 232, 240, 0.3), rgba(125, 211, 252, 0.18))'
  },
  'tactile-switch': {
    label: 'Tactile Switches',
    files: [
      'eaglaxle-switching-button-1-461625.mp3',
      'eaglaxle-switching-button-3-461630.mp3',
      'spinopel-click-pen-mechanism-411757.mp3',
      'denielcz-immersivecontrol-button-click-sound-463065.mp3',
      'milanwulf-toggle-button-on-166329.mp3',
      'milanwulf-toggle-button-off-166328.mp3',
      'milanwulf-double-button-166325.mp3',
      'milanwulf-foot-switch-166326.mp3',
      'milanwulf-click-button-166324.mp3'
    ],
    description: 'Physical switch clacks, chunky toggles, and pen clicks.',
    requiredXP: 1100,
    preview: 'linear-gradient(135deg, rgba(148, 163, 184, 0.28), rgba(71, 85, 105, 0.2))'
  },
  'retro-arcade': {
    label: 'Retro Arcade Pops',
    files: [
      'soundreality-bubble-bobble-139880.mp3',
      'soundreality-coins-135571.mp3',
      'soundreality-reverb-perc-142442.mp3',
      'soundreality-pop-atmos-312646.mp3',
      'soundreality-pop-clean-312648.mp3'
    ],
    description: 'Coin drops, bubbly pops, and arcade-inspired percussion.',
    requiredXP: 650,
    preview: 'linear-gradient(135deg, rgba(250, 204, 21, 0.3), rgba(249, 115, 22, 0.22))'
  },
  'digital-holo': {
    label: 'Digital / Holo',
    files: [
      'musicholder-click-sfx-287654.mp3',
      'yusuf_sfx-ui-button-load-more-491824.mp3',
      'universfield-button-124476.mp3',
      'universfield-error-04-199275.mp3',
      'epic_stock_media-ui-button-heavy-button-press-metallic-333826.mp3',
      'dragon-studio-mouse-click-sfx-free-376869.mp3'
    ],
    description: 'Sci-fi confirmations, holo beeps, and futuristic clicks.',
    requiredXP: 1800,
    preview: 'linear-gradient(135deg, rgba(61, 217, 255, 0.26), rgba(56, 189, 248, 0.2))'
  },
  'sleek-ui': {
    label: 'Sleek UI Confirmations',
    files: [
      'freesound_community-buttonpress-94482.mp3',
      'freesound_community-lift_knop-93554.mp3',
      'freesound_crunchpixstudio-button-394464.mp3',
      'freesound_crunchpixstudio-click-2-384920.mp3',
      'freesound_crunchpixstudio-ui-confirm-398847.mp3',
      'nomagician-ui-button-sound-cancel-back-exit-continue-467877.mp3'
    ],
    description: 'Polished UI clicks, elevator buttons, and subtle confirms.',
    requiredXP: 3800,
    preview: 'linear-gradient(135deg, rgba(165, 180, 252, 0.26), rgba(14, 165, 233, 0.18))'
  },
  'crystal-chime': {
    label: 'Crystal Chimes',
    files: [
      'soundreality-ding-411634.mp3',
      'soundreality-glasses-click-132926.mp3',
      'soundreality-pop-clean-312648.mp3',
      'soundreality-pop-atmos-312646.mp3',
      'soundreality-reverb-perc-142442.mp3'
    ],
    description: 'Glass chimes, resonant bells, and sparkling accents.',
    requiredXP: 5200,
    preview: 'linear-gradient(135deg, rgba(216, 180, 254, 0.28), rgba(191, 219, 254, 0.22))'
  }
});

export const BUTTON_SYNTH_PRESETS = tuneAudioRewardLibrary({
  'synth-soft': {
    label: 'Synth Soft Pulse',
    description: 'Warm sine chirps with gentle decay.',
    startFreq: 320,
    endFreq: 120,
    duration: 0.18,
    type: 'sine',
    requiredXP: 250,
    preview: 'linear-gradient(135deg, rgba(74, 222, 128, 0.22), rgba(16, 185, 129, 0.16))'
  },
  'synth-retro': {
    label: 'Synth Retro Zap',
    description: 'Arcade-inspired square envelopes.',
    startFreq: 620,
    endFreq: 80,
    duration: 0.14,
    type: 'square',
    requiredXP: 2600,
    preview: 'linear-gradient(135deg, rgba(251, 191, 36, 0.24), rgba(168, 85, 247, 0.2))'
  },
  'synth-holo': {
    label: 'Synth Hologram',
    description: 'Triangular beams for holo menus.',
    startFreq: 480,
    endFreq: 260,
    duration: 0.22,
    type: 'triangle',
    requiredXP: 7000,
    preview: 'linear-gradient(135deg, rgba(192, 132, 252, 0.28), rgba(45, 212, 191, 0.18))'
  }
});

export const SAMPLE_BUTTON_PACKS = Object.freeze(Object.keys(BUTTON_SFX_LIBRARY));
export const SYNTH_BUTTON_PACKS = Object.freeze(Object.keys(BUTTON_SYNTH_PRESETS));
export const ALL_BUTTON_PACKS = Object.freeze([...SAMPLE_BUTTON_PACKS, ...SYNTH_BUTTON_PACKS]);
