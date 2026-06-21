// HardwareDetector.js - Detects system hardware specifications using Electron IPC
import { getElectronAPI } from './ElectronBridge';
import StorageService from './StorageService';

export class HardwareDetector {
  static normalizeStorage(storage) {
    const drives = Array.isArray(storage) ? storage : storage ? [storage] : [];

    return drives.map(drive => {
      const name = drive.name || drive.model || drive.device || 'Unknown Drive';
      const type = drive.type || 'Unknown';
      const interfaceType = drive.interfaceType || '';
      const isNVMe = !!drive.isNVMe || /nvme/i.test(interfaceType) || /nvme/i.test(name) || /nvme/i.test(drive.model || '');
      const isSSD = !!drive.isSSD || isNVMe || /ssd/i.test(type) || /ssd/i.test(interfaceType) || /ssd/i.test(name) || /ssd/i.test(drive.model || '');

      return {
        ...drive,
        name,
        model: drive.model || name,
        type,
        interfaceType: interfaceType || 'Unknown',
        isNVMe,
        isSSD,
        partitions: Array.isArray(drive.partitions) ? drive.partitions : []
      };
    });
  }

  // Get complete system information from Electron main process
  static async getSystemInfo() {
    try {
      const electronAPI = getElectronAPI();
      if (!electronAPI || typeof electronAPI.getSystemInfo !== 'function') {
        return this.getDefaultSystemInfo();
      }

      // Get real hardware info from Electron main process via IPC
      const rawInfo = await electronAPI.getSystemInfo();
      
      // Add tier and score calculations
      const systemInfo = {
        cpu: {
          ...rawInfo.cpu,
          tier: this.getCPUTier(rawInfo.cpu.brand),
          score: this.getCPUScore(rawInfo.cpu.brand, rawInfo.cpu.cores)
        },
        gpu: {
          ...rawInfo.gpu,
          tier: this.getGPUTier(rawInfo.gpu.model),
          score: this.getGPUScore(rawInfo.gpu.model)
        },
        ram: {
          ...rawInfo.ram,
          tier: this.getRAMTier(rawInfo.ram.total)
        },
        storage: this.normalizeStorage(rawInfo.storage),
        driveTypeMap: rawInfo.driveTypeMap || {},
        logicalDrives: rawInfo.logicalDrives || [],
        os: rawInfo.os,
        lastUpdated: rawInfo.lastUpdated
      };

      // Cache the result
      StorageService.setString('systemInfo', JSON.stringify(systemInfo));
      
      return systemInfo;
    } catch (error) {
      console.error('Error detecting hardware:', error);
      
      // Try to return cached data
      const cached = StorageService.getString('systemInfo');
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          storage: this.normalizeStorage(parsed.storage),
          driveTypeMap: parsed.driveTypeMap || {},
          logicalDrives: parsed.logicalDrives || []
        };
      }
      
      return this.getDefaultSystemInfo();
    }
  }

  // Fallback system info if not in Electron
  static getDefaultSystemInfo() {
    return {
      cpu: {
        manufacturer: 'Unknown',
        brand: 'Unknown CPU',
        model: 'Unknown CPU',
        cores: 4,
        physicalCores: 2,
        speed: 2.4,
        speedMax: 3.6,
        tier: 2,
        score: 50
      },
      gpu: {
        model: 'Unknown GPU',
        vendor: 'Unknown',
        vram: 2048,
        vramGB: 2,
        tier: 2,
        score: 50
      },
      ram: {
        total: 8,
        free: 3,
        used: 5,
        type: 'Unknown',
        speed: 0,
        tier: 2
      },
      storage: [{
        type: 'Unknown',
        size: 256,
        name: 'Unknown',
        model: 'Unknown',
        interfaceType: 'Unknown',
        isSSD: false,
        isNVMe: false,
        partitions: []
      }],
      os: {
        platform: 'Unknown',
        distro: 'Unknown',
        release: 'Unknown',
        arch: 'x64'
      },
      lastUpdated: Date.now()
    };
  }

  // Get cached system info or detect if stale
  static async getCachedSystemInfo({ allowRefresh = false } = {}) {
    const cached = StorageService.getString('systemInfo');
    if (cached) {
      const data = JSON.parse(cached);

      // Check if this is fallback data (Unknown CPU/GPU)
      const isFallbackData = data.cpu?.brand === 'Unknown CPU' ||
        data.gpu?.brand === 'Unknown GPU';
      const hasOldRAMData = !data.ram?.speed || data.ram?.speed === 0;

      if (isFallbackData || hasOldRAMData) {
        StorageService.remove('systemInfo');
        return allowRefresh ? await this.getSystemInfo() : this.getDefaultSystemInfo();
      }

      const lastUpdate = data.lastUpdate || 0;
      const hoursSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60);

      // Refresh if older than 24 hours
      if (hoursSinceUpdate < 24) {
        return data;
      }
    }
    
    return allowRefresh ? await this.getSystemInfo() : this.getDefaultSystemInfo();
  }

  // CPU tier classification (1-5)
  static getCPUTier(cpuBrand) {
    const brand = cpuBrand.toLowerCase();
    
    // Intel tiers
    if (brand.includes('i9-14') || brand.includes('i9-13')) return 5;
    if (brand.includes('i9-12') || brand.includes('i9-11')) return 5;
    if (brand.includes('i9')) return 4;
    if (brand.includes('i7-14') || brand.includes('i7-13')) return 4;
    if (brand.includes('i7-12') || brand.includes('i7-11')) return 4;
    if (brand.includes('i7')) return 3;
    if (brand.includes('i5-14') || brand.includes('i5-13')) return 3;
    if (brand.includes('i5-12') || brand.includes('i5-11')) return 3;
    if (brand.includes('i5')) return 2;
    if (brand.includes('i3')) return 2;
    
    // AMD Ryzen tiers
    if (brand.includes('ryzen 9 7') || brand.includes('ryzen 9 9')) return 5;
    if (brand.includes('ryzen 9')) return 4;
    if (brand.includes('ryzen 7 7') || brand.includes('ryzen 7 9')) return 4;
    if (brand.includes('ryzen 7')) return 3;
    if (brand.includes('ryzen 5 7') || brand.includes('ryzen 5 9')) return 3;
    if (brand.includes('ryzen 5')) return 2;
    if (brand.includes('ryzen 3')) return 2;
    
    return 1; // Unknown or older CPU
  }

  // GPU tier classification (1-5)
  static getGPUTier(gpuModel) {
    const model = gpuModel.toLowerCase();
    
    // NVIDIA RTX 40 series
    if (model.includes('rtx 4090')) return 5;
    if (model.includes('rtx 4080')) return 5;
    if (model.includes('rtx 4070')) return 4;
    if (model.includes('rtx 4060')) return 3;
    
    // NVIDIA RTX 30 series
    if (model.includes('rtx 3090')) return 5;
    if (model.includes('rtx 3080')) return 4;
    if (model.includes('rtx 3070')) return 4;
    if (model.includes('rtx 3060')) return 3;
    if (model.includes('rtx 3050')) return 2;
    
    // NVIDIA RTX 20 series
    if (model.includes('rtx 2080')) return 3;
    if (model.includes('rtx 2070')) return 3;
    if (model.includes('rtx 2060')) return 2;
    
    // NVIDIA GTX 16 series
    if (model.includes('gtx 1660')) return 2;
    if (model.includes('gtx 1650')) return 2;
    
    // NVIDIA GTX 10 series
    if (model.includes('gtx 1080')) return 2;
    if (model.includes('gtx 1070')) return 2;
    if (model.includes('gtx 1060')) return 2;
    if (model.includes('gtx 1050')) return 1;
    
    // AMD Radeon RX 7000 series
    if (model.includes('rx 7900')) return 5;
    if (model.includes('rx 7800')) return 4;
    if (model.includes('rx 7700')) return 4;
    if (model.includes('rx 7600')) return 3;
    
    // AMD Radeon RX 6000 series
    if (model.includes('rx 6900')) return 4;
    if (model.includes('rx 6800')) return 4;
    if (model.includes('rx 6700')) return 3;
    if (model.includes('rx 6600')) return 3;
    if (model.includes('rx 6500')) return 2;
    
    // AMD Radeon RX 5000 series
    if (model.includes('rx 5700')) return 3;
    if (model.includes('rx 5600')) return 2;
    if (model.includes('rx 5500')) return 2;
    
    return 1; // Unknown or integrated graphics
  }

  // RAM tier classification (1-5)
  static getRAMTier(ramGB) {
    if (ramGB >= 64) return 5;
    if (ramGB >= 32) return 4;
    if (ramGB >= 16) return 3;
    if (ramGB >= 8) return 2;
    return 1;
  }

  // CPU performance score (0-100)
  static getCPUScore(cpuBrand, cores) {
    const tier = this.getCPUTier(cpuBrand);
    const baseScore = tier * 15; // 15, 30, 45, 60, 75
    const coreBonus = Math.min(cores * 2, 25); // Up to 25 bonus for cores
    return Math.min(baseScore + coreBonus, 100);
  }

  // GPU performance score (0-100)
  static getGPUScore(gpuModel) {
    const tier = this.getGPUTier(gpuModel);
    return tier * 20; // 20, 40, 60, 80, 100
  }

  // Overall system readiness score
  static getSystemReadinessScore(systemInfo) {
    const cpuScore = systemInfo.cpu.score || 0;
    const gpuScore = systemInfo.gpu.score || 0;
    const ramScore = systemInfo.ram.tier * 20; // 20, 40, 60, 80, 100
    
    // Weighted average: GPU 40%, CPU 35%, RAM 25%
    const readiness = Math.round(
      (gpuScore * 0.4) + (cpuScore * 0.35) + (ramScore * 0.25)
    );
    
    return Math.min(readiness, 100);
  }
}
