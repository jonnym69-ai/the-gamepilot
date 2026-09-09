const si = require('systeminformation');

const collectSystemInfo = async () => {
  const [cpu, graphics, memory, osInfo, disks, memModules, fsSizes, blockDevs] = await Promise.all([
    si.cpu(),
    si.graphics(),
    si.mem(),
    si.osInfo(),
    si.diskLayout(),
    si.memLayout(),
    si.fsSize(),
    si.blockDevices(),
  ]);

  const primaryGpu = graphics.controllers.find((controller) => !controller.integrated) || graphics.controllers[0] || {};

  // Build a lookup from mount/fs path -> filesystem stats
  const fsMap = new Map();
  if (Array.isArray(fsSizes)) {
    for (const fs of fsSizes) {
      if (fs && fs.fs) {
        const key = fs.fs.toLowerCase();
        fsMap.set(key, fs);
        fsMap.set(key.replace(/\\/g, ''), fs); // also store without backslashes
        if (fs.mount) fsMap.set(String(fs.mount).toLowerCase(), fs);
      }
    }
  }

  // Build drive letter -> drive type mapping using blockDevices + diskLayout correlation.
  // blockDevices physical is a numeric index (e.g. "0"), while diskLayout device is
  // "\\.\\PHYSICALDRIVE0". We extract the numeric index for robust matching.
  const driveTypeMap = {};
  const getDiskIndex = (str) => {
    const m = String(str || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  };

  if (Array.isArray(blockDevs) && Array.isArray(disks)) {
    for (const bd of blockDevs) {
      if (!bd || !bd.mount || bd.physical == null) continue;
      const mountUpper = bd.mount.toUpperCase();
      // Skip entries without a simple drive-letter mount (e.g. recovery partitions)
      if (!/^[A-Z]:$/.test(mountUpper)) continue;

      const bdIndex = getDiskIndex(bd.physical);
      const physicalDisk = disks.find((d) => {
        if (!d.device) return false;
        const dIndex = getDiskIndex(d.device);
        return dIndex !== null && bdIndex !== null && dIndex === bdIndex;
      });

      if (physicalDisk) {
        const diskInterface = physicalDisk.interfaceType || '';
        const diskName = physicalDisk.name || physicalDisk.model || '';
        const diskModel = physicalDisk.model || '';
        const isNVMe = /nvme/i.test(diskInterface) || /nvme/i.test(diskName) || /nvme/i.test(diskModel);
        const isSSD =
          isNVMe || /ssd/i.test(physicalDisk.type || '') || /ssd/i.test(diskInterface) || /ssd/i.test(diskName);

        driveTypeMap[mountUpper] = {
          type: isNVMe ? 'NVMe' : isSSD ? 'SSD' : 'HDD',
          isNVMe,
          isSSD,
          name: physicalDisk.name || physicalDisk.model || 'Unknown Drive',
          model: physicalDisk.model || physicalDisk.name || '',
          size: physicalDisk.size ? Math.round(physicalDisk.size / 1024 ** 3) : 0,
        };
      }
    }
  }

  // Fallback: match fsSize logical drives to diskLayout physical disks by total
  // capacity so we can still report NVMe / SSD / HDD when blockDevices fails.
  if (Array.isArray(fsSizes) && Array.isArray(disks)) {
    for (const fs of fsSizes) {
      if (!fs || !fs.fs || !/^[A-Z]:$/i.test(fs.fs)) continue;
      const letter = fs.fs.toUpperCase();
      if (driveTypeMap[letter]) continue; // already resolved above

      const fsSizeBytes = fs.size || 0;
      const fsSizeGB = Math.round(fsSizeBytes / 1024 ** 3);

      let bestDisk = null;
      let bestDiff = Infinity;
      for (const disk of disks) {
        const diskSizeGB = disk.size ? Math.round(disk.size / 1024 ** 3) : 0;
        // A partition can never be larger than its parent disk, so disqualify
        // physical disks that are smaller than the logical drive.
        if (diskSizeGB < fsSizeGB) continue;
        const diff = Math.abs(diskSizeGB - fsSizeGB);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestDisk = disk;
        }
      }

      if (bestDisk) {
        const diskInterface = bestDisk.interfaceType || '';
        const diskName = bestDisk.name || bestDisk.model || '';
        const diskModel = bestDisk.model || '';
        const isNVMe = /nvme/i.test(diskInterface) || /nvme/i.test(diskName) || /nvme/i.test(diskModel);
        const isSSD = isNVMe || /ssd/i.test(bestDisk.type || '') || /ssd/i.test(diskInterface) || /ssd/i.test(diskName);

        driveTypeMap[letter] = {
          type: isNVMe ? 'NVMe' : isSSD ? 'SSD' : 'HDD',
          isNVMe,
          isSSD,
          name: bestDisk.name || bestDisk.model || 'Unknown Drive',
          model: bestDisk.model || bestDisk.name || '',
          size: bestDisk.size ? Math.round(bestDisk.size / 1024 ** 3) : 0,
        };
      } else {
        // Last resort: unknown but keep the letter so the mapper doesn’t bail
        driveTypeMap[letter] = {
          type: 'Unknown',
          isNVMe: false,
          isSSD: false,
          name: fs.fs,
          model: fs.fs,
          size: fsSizeGB,
        };
      }
    }
  }

  const normalizeDrive = (disk = {}) => {
    const type = disk.type || 'Unknown';
    const interfaceType = disk.interfaceType || '';
    const name = disk.name || disk.device || 'Unknown Drive';
    const vendor = disk.vendor || '';
    const model = disk.model || '';
    const isNVMe = /nvme/i.test(interfaceType) || /nvme/i.test(name) || /nvme/i.test(model) || /nvme/i.test(vendor);
    const isSSD = isNVMe || /ssd/i.test(type) || /ssd/i.test(interfaceType) || /ssd/i.test(name) || /ssd/i.test(model);

    // Try to find mount points for this physical disk via driveTypeMap keys
    // that match the physical device from blockDevices correlation.
    // If we can't, fall back to any fsSize mount that isn't already claimed.
    const ownedMounts = new Set();
    if (Array.isArray(blockDevs)) {
      for (const bd of blockDevs) {
        const bdIndex = getDiskIndex(bd?.physical);
        const diskIndex = getDiskIndex(disk.device);
        if (bdIndex !== null && diskIndex !== null && bdIndex === diskIndex) {
          if (bd.mount) {
            if (process.platform === 'win32' && /^[A-Z]:$/i.test(bd.mount)) {
              ownedMounts.add(bd.mount.toUpperCase());
            } else if (process.platform === 'linux' && String(bd.mount).startsWith('/')) {
              ownedMounts.add(String(bd.mount));
            }
          }
        }
      }
    }

    const partitions = [];
    for (const mp of ownedMounts) {
      const fsStat = fsMap.get(mp.toLowerCase()) || fsMap.get(mp.toLowerCase().replace(/\\/g, '')) || null;
      partitions.push({
        mount: mp,
        size: fsStat ? Math.round(fsStat.size / 1024 ** 3) : 0,
        free: fsStat ? Math.round(fsStat.available / 1024 ** 3) : 0,
        used: fsStat ? Math.round(fsStat.used / 1024 ** 3) : 0,
        usePercent: fsStat ? Math.round(fsStat.use) : 0,
      });
    }

    return {
      type,
      size: disk.size ? Math.round(disk.size / 1024 ** 3) : 0,
      name,
      model: model || name,
      vendor,
      interfaceType: interfaceType || 'Unknown',
      mount: Array.from(ownedMounts)[0] || '',
      isSSD,
      isNVMe,
      partitions,
    };
  };

  const storage = Array.isArray(disks) ? disks.map(normalizeDrive) : [];

  const ramModules = Array.isArray(memModules)
    ? memModules.map((module) => ({
        sizeGB: module.size ? Math.round(module.size / 1024 ** 3) : 0,
        type: module.type || module.partNum || module.serialNum || '',
        clockSpeed: module.clockSpeed || module.frequency || module.minVoltage || 0,
        manufacturer: module.manufacturer || '',
        partNum: module.partNum || '',
        serialNum: module.serialNum || '',
        formFactor: module.formFactor || '',
        bank: module.bank || '',
        voltageConfigured: module.voltageConfigured || module.voltage || null,
      }))
    : [];

  const detectedRamType = ramModules.find((m) => m.type)?.type || memory.type || 'Unknown';
  const detectedRamSpeed = (() => {
    const moduleSpeeds = ramModules.map((m) => m.clockSpeed).filter(Boolean);
    if (moduleSpeeds.length > 0) {
      return Math.round(moduleSpeeds.reduce((sum, speed) => sum + speed, 0) / moduleSpeeds.length);
    }
    return memory.clockSpeed || memory.speed || 0;
  })();

  const ramTotalGb = memory.total ? Math.round(memory.total / 1024 ** 3) : 0;
  const ramFreeGb = memory.free ? Math.round(memory.free / 1024 ** 3) : 0;

  return {
    cpu: {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      model: cpu.brand || cpu.brandRaw || cpu.family || 'Unknown CPU',
      name: cpu.brand || cpu.brandRaw || 'Unknown CPU',
      speed: cpu.speed,
      speedMax: cpu.speedMax,
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
      processors: cpu.processors,
      socket: cpu.socket,
      family: cpu.family,
      stepping: cpu.stepping,
    },
    gpu: {
      model: primaryGpu.model || 'Unknown GPU',
      vendor: primaryGpu.vendor || primaryGpu.subVendor || 'Unknown',
      vram: primaryGpu.vram || 0,
      vramGB: primaryGpu.vram ? Math.round(primaryGpu.vram / 1024) : 0,
      bus: primaryGpu.bus || 'Unknown',
    },
    ram: {
      total: ramTotalGb,
      free: ramFreeGb,
      used: ramTotalGb && ramFreeGb ? ramTotalGb - ramFreeGb : 0,
      type: detectedRamType,
      speed: detectedRamSpeed,
      modules: ramModules,
    },
    storage,
    os: {
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      arch: osInfo.arch,
      build: osInfo.build,
    },
    driveTypeMap,
    logicalDrives: Array.isArray(fsSizes)
      ? fsSizes
          .map((fs) => ({
            mount: process.platform === 'win32' ? fs.fs : fs.mount || fs.fs,
            fsType: fs.type,
            sizeGB: fs.size ? Math.round(fs.size / 1024 ** 3) : 0,
            usedGB: fs.used ? Math.round(fs.used / 1024 ** 3) : 0,
            freeGB: fs.available ? Math.round(fs.available / 1024 ** 3) : 0,
            usePercent: Math.round(fs.use || 0),
          }))
          .filter((drive) =>
            process.platform === 'win32'
              ? /^[A-Z]:$/i.test(drive.mount)
              : String(drive.mount || '').startsWith('/') &&
                !['tmpfs', 'devtmpfs', 'squashfs', 'overlay'].includes(String(drive.fsType || '').toLowerCase())
          )
      : [],
    lastUpdated: Date.now(),
  };
};

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('get-system-info', async () => {
    try {
      console.log('🖥️ Collecting system information for renderer request...');
      const info = await collectSystemInfo();
      return info;
    } catch (error) {
      console.error('❌ Failed to collect system info:', error);
      throw error;
    }
  });
}

module.exports = { collectSystemInfo, registerIpcHandlers };
