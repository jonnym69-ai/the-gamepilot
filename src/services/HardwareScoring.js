// HardwareScoring.js - Comprehensive hardware scoring system (0-100 scale)

export class HardwareScoring {
  
  // ==================== CPU SCORING ====================
  
  static getCPUScore(cpuBrand, cores, speed) {
    const brand = cpuBrand.toLowerCase();
    let baseScore = 0;
    
    // Intel Core (latest gen = higher score)
    if (brand.includes('i9-15') || brand.includes('i9-14900')) baseScore = 98;
    else if (brand.includes('i9-14') || brand.includes('i9-13900')) baseScore = 95;
    else if (brand.includes('i9-13') || brand.includes('i9-12900')) baseScore = 90;
    else if (brand.includes('i9-12') || brand.includes('i9-11900')) baseScore = 85;
    else if (brand.includes('i9-10') || brand.includes('i9-9')) baseScore = 75;
    else if (brand.includes('i9')) baseScore = 70;

    else if (brand.includes('i7-15') || brand.includes('i7-14700')) baseScore = 88;
    else if (brand.includes('i7-14') || brand.includes('i7-13700')) baseScore = 85;
    else if (brand.includes('i7-13') || brand.includes('i7-12700')) baseScore = 80;
    else if (brand.includes('i7-12') || brand.includes('i7-11700')) baseScore = 75;
    else if (brand.includes('i7-10') || brand.includes('i7-9')) baseScore = 65;
    else if (brand.includes('i7-8') || brand.includes('i7-7')) baseScore = 55;
    else if (brand.includes('i7')) baseScore = 50;

    else if (brand.includes('i5-15') || brand.includes('i5-14600')) baseScore = 78;
    else if (brand.includes('i5-14') || brand.includes('i5-13600')) baseScore = 75;
    else if (brand.includes('i5-13') || brand.includes('i5-12600')) baseScore = 70;
    else if (brand.includes('i5-12') || brand.includes('i5-11600')) baseScore = 65;
    else if (brand.includes('i5-10') || brand.includes('i5-9')) baseScore = 55;
    else if (brand.includes('i5-8') || brand.includes('i5-7')) baseScore = 45;
    else if (brand.includes('i5')) baseScore = 40;

    else if (brand.includes('i3-14') || brand.includes('i3-13') || brand.includes('i3-12')) baseScore = 50;
    else if (brand.includes('i3-10') || brand.includes('i3-9')) baseScore = 40;
    else if (brand.includes('i3')) baseScore = 35;

    // AMD Ryzen (latest gen = higher score)
    else if (brand.includes('ryzen 9 9950') || brand.includes('ryzen 9 7950')) baseScore = 98;
    else if (brand.includes('ryzen 9 9900') || brand.includes('ryzen 9 7900')) baseScore = 95;
    else if (brand.includes('ryzen 9 5950') || brand.includes('ryzen 9 5900')) baseScore = 85;
    else if (brand.includes('ryzen 9 3950') || brand.includes('ryzen 9 3900')) baseScore = 75;
    else if (brand.includes('ryzen 9')) baseScore = 80;

    else if (brand.includes('ryzen 7 9800') || brand.includes('ryzen 7 7800')) baseScore = 90;
    else if (brand.includes('ryzen 7 9700') || brand.includes('ryzen 7 7700')) baseScore = 85;
    else if (brand.includes('ryzen 7 5800')) baseScore = 80;
    else if (brand.includes('ryzen 7 5700')) baseScore = 75;
    else if (brand.includes('ryzen 7 3800') || brand.includes('ryzen 7 3700')) baseScore = 65;
    else if (brand.includes('ryzen 7 2700')) baseScore = 55;
    else if (brand.includes('ryzen 7')) baseScore = 70;

    else if (brand.includes('ryzen 5 9600') || brand.includes('ryzen 5 7600')) baseScore = 80;
    else if (brand.includes('ryzen 5 5600')) baseScore = 70;
    else if (brand.includes('ryzen 5 3600')) baseScore = 60;
    else if (brand.includes('ryzen 5 2600')) baseScore = 50;
    else if (brand.includes('ryzen 5')) baseScore = 65;

    else if (brand.includes('ryzen 3 5300') || brand.includes('ryzen 3 3300')) baseScore = 50;
    else if (brand.includes('ryzen 3')) baseScore = 45;
    
    // Older/budget CPUs
    else if (brand.includes('pentium') || brand.includes('celeron')) baseScore = 25;
    else if (brand.includes('athlon')) baseScore = 30;
    else baseScore = 35; // Unknown CPU
    
    // Adjust for core count (more cores = better for modern games)
    let coreMultiplier = 1.0;
    if (cores >= 16) coreMultiplier = 1.15;
    else if (cores >= 12) coreMultiplier = 1.10;
    else if (cores >= 8) coreMultiplier = 1.05;
    else if (cores >= 6) coreMultiplier = 1.0;
    else if (cores >= 4) coreMultiplier = 0.95;
    else coreMultiplier = 0.85; // Dual-core penalty
    
    // Adjust for clock speed
    let speedMultiplier = 1.0;
    if (speed >= 5.0) speedMultiplier = 1.05;
    else if (speed >= 4.5) speedMultiplier = 1.02;
    else if (speed >= 4.0) speedMultiplier = 1.0;
    else if (speed >= 3.5) speedMultiplier = 0.98;
    else if (speed < 3.0) speedMultiplier = 0.95;
    
    const finalScore = Math.round(baseScore * coreMultiplier * speedMultiplier);
    return Math.min(Math.max(finalScore, 0), 100);
  }
  
  // ==================== GPU SCORING ====================
  
  static getGPUScore(gpuModel, vramGB) {
    const model = gpuModel.toLowerCase();
    let baseScore = 0;
    
    // NVIDIA RTX 50 series
    if (model.includes('rtx 5090')) baseScore = 105;
    else if (model.includes('rtx 5080')) baseScore = 100;
    else if (model.includes('rtx 5070 ti')) baseScore = 92;
    else if (model.includes('rtx 5070')) baseScore = 85;
    else if (model.includes('rtx 5060 ti')) baseScore = 78;
    else if (model.includes('rtx 5060')) baseScore = 70;
    else if (model.includes('rtx 5050')) baseScore = 58;

    // NVIDIA RTX 40 series
    else if (model.includes('rtx 4090')) baseScore = 100;
    else if (model.includes('rtx 4080 super')) baseScore = 96;
    else if (model.includes('rtx 4080')) baseScore = 95;
    else if (model.includes('rtx 4070 ti super')) baseScore = 90;
    else if (model.includes('rtx 4070 ti')) baseScore = 88;
    else if (model.includes('rtx 4070 super')) baseScore = 85;
    else if (model.includes('rtx 4070')) baseScore = 82;
    else if (model.includes('rtx 4060 ti')) baseScore = 75;
    else if (model.includes('rtx 4060')) baseScore = 65;
    else if (model.includes('rtx 4050')) baseScore = 55;
    
    // NVIDIA RTX 30 series
    else if (model.includes('rtx 3090 ti')) baseScore = 92;
    else if (model.includes('rtx 3090')) baseScore = 90;
    else if (model.includes('rtx 3080 ti')) baseScore = 85;
    else if (model.includes('rtx 3080')) baseScore = 82;
    else if (model.includes('rtx 3070 ti')) baseScore = 78;
    else if (model.includes('rtx 3070')) baseScore = 75;
    else if (model.includes('rtx 3060 ti')) baseScore = 72;
    else if (model.includes('rtx 3060')) baseScore = 72;
    else if (model.includes('rtx 3050')) baseScore = 50;
    
    // NVIDIA RTX 20 series
    else if (model.includes('rtx 2080 ti')) baseScore = 75;
    else if (model.includes('rtx 2080')) baseScore = 70;
    else if (model.includes('rtx 2070')) baseScore = 65;
    else if (model.includes('rtx 2060')) baseScore = 55;
    
    // NVIDIA GTX 16 series (average tier)
    else if (model.includes('gtx 1660 ti')) baseScore = 62;
    else if (model.includes('gtx 1660')) baseScore = 58;
    else if (model.includes('gtx 1650')) baseScore = 52;
    
    // NVIDIA GTX 10 series (average tier)
    else if (model.includes('gtx 1080 ti')) baseScore = 75;
    else if (model.includes('gtx 1080')) baseScore = 70;
    else if (model.includes('gtx 1070')) baseScore = 65;
    else if (model.includes('gtx 1060')) baseScore = 55;
    else if (model.includes('gtx 1050 ti')) baseScore = 48;
    else if (model.includes('gtx 1050')) baseScore = 42;
    
    // AMD Radeon RX 9000 series
    else if (model.includes('rx 9950')) baseScore = 100;
    else if (model.includes('rx 9900')) baseScore = 95;
    else if (model.includes('rx 9070 xt')) baseScore = 88;
    else if (model.includes('rx 9070')) baseScore = 82;
    else if (model.includes('rx 9060')) baseScore = 70;

    // AMD Radeon RX 7000 series
    else if (model.includes('rx 7900 xtx')) baseScore = 95;
    else if (model.includes('rx 7900 xt')) baseScore = 90;
    else if (model.includes('rx 7800 xt')) baseScore = 82;
    else if (model.includes('rx 7700 xt')) baseScore = 75;
    else if (model.includes('rx 7600')) baseScore = 62;
    
    // AMD Radeon RX 6000 series
    else if (model.includes('rx 6950 xt')) baseScore = 88;
    else if (model.includes('rx 6900 xt')) baseScore = 85;
    else if (model.includes('rx 6800 xt')) baseScore = 80;
    else if (model.includes('rx 6800')) baseScore = 75;
    else if (model.includes('rx 6750 xt')) baseScore = 70;
    else if (model.includes('rx 6700 xt')) baseScore = 68;
    else if (model.includes('rx 6700')) baseScore = 62;
    else if (model.includes('rx 6650 xt')) baseScore = 60;
    else if (model.includes('rx 6600 xt')) baseScore = 58;
    else if (model.includes('rx 6600')) baseScore = 52;
    else if (model.includes('rx 6500')) baseScore = 40;
    
    // AMD Radeon RX 5000 series
    else if (model.includes('rx 5700 xt')) baseScore = 62;
    else if (model.includes('rx 5700')) baseScore = 58;
    else if (model.includes('rx 5600 xt')) baseScore = 52;
    else if (model.includes('rx 5600')) baseScore = 48;
    else if (model.includes('rx 5500')) baseScore = 42;
    
    // Integrated graphics
    else if (model.includes('intel uhd') || model.includes('intel hd')) baseScore = 15;
    else if (model.includes('radeon graphics') || model.includes('vega')) baseScore = 20;
    else baseScore = 25; // Unknown GPU
    
    // VRAM bonus (more VRAM = better for modern games)
    let vramBonus = 0;
    if (vramGB >= 24) vramBonus = 8;
    else if (vramGB >= 16) vramBonus = 6;
    else if (vramGB >= 12) vramBonus = 4;
    else if (vramGB >= 8) vramBonus = 2;
    else if (vramGB >= 6) vramBonus = 0;
    else if (vramGB >= 4) vramBonus = -2;
    else if (vramGB < 4) vramBonus = -5;
    
    const finalScore = baseScore + vramBonus;
    return Math.min(Math.max(finalScore, 0), 100);
  }
  
  // ==================== RAM SCORING ====================
  
  static getRAMScore(ramGB, ramType, ramSpeed) {
    let baseScore = 0;
    
    // Score based on capacity
    if (ramGB >= 128) baseScore = 100;
    else if (ramGB >= 64) baseScore = 95;
    else if (ramGB >= 48) baseScore = 90;
    else if (ramGB >= 32) baseScore = 85;
    else if (ramGB >= 24) baseScore = 75;
    else if (ramGB >= 16) baseScore = 65;
    else if (ramGB >= 12) baseScore = 50;
    else if (ramGB >= 8) baseScore = 40;
    else if (ramGB >= 4) baseScore = 25;
    else baseScore = 15;
    
    // Type bonus
    let typeBonus = 0;
    if (ramType.includes('DDR5')) typeBonus = 10;
    else if (ramType.includes('DDR4')) typeBonus = 5;
    else if (ramType.includes('DDR3')) typeBonus = 0;
    else typeBonus = -5;
    
    // Speed bonus (for DDR4/DDR5)
    let speedBonus = 0;
    if (ramSpeed >= 6000) speedBonus = 5;
    else if (ramSpeed >= 5000) speedBonus = 4;
    else if (ramSpeed >= 4000) speedBonus = 3;
    else if (ramSpeed >= 3600) speedBonus = 2;
    else if (ramSpeed >= 3200) speedBonus = 1;
    else if (ramSpeed >= 2666) speedBonus = 0;
    else speedBonus = -2;
    
    const finalScore = baseScore + typeBonus + speedBonus;
    return Math.min(Math.max(finalScore, 0), 100);
  }
  
  // ==================== STORAGE SCORING ====================
  
  static getStorageScore(drives) {
    const storageDrives = Array.isArray(drives) ? drives : drives ? [drives] : [];
    if (storageDrives.length === 0) return 50;
    
    // Find best drive (NVMe > SSD > HDD)
    const bestDrive = storageDrives[0]; // Already sorted by priority
    
    let score = 0;
    if (bestDrive.isNVMe) score = 100;
    else if (bestDrive.isSSD) score = 85;
    else score = 50; // HDD
    
    // Bonus for having multiple fast drives
    const nvmeCount = storageDrives.filter(d => d.isNVMe).length;
    const ssdCount = storageDrives.filter(d => d.isSSD && !d.isNVMe).length;
    
    if (nvmeCount >= 2) score = Math.min(score + 5, 100);
    if (ssdCount >= 1) score = Math.min(score + 2, 100);
    
    return score;
  }
  
  // ==================== OVERALL SYSTEM SCORE ====================
  
  static getOverallScore(systemInfo) {
    const cpuScore = this.getCPUScore(
      systemInfo.cpu.brand,
      systemInfo.cpu.cores,
      systemInfo.cpu.speed
    );
    
    const gpuScore = this.getGPUScore(
      systemInfo.gpu.model,
      systemInfo.gpu.vramGB
    );
    
    const ramScore = this.getRAMScore(
      systemInfo.ram.total,
      systemInfo.ram.type,
      systemInfo.ram.speed
    );
    
    const storageScore = this.getStorageScore(systemInfo.storage);
    
    // Weighted average: GPU is most important for gaming
    const overall = Math.round(
      (cpuScore * 0.30) +  // 30% CPU
      (gpuScore * 0.40) +  // 40% GPU (most important)
      (ramScore * 0.20) +  // 20% RAM
      (storageScore * 0.10) // 10% Storage
    );
    
    return {
      overall,
      cpu: cpuScore,
      gpu: gpuScore,
      ram: ramScore,
      storage: storageScore,
      tier: this.getSystemTier(overall)
    };
  }
  
  // ==================== SYSTEM TIER ====================
  
  static getSystemTier(overallScore) {
    if (overallScore >= 90) return 'Enthusiast';
    if (overallScore >= 80) return 'High-End';
    if (overallScore >= 70) return 'Upper Mid-Range';
    if (overallScore >= 60) return 'Mid-Range';
    if (overallScore >= 50) return 'Entry Gaming';
    if (overallScore >= 40) return 'Budget Gaming';
    return 'Office/Light Gaming';
  }
  
  // ==================== PERFORMANCE CATEGORY ====================
  
  static getPerformanceCategory(score) {
    if (score >= 90) return { label: 'Ultra', color: '#00e676' };
    if (score >= 75) return { label: 'High', color: '#4caf50' };
    if (score >= 60) return { label: 'Medium', color: '#2196f3' };
    if (score >= 45) return { label: 'Low', color: '#ff9800' };
    return { label: 'Minimum', color: '#f44336' };
  }
}
