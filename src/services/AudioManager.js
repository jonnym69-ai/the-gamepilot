import { ProgressionUnlockService } from './ProgressionUnlockService';
import {
  ALL_BUTTON_PACKS,
  AMBIENT_PACK_LIBRARY,
  AMBIENT_PACK_OPTIONS,
  BUTTON_SFX_LIBRARY,
  BUTTON_SYNTH_PRESETS,
  MUSIC_PACK_LIBRARY,
  MUSIC_PACK_OPTIONS,
  SAMPLE_BUTTON_PACKS,
  THEME_TO_PACK
} from './AudioRewardCatalog';

const BUTTON_SAMPLE_SELECTION_KEY = 'buttonSampleSelection';
const normalizeAmbientPackId = (packId) => (packId === 'dynamic' || AMBIENT_PACK_OPTIONS.includes(packId) ? packId : 'dynamic');
const normalizeMusicPackId = (packId) => (MUSIC_PACK_OPTIONS.includes(packId) ? packId : MUSIC_PACK_OPTIONS[0]);
const normalizeButtonPackId = (packId) => (ALL_BUTTON_PACKS.includes(packId) ? packId : 'analog-soft');

const getFirstUnlockedRewardId = (collection = [], fallbackId = null) => collection.find((reward) => reward.unlocked)?.id || fallbackId;

const loadButtonSampleSelection = () => {
  try {
    const raw = localStorage.getItem(BUTTON_SAMPLE_SELECTION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('Failed to parse stored button sample selection', error);
    return {};
  }
};

const DEFAULT_SETTINGS = {
  ambientEnabled: localStorage.getItem('ambientAudioEnabled') !== 'false',
  ambientSoundPack: normalizeAmbientPackId(localStorage.getItem('ambientSoundPack') || 'dynamic'),
  ambientVolume: parseFloat(localStorage.getItem('ambientVolume') || '0.35'),
  sfxEnabled: localStorage.getItem('buttonSfxEnabled') !== 'false',
  buttonSoundPack: localStorage.getItem('buttonSoundPack') || 'analog-soft',
  sfxVolume: parseFloat(localStorage.getItem('buttonSfxVolume') || '0.4'),
  musicEnabled: localStorage.getItem('musicEnabled') === 'true',
  musicPack: normalizeMusicPackId(localStorage.getItem('musicPack') || 'retro-wave-track'),
  musicVolume: parseFloat(localStorage.getItem('musicVolume') || '0.35'),
  buttonSampleSelection: loadButtonSampleSelection()
};

const getAmbientAssetPath = (file) => {
  const base = process.env.PUBLIC_URL || '';
  if (base.endsWith('/')) {
    return `${base}audio/atmosphere/${file}`;
  }
  return `${base}/audio/atmosphere/${file}`;
};

const getMusicAssetPath = (file) => {
  const base = process.env.PUBLIC_URL || '';
  if (base.endsWith('/')) {
    return `${base}audio/music/${file}`;
  }
  return `${base}/audio/music/${file}`;
};

const getSfxAssetPath = (file) => {
  const base = process.env.PUBLIC_URL || '';
  if (base.endsWith('/')) {
    return `${base}audio/sfx/${file}`;
  }
  return `${base}/audio/sfx/${file}`;
};

class AudioManager {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.globalClickHandler = null;
    this.currentAmbient = null;
    this.currentAmbientPack = null;
    this.currentMusic = null;
    this.currentMusicPack = null;
    this.lastThemeId = localStorage.getItem('gamepilot-theme') || 'relaxed';
    this.ambientBuffers = new Map();
    this.musicBuffers = new Map();
    this.previewTimeout = null;
    this.musicPreviewTimeout = null;
    this.buttonBuffers = new Map();
    this.buttonSampleCursor = {};
    this.settings = {
      ...DEFAULT_SETTINGS,
      buttonSoundPack: normalizeButtonPackId(DEFAULT_SETTINGS.buttonSoundPack),
      buttonSampleSelection: { ...DEFAULT_SETTINGS.buttonSampleSelection }
    };
    const resolvedPack = this.resolveUnlockedButtonPack(this.settings.buttonSoundPack);
    if (resolvedPack !== this.settings.buttonSoundPack) {
      this.settings.buttonSoundPack = resolvedPack;
      localStorage.setItem('buttonSoundPack', resolvedPack);
    }
    const resolvedAmbientPack = this.resolveUnlockedAmbientPack(this.settings.ambientSoundPack);
    if (resolvedAmbientPack !== this.settings.ambientSoundPack) {
      this.settings.ambientSoundPack = resolvedAmbientPack;
      localStorage.setItem('ambientSoundPack', resolvedAmbientPack);
    }
    const resolvedMusicPack = this.resolveUnlockedMusicPack(this.settings.musicPack);
    if (resolvedMusicPack !== this.settings.musicPack) {
      this.settings.musicPack = resolvedMusicPack;
      localStorage.setItem('musicPack', resolvedMusicPack);
    }
    if (!this.isMusicUnlocked() && this.settings.musicEnabled) {
      this.settings.musicEnabled = false;
      localStorage.setItem('musicEnabled', 'false');
    }
  }

  getSettings() {
    return { ...this.settings };
  }

  getAmbientPacks() {
    return ProgressionUnlockService.getAmbientPacks();
  }

  getMusicPacks() {
    return ProgressionUnlockService.getMusicPacks();
  }

  getButtonPacks() {
    return ProgressionUnlockService.getButtonPacks().map((pack) => ({
      ...pack,
      type: pack.packType
    }));
  }

  getSamplesForPack(packId) {
    const files = BUTTON_SFX_LIBRARY[packId]?.files || [];
    return files.map((file, index) => ({
      file,
      label: `Sample ${index + 1}`
    }));
  }

  isAmbientUnlocked() {
    return ProgressionUnlockService.isAmbientUnlocked();
  }

  isMusicUnlocked() {
    return ProgressionUnlockService.isMusicUnlocked();
  }

  isAudioUnlocked() {
    return this.isAmbientUnlocked() || this.isMusicUnlocked() || this.getButtonPacks().some((pack) => pack.unlocked);
  }

  isButtonPackUnlocked(packId) {
    return ProgressionUnlockService.isButtonPackUnlocked(packId);
  }

  isAmbientPackUnlocked(packId) {
    return this.getAmbientPacks().some((pack) => pack.id === packId && pack.unlocked);
  }

  isMusicPackUnlocked(packId) {
    return this.getMusicPacks().some((pack) => pack.id === packId && pack.unlocked);
  }

  resolveUnlockedButtonPack(packId) {
    const normalized = normalizeButtonPackId(packId);
    if (this.isButtonPackUnlocked(normalized)) {
      return normalized;
    }
    return ALL_BUTTON_PACKS.find((id) => this.isButtonPackUnlocked(id)) || 'analog-soft';
  }

  resolveUnlockedAmbientPack(packId) {
    const normalized = normalizeAmbientPackId(packId);
    if (normalized === 'dynamic') {
      return normalized;
    }
    if (this.isAmbientPackUnlocked(normalized)) {
      return normalized;
    }
    return getFirstUnlockedRewardId(this.getAmbientPacks(), 'dynamic');
  }

  resolveUnlockedMusicPack(packId) {
    const normalized = normalizeMusicPackId(packId);
    if (this.isMusicPackUnlocked(normalized)) {
      return normalized;
    }
    return getFirstUnlockedRewardId(this.getMusicPacks(), normalized);
  }

  resolveDynamicAmbientPack(themeId) {
    const desiredPack = THEME_TO_PACK[themeId] || 'campfire';
    if (this.isAmbientPackUnlocked(desiredPack)) {
      return desiredPack;
    }
    return getFirstUnlockedRewardId(this.getAmbientPacks(), null);
  }

  ensureContext() {
    if (typeof window === 'undefined') return null;
    if (this.audioContext) return this.audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    this.audioContext = new AudioContextClass();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.9;
    this.ambientGain = this.audioContext.createGain();
    this.ambientGain.gain.value = this.settings.ambientVolume;
    this.sfxGain = this.audioContext.createGain();
    this.sfxGain.gain.value = this.settings.sfxVolume;
    this.musicGain = this.audioContext.createGain();
    this.musicGain.gain.value = this.settings.musicVolume;

    this.ambientGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);

    const resume = () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };

    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });

    return this.audioContext;
  }

  init() {
    this.ensureContext();
  }

  bindGlobalClickSfx() {
    if (typeof document === 'undefined' || this.globalClickHandler) return;
    this.globalClickHandler = (event) => {
      if (!this.settings.sfxEnabled || !this.isAudioUnlocked()) return;
      const target = event.target;
      if (!target) return;
      const clickable = target.closest('button, .btn, [data-sfx]');
      if (clickable && clickable.dataset?.sfx !== 'none') {
        const variant = clickable.dataset?.sfxVariant || 'primary';
        this.playButtonSfx(variant);
      }
    };
    document.addEventListener('click', this.globalClickHandler, true);
  }

  unbindGlobalClickSfx() {
    if (typeof document === 'undefined' || !this.globalClickHandler) return;
    document.removeEventListener('click', this.globalClickHandler, true);
    this.globalClickHandler = null;
  }

  saveSetting(key, value) {
    this.settings[key] = value;
  }

  setAmbientEnabled(enabled) {
    if (!this.isAmbientUnlocked()) return;
    this.saveSetting('ambientEnabled', enabled);
    localStorage.setItem('ambientAudioEnabled', enabled ? 'true' : 'false');
    if (!enabled) {
      this.stopAmbient();
    } else {
      this.playAmbientForTheme();
    }
  }

  setAmbientPack(pack) {
    const resolved = this.resolveUnlockedAmbientPack(pack);
    this.saveSetting('ambientSoundPack', resolved);
    localStorage.setItem('ambientSoundPack', resolved);
    this.playAmbientForTheme();
  }

  setAmbientVolume(value) {
    this.saveSetting('ambientVolume', value);
    localStorage.setItem('ambientVolume', value.toString());
    if (this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(value, this.audioContext?.currentTime || 0, 0.05);
    }
  }

  setMusicEnabled(enabled) {
    if (!this.isMusicUnlocked()) {
      this.saveSetting('musicEnabled', false);
      localStorage.setItem('musicEnabled', 'false');
      return;
    }
    this.saveSetting('musicEnabled', enabled);
    localStorage.setItem('musicEnabled', enabled ? 'true' : 'false');
    if (!enabled) {
      this.stopMusic();
    } else {
      this.playMusicPack();
    }
  }

  setMusicPack(packId) {
    const resolved = this.resolveUnlockedMusicPack(packId);
    this.saveSetting('musicPack', resolved);
    localStorage.setItem('musicPack', resolved);
    this.playMusicPack(resolved);
  }

  setMusicVolume(value) {
    this.saveSetting('musicVolume', value);
    localStorage.setItem('musicVolume', value.toString());
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(value, this.audioContext?.currentTime || 0, 0.05);
    }
  }

  async loadAmbientBuffer(packId) {
    const metadata = AMBIENT_PACK_LIBRARY[packId];
    if (!metadata) {
      throw new Error(`Unknown ambient pack: ${packId}`);
    }
    if (this.ambientBuffers.has(packId)) {
      return this.ambientBuffers.get(packId);
    }
    const ctx = this.ensureContext();
    if (!ctx) return null;

    const assetPath = getAmbientAssetPath(metadata.file);
    const response = await fetch(assetPath);
    if (!response.ok) {
      throw new Error(`Failed to load ambient asset: ${assetPath}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await new Promise((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer, resolve, reject);
    });
    this.ambientBuffers.set(packId, buffer);
    return buffer;
  }

  async startAmbientPack(packId) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.stopAmbient();
    try {
      const buffer = await this.loadAmbientBuffer(packId);
      if (!buffer) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this.ambientGain);
      source.start(0);
      this.currentAmbient = source;
      this.currentAmbientPack = packId;
    } catch (error) {
      console.error('Failed to start ambient pack', packId, error);
    }
  }

  stopAmbient() {
    if (this.currentAmbient) {
      try {
        this.currentAmbient.stop(0);
      } catch (err) {
        // ignore
      }
    }
    this.currentAmbient = null;
    this.currentAmbientPack = null;
  }

  playAmbientForTheme(themeId) {
    if (themeId) {
      this.lastThemeId = themeId;
    }
    if (!this.lastThemeId) {
      this.lastThemeId = localStorage.getItem('gamepilot-theme') || 'relaxed';
    }

    if (!this.settings.ambientEnabled || !this.isAmbientUnlocked()) {
      this.stopAmbient();
      return;
    }

    const resolvedTheme = this.lastThemeId;
    const desiredPack = this.settings.ambientSoundPack === 'dynamic'
      ? this.resolveDynamicAmbientPack(resolvedTheme)
      : this.resolveUnlockedAmbientPack(this.settings.ambientSoundPack);

    if (!desiredPack || !this.isAmbientPackUnlocked(desiredPack)) {
      this.stopAmbient();
      return;
    }

    if (this.currentAmbientPack === desiredPack) {
      return;
    }

    this.startAmbientPack(desiredPack);
  }

  async loadMusicBuffer(packId) {
    const metadata = MUSIC_PACK_LIBRARY[packId];
    if (!metadata) {
      throw new Error(`Unknown music pack: ${packId}`);
    }
    if (this.musicBuffers.has(packId)) {
      return this.musicBuffers.get(packId);
    }
    const ctx = this.ensureContext();
    if (!ctx) return null;

    const assetPath = getMusicAssetPath(metadata.file);
    const response = await fetch(assetPath);
    if (!response.ok) {
      throw new Error(`Failed to load music asset: ${assetPath}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await new Promise((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer, resolve, reject);
    });
    this.musicBuffers.set(packId, buffer);
    return buffer;
  }

  async startMusicPack(packId) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.stopMusic();
    try {
      const buffer = await this.loadMusicBuffer(packId);
      if (!buffer) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this.musicGain);
      source.start(0);
      this.currentMusic = source;
      this.currentMusicPack = packId;
    } catch (error) {
      console.error('Failed to start music pack', packId, error);
    }
  }

  stopMusic() {
    if (this.currentMusic) {
      try {
        this.currentMusic.stop(0);
      } catch (err) {
        // ignore
      }
    }
    this.currentMusic = null;
    this.currentMusicPack = null;
  }

  playMusicPack(packId) {
    const requestedPack = packId || this.settings.musicPack;
    const desiredPack = this.resolveUnlockedMusicPack(requestedPack);
    if (!this.settings.musicEnabled || !this.isMusicUnlocked()) {
      this.stopMusic();
      return;
    }
    if (!desiredPack || !this.isMusicPackUnlocked(desiredPack)) {
      this.stopMusic();
      return;
    }
    if (desiredPack !== this.settings.musicPack) {
      this.saveSetting('musicPack', desiredPack);
      localStorage.setItem('musicPack', desiredPack);
    }
    if (!desiredPack || this.currentMusicPack === desiredPack) {
      return;
    }
    if (!MUSIC_PACK_LIBRARY[desiredPack]) return;
    this.startMusicPack(desiredPack);
  }

  previewMusicPack(packId) {
    const previewPack = this.resolveUnlockedMusicPack(packId);
    if (!previewPack || !MUSIC_PACK_LIBRARY[previewPack]) return;
    if (!this.settings.musicEnabled || !this.isMusicUnlocked()) return;
    if (!this.isMusicPackUnlocked(previewPack)) return;
    if (this.musicPreviewTimeout) {
      clearTimeout(this.musicPreviewTimeout);
      this.musicPreviewTimeout = null;
    }
    const previousPack = this.currentMusicPack;
    this.startMusicPack(previewPack);
    this.musicPreviewTimeout = setTimeout(() => {
      this.musicPreviewTimeout = null;
      if (previousPack) {
        this.startMusicPack(previousPack);
      } else {
        this.playMusicPack();
      }
    }, 4000);
  }

  previewAmbient(packId) {
    if (!packId || packId === 'dynamic') return;
    if (!this.settings.ambientEnabled || !this.isAmbientUnlocked()) return;
    if (!this.isAmbientPackUnlocked(packId)) return;
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }
    const previousPack = this.currentAmbientPack;
    this.startAmbientPack(packId);
    this.previewTimeout = setTimeout(() => {
      this.previewTimeout = null;
      if (previousPack) {
        this.startAmbientPack(previousPack);
      } else {
        this.playAmbientForTheme();
      }
    }, 3500);
  }

  async loadSfxBuffer(file) {
    if (this.buttonBuffers.has(file)) {
      return this.buttonBuffers.get(file);
    }
    const ctx = this.ensureContext();
    if (!ctx) return null;
    const assetPath = getSfxAssetPath(file);
    try {
      const response = await fetch(assetPath);
      if (!response.ok) {
        throw new Error(`Failed to load sfx asset: ${assetPath}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await new Promise((resolve, reject) => {
        ctx.decodeAudioData(arrayBuffer, resolve, reject);
      });
      this.buttonBuffers.set(file, buffer);
      return buffer;
    } catch (error) {
      console.error('Error loading sfx buffer', file, error);
      return null;
    }
  }

  triggerSamplePlayback(file) {
    if (!file) return;
    this.loadSfxBuffer(file).then((buffer) => {
      if (!buffer) return;
      const ctx = this.ensureContext();
      if (!ctx) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = this.settings.sfxVolume;
      source.connect(gain);
      gain.connect(this.sfxGain);
      source.start();
    });
  }

  getAvailableSampleFiles(packId) {
    return BUTTON_SFX_LIBRARY[packId]?.files || [];
  }

  getNextSampleFile(packId) {
    const files = this.getAvailableSampleFiles(packId);
    if (!files.length) return null;
    const cursor = this.buttonSampleCursor[packId] || 0;
    const nextFile = files[cursor % files.length];
    this.buttonSampleCursor[packId] = (cursor + 1) % files.length;
    return nextFile;
  }

  getSelectedButtonSample(packId) {
    const selection = this.settings.buttonSampleSelection?.[packId];
    if (!selection) return null;
    return this.getAvailableSampleFiles(packId).includes(selection) ? selection : null;
  }

  getSampleFileForPlayback(packId) {
    const selected = this.getSelectedButtonSample(packId);
    if (selected) return selected;
    return this.getNextSampleFile(packId);
  }

  previewButtonSample(packId, file) {
    if (!SAMPLE_BUTTON_PACKS.includes(packId)) return;
    if (!this.settings.sfxEnabled || !this.isAudioUnlocked()) return;
    if (!this.isButtonPackUnlocked(packId)) return;
    const files = this.getAvailableSampleFiles(packId);
    const resolvedFile = file && files.includes(file) ? file : this.getSampleFileForPlayback(packId);
    if (!resolvedFile) return;
    this.triggerSamplePlayback(resolvedFile);
  }

  saveButtonSampleSelection(selection) {
    this.settings.buttonSampleSelection = selection;
    try {
      localStorage.setItem(BUTTON_SAMPLE_SELECTION_KEY, JSON.stringify(selection));
    } catch (error) {
      console.warn('Failed to persist button sample selection', error);
    }
  }

  setButtonSampleSelection(packId, file) {
    if (!SAMPLE_BUTTON_PACKS.includes(packId)) return;
    if (!this.isButtonPackUnlocked(packId)) return;
    const files = this.getAvailableSampleFiles(packId);
    const next = { ...(this.settings.buttonSampleSelection || {}) };
    if (!file || !files.includes(file)) {
      delete next[packId];
    } else {
      next[packId] = file;
    }
    this.saveButtonSampleSelection(next);
  }

  getButtonSampleSelection() {
    return { ...(this.settings.buttonSampleSelection || {}) };
  }

  playSampleButtonSfx(packId) {
    const file = this.getSampleFileForPlayback(packId);
    if (!file) return;
    this.triggerSamplePlayback(file);
  }

  playSynthButtonSfx(packId, variant = 'primary') {
    const preset = BUTTON_SYNTH_PRESETS[packId] || BUTTON_SYNTH_PRESETS['synth-soft'];
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = preset.type;
    const gain = ctx.createGain();
    const duration = preset.duration;
    const now = ctx.currentTime;
    const freqOffset = variant === 'secondary' ? 0.85 : variant === 'danger' ? 0.65 : 1;
    osc.frequency.setValueAtTime(preset.startFreq * freqOffset, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, preset.endFreq * freqOffset), now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.settings.sfxVolume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  setSfxEnabled(enabled) {
    this.saveSetting('sfxEnabled', enabled);
    localStorage.setItem('buttonSfxEnabled', enabled ? 'true' : 'false');
  }

  setButtonPack(pack) {
    const resolved = this.resolveUnlockedButtonPack(pack);
    this.saveSetting('buttonSoundPack', resolved);
    localStorage.setItem('buttonSoundPack', resolved);
  }

  setSfxVolume(value) {
    this.saveSetting('sfxVolume', value);
    localStorage.setItem('buttonSfxVolume', value.toString());
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(value, this.audioContext?.currentTime || 0, 0.02);
    }
  }

  shutdown() {
    this.stopAmbient();
    this.stopMusic();
    this.unbindGlobalClickSfx();
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }
    if (this.musicPreviewTimeout) {
      clearTimeout(this.musicPreviewTimeout);
      this.musicPreviewTimeout = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (err) {
        // ignore
      }
    }
    this.audioContext = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.sfxGain = null;
  }

  playButtonSfx(variant = 'primary') {
    if (!this.settings.sfxEnabled || !this.isAudioUnlocked()) return;
    const packId = this.resolveUnlockedButtonPack(this.settings.buttonSoundPack);
    if (packId !== this.settings.buttonSoundPack) {
      this.saveSetting('buttonSoundPack', packId);
      localStorage.setItem('buttonSoundPack', packId);
    }
    if (SAMPLE_BUTTON_PACKS.includes(packId)) {
      this.playSampleButtonSfx(packId);
    } else {
      this.playSynthButtonSfx(packId, variant);
    }
  }
}

export const audioManager = new AudioManager();
