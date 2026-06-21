// StorageDriveMapper.js
// Maps game install directories to their hosting drive's type (NVMe / SSD / HDD)
// using the system storage snapshot that HardwareDetector already caches.

import StorageService from './StorageService';

const SYSTEM_INFO_CACHE_KEY = 'systemInfo';

export class StorageDriveMapper {
  static getSystemInfo() {
    try {
      const raw = StorageService.getString(SYSTEM_INFO_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static getDriveTypeMap() {
    const info = this.getSystemInfo();
    return info?.driveTypeMap || {};
  }

  static getSystemStorage() {
    const info = this.getSystemInfo();
    const drives = info?.storage;
    return Array.isArray(drives) ? drives : [];
  }

  // Extract Windows drive letter from a path, e.g. "D:\\Games\\..." -> "D:"
  static extractDriveLetter(filePath) {
    if (!filePath || typeof filePath !== 'string') return null;
    const trimmed = filePath.trim();
    // Windows absolute path: starts with letter followed by colon
    const match = trimmed.match(/^([A-Za-z]:)/);
    if (match) return match[1].toUpperCase();
    // Unix-style mounted path (e.g. /mnt/games) — no drive letter
    return null;
  }

  // Primary lookup: use driveTypeMap (drive letter -> type info).
  // This is built in the main process via blockDevices + diskLayout correlation.
  static findDriveByLetter(filePath) {
    const letter = this.extractDriveLetter(filePath);
    if (!letter) return null;
    const map = this.getDriveTypeMap();
    const entry = map[letter];
    if (!entry) return null;
    return {
      ...entry,
      mount: letter
    };
  }

  // Fallback: match installDir prefix against drive mount points in storage array.
  // Used when driveTypeMap is not populated (legacy cache).
  static findDriveByMount(filePath) {
    if (!filePath || typeof filePath !== 'string') return null;
    const normalized = filePath.trim().toLowerCase();
    const drives = this.getSystemStorage();
    if (drives.length === 0) return null;

    const candidates = [];
    for (const drive of drives) {
      const mounts = new Set();
      const primaryMount = drive.mount || '';
      if (primaryMount) mounts.add(primaryMount);
      if (Array.isArray(drive.partitions)) {
        for (const p of drive.partitions) {
          if (p?.mount) mounts.add(p.mount);
        }
      }
      for (const m of mounts) {
        candidates.push({ mount: m, drive });
      }
    }

    candidates.sort((a, b) => b.mount.length - a.mount.length);

    for (const { mount, drive } of candidates) {
      const mountLower = mount.toLowerCase();
      if (
        normalized.startsWith(mountLower) ||
        normalized.startsWith(mountLower.replace(/\\/g, '/'))
      ) {
        return drive;
      }
    }

    return null;
  }

  static findDriveForPath(filePath) {
    // Prefer the new driveTypeMap lookup
    const byLetter = this.findDriveByLetter(filePath);
    if (byLetter) return byLetter;
    // Fall back to mount-point scanning for backward compatibility
    return this.findDriveByMount(filePath);
  }

  static getDriveTypeLabel(drive) {
    if (!drive) return 'Unknown';
    if (drive.isNVMe) return 'NVMe';
    if (drive.isSSD) return 'SSD';
    return 'HDD';
  }

  static getDriveTypeColor(drive) {
    if (!drive) return '#6b7280';
    if (drive.isNVMe) return '#00e676';
    if (drive.isSSD) return '#4caf50';
    return '#ff9800';
  }

  static getDriveTypeClass(drive) {
    if (!drive) return 'drive-unknown';
    if (drive.isNVMe) return 'drive-nvme';
    if (drive.isSSD) return 'drive-ssd';
    return 'drive-hdd';
  }

  // Public helper: given a game object, return { drive, type, color, class, mount, name }
  static resolve(game) {
    const installDir = game?.installDir;
    const drive = this.findDriveForPath(installDir);
    return {
      drive: drive || null,
      type: this.getDriveTypeLabel(drive),
      color: this.getDriveTypeColor(drive),
      cssClass: this.getDriveTypeClass(drive),
      mount: drive?.mount || this.extractDriveLetter(installDir) || null,
      name: drive?.name || drive?.model || 'Unknown Drive'
    };
  }

  // Aggregate: how many bytes of the given games sit on each drive type?
  static getTypeBreakdown(games, bytesFn) {
    const breakdown = { NVMe: 0, SSD: 0, HDD: 0, Unknown: 0 };
    if (!Array.isArray(games)) return breakdown;

    for (const game of games) {
      const bytes = typeof bytesFn === 'function' ? bytesFn(game) : 0;
      if (!bytes || bytes <= 0) continue;
      const { type } = this.resolve(game);
      breakdown[type] = (breakdown[type] || 0) + bytes;
    }
    return breakdown;
  }
}

export default StorageDriveMapper;
