// GameRequirementsDatabase.js - Comprehensive game requirements database
// All games from user's 2015-2026 encyclopedia with proper Steam IDs and score conversions

export const GAME_DATABASE = {
  // === CLASSIC ERA (1998-2004) ===
  '70': { // Half-Life
    name: 'Half-Life',
    minimum: { cpuScore: 10, gpuScore: 10, ram: 0.09, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 15, gpuScore: 15, ram: 0.13, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 25, gpuScore: 25, ram: 0.25, storage: 1, requiresSSD: false }
  },
  
  '6910': { // Deus Ex
    name: 'Deus Ex',
    minimum: { cpuScore: 10, gpuScore: 10, ram: 0.06, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 15, gpuScore: 15, ram: 0.13, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 20, gpuScore: 20, ram: 0.25, storage: 1, requiresSSD: false }
  },
  
  '12140': { // Max Payne
    name: 'Max Payne',
    minimum: { cpuScore: 12, gpuScore: 10, ram: 0.09, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 18, gpuScore: 15, ram: 0.13, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 25, gpuScore: 20, ram: 0.25, storage: 1, requiresSSD: false }
  },
  
  '32370': { // Star Wars: KOTOR
    name: 'Star Wars: Knights of the Old Republic',
    minimum: { cpuScore: 15, gpuScore: 15, ram: 0.25, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 20, gpuScore: 20, ram: 0.5, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 4, requiresSSD: false }
  },
  
  '220': { // Half-Life 2
    name: 'Half-Life 2',
    minimum: { cpuScore: 20, gpuScore: 15, ram: 0.5, storage: 6, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 20, ram: 1, storage: 6, requiresSSD: false },
    ultra: { cpuScore: 35, gpuScore: 30, ram: 2, storage: 6, requiresSSD: false }
  },
  
  '240': { // Counter-Strike: Source
    name: 'Counter-Strike: Source',
    minimum: { cpuScore: 18, gpuScore: 12, ram: 0.25, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 20, ram: 0.5, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 40, gpuScore: 30, ram: 1, storage: 4, requiresSSD: false }
  },
  
  '12900': { // World of Warcraft (placeholder)
    name: 'World of Warcraft',
    minimum: { cpuScore: 15, gpuScore: 15, ram: 0.5, storage: 70, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 38, ram: 4, storage: 70, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 55, ram: 8, storage: 70, requiresSSD: false }
  },
  
  // === 2005-2007 ERA ===
  '24960': { // Battlefield 2
    name: 'Battlefield 2',
    minimum: { cpuScore: 20, gpuScore: 18, ram: 0.5, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 25, ram: 1, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 40, gpuScore: 35, ram: 2, storage: 3, requiresSSD: false }
  },
  
  '21090': { // F.E.A.R.
    name: 'F.E.A.R.',
    minimum: { cpuScore: 20, gpuScore: 18, ram: 0.5, storage: 12, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 28, ram: 1, storage: 12, requiresSSD: false },
    ultra: { cpuScore: 45, gpuScore: 35, ram: 2, storage: 12, requiresSSD: false }
  },
  
  '22330': { // The Elder Scrolls IV: Oblivion
    name: 'The Elder Scrolls IV: Oblivion',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 0.5, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 30, ram: 1, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 40, ram: 2, storage: 4, requiresSSD: false }
  },
  
  '4560': { // Company of Heroes
    name: 'Company of Heroes',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 0.5, storage: 9, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 28, ram: 1, storage: 9, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 40, ram: 2, storage: 9, requiresSSD: false }
  },
  
  '4500': { // S.T.A.L.K.E.R.: Shadow of Chernobyl
    name: 'S.T.A.L.K.E.R.: Shadow of Chernobyl',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 0.5, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 10, requiresSSD: false }
  },
  
  '4200': { // Garry's Mod
    name: "Garry's Mod",
    minimum: { cpuScore: 22, gpuScore: 20, ram: 2, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 25, ram: 8, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 40, ram: 16, storage: 5, requiresSSD: false }
  },
  
  '17300': { // Crysis
    name: 'Crysis',
    minimum: { cpuScore: 30, gpuScore: 28, ram: 1, storage: 12, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 35, ram: 2, storage: 12, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 55, ram: 4, storage: 12, requiresSSD: true }
  },
  
  '7670': { // BioShock
    name: 'BioShock',
    minimum: { cpuScore: 28, gpuScore: 18, ram: 1, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '440': { // Team Fortress 2
    name: 'Team Fortress 2',
    minimum: { cpuScore: 20, gpuScore: 15, ram: 0.5, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 20, ram: 1, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 40, gpuScore: 35, ram: 2, storage: 15, requiresSSD: false }
  },
  
  '400': { // Portal
    name: 'Portal',
    minimum: { cpuScore: 20, gpuScore: 15, ram: 0.5, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 20, ram: 1, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 45, gpuScore: 30, ram: 2, storage: 3, requiresSSD: false }
  },
  
  '17460': { // Mass Effect
    name: 'Mass Effect',
    minimum: { cpuScore: 28, gpuScore: 18, ram: 1, storage: 14, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 14, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 14, requiresSSD: false }
  },
  
  '3900': { // Sid Meier's Civilization IV
    name: "Sid Meier's Civilization IV",
    minimum: { cpuScore: 20, gpuScore: 15, ram: 0.5, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 45, gpuScore: 35, ram: 2, storage: 2, requiresSSD: false }
  },
  
  // === 2008-2010 ERA ===
  '12210': { // Grand Theft Auto IV
    name: 'Grand Theft Auto IV',
    minimum: { cpuScore: 22, gpuScore: 25, ram: 1.5, storage: 16, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 30, ram: 2.5, storage: 16, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 16, requiresSSD: false }
  },
  
  '47810': { // Dead Space
    name: 'Dead Space',
    minimum: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 38, gpuScore: 30, ram: 2, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 40, ram: 4, storage: 7, requiresSSD: false }
  },
  
  '550': { // Left 4 Dead 2
    name: 'Left 4 Dead 2',
    minimum: { cpuScore: 35, gpuScore: 18, ram: 2, storage: 13, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 13, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 40, ram: 4, storage: 13, requiresSSD: false }
  },
  
  '17410': { // Mirror's Edge
    name: "Mirror's Edge",
    minimum: { cpuScore: 35, gpuScore: 25, ram: 1, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '22300': { // Fallout 3
    name: 'Fallout 3',
    minimum: { cpuScore: 28, gpuScore: 25, ram: 1, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 7, requiresSSD: false }
  },
  
  '500': { // Left 4 Dead
    name: 'Left 4 Dead',
    minimum: { cpuScore: 35, gpuScore: 18, ram: 1, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 40, ram: 4, storage: 7, requiresSSD: false }
  },
  
  '19900': { // Far Cry 2
    name: 'Far Cry 2',
    minimum: { cpuScore: 38, gpuScore: 25, ram: 1, storage: 12, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 12, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 12, requiresSSD: false }
  },
  
  '17390': { // Spore
    name: 'Spore',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 0.5, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 45, gpuScore: 35, ram: 2, storage: 4, requiresSSD: false }
  },
  
  '10090': { // Call of Duty: World at War
    name: 'Call of Duty: World at War',
    minimum: { cpuScore: 35, gpuScore: 25, ram: 0.5, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '17330': { // Crysis Warhead
    name: 'Crysis Warhead',
    minimum: { cpuScore: 30, gpuScore: 28, ram: 1, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 35, ram: 2, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 55, ram: 4, storage: 15, requiresSSD: true }
  },
  
  '17480': { // Command & Conquer: Red Alert 3
    name: 'Command & Conquer: Red Alert 3',
    minimum: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 10, requiresSSD: false }
  },
  
  '24740': { // Burnout Paradise
    name: 'Burnout Paradise',
    minimum: { cpuScore: 30, gpuScore: 18, ram: 1, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 40, ram: 4, storage: 4, requiresSSD: false }
  },
  
  '204880': { // Sins of a Solar Empire
    name: 'Sins of a Solar Empire',
    minimum: { cpuScore: 22, gpuScore: 18, ram: 0.5, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 45, gpuScore: 35, ram: 2, storage: 3, requiresSSD: false }
  },
  
  '20510': { // S.T.A.L.K.E.R.: Clear Sky
    name: 'S.T.A.L.K.E.R.: Clear Sky',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 0.5, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 10, requiresSSD: false }
  },
  
  '48700': { // Mount & Blade
    name: 'Mount & Blade',
    minimum: { cpuScore: 20, gpuScore: 18, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 25, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 45, gpuScore: 35, ram: 2, storage: 1, requiresSSD: false }
  },
  
  '45700': { // Devil May Cry 4
    name: 'Devil May Cry 4',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 0.5, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 1, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 2, storage: 8, requiresSSD: false }
  },
  
  '17550': { // Prince of Persia (2008)
    name: 'Prince of Persia',
    minimum: { cpuScore: 40, gpuScore: 25, ram: 1, storage: 9, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 9, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 9, requiresSSD: false }
  },
  
  '12750': { // GRID
    name: 'Race Driver: GRID',
    minimum: { cpuScore: 35, gpuScore: 25, ram: 1, storage: 12, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 12, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 12, requiresSSD: false }
  },
  
  '15120': { // Tom Clancy's Rainbow Six Vegas 2
    name: "Tom Clancy's Rainbow Six Vegas 2",
    minimum: { cpuScore: 35, gpuScore: 18, ram: 1, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 40, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '12200': { // Bully: Scholarship Edition
    name: 'Bully: Scholarship Edition',
    minimum: { cpuScore: 35, gpuScore: 18, ram: 1, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 40, ram: 4, storage: 4, requiresSSD: false }
  },
  
  '15160': { // Brothers in Arms: Hell's Highway
    name: "Brothers in Arms: Hell's Highway",
    minimum: { cpuScore: 30, gpuScore: 18, ram: 1, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 10, requiresSSD: false }
  },
  
  '9450': { // Warhammer 40,000: Dawn of War - Soulstorm
    name: 'Warhammer 40,000: Dawn of War - Soulstorm',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 0.5, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 18, ram: 1, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 45, gpuScore: 30, ram: 2, storage: 5, requiresSSD: false }
  },
  
  '2820': { // X3: Terran Conflict
    name: 'X3: Terran Conflict',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 6, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 3, storage: 6, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 6, requiresSSD: false }
  },
  
  '8140': { // Tomb Raider: Underworld
    name: 'Tomb Raider: Underworld',
    minimum: { cpuScore: 35, gpuScore: 18, ram: 1, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '22000': { // World of Goo
    name: 'World of Goo',
    minimum: { cpuScore: 15, gpuScore: 15, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 20, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 35, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false }
  },
  
  '12270': { // Audiosurf
    name: 'Audiosurf',
    minimum: { cpuScore: 15, gpuScore: 15, ram: 0.25, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 20, gpuScore: 18, ram: 0.5, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 1, requiresSSD: false }
  },
  
  '225640': { // Sacred 2: Fallen Angel
    name: 'Sacred 2: Fallen Angel',
    minimum: { cpuScore: 28, gpuScore: 25, ram: 1, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 20, requiresSSD: false }
  },
  
  '26800': { // Braid
    name: 'Braid',
    minimum: { cpuScore: 18, gpuScore: 15, ram: 0.75, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 35, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false }
  },
  
  // === 2009 GAMES ===
  '10180': { // Call of Duty: Modern Warfare 2
    name: 'Call of Duty: Modern Warfare 2',
    minimum: { cpuScore: 38, gpuScore: 25, ram: 1, storage: 12, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 12, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 12, requiresSSD: false }
  },
  
  '57690': { // Batman: Arkham Asylum
    name: 'Batman: Arkham Asylum',
    minimum: { cpuScore: 35, gpuScore: 25, ram: 1, storage: 9, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 9, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 9, requiresSSD: false }
  },
  
  '15100': { // Assassin's Creed II
    name: "Assassin's Creed II",
    minimum: { cpuScore: 22, gpuScore: 25, ram: 1.5, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '8980': { // Borderlands
    name: 'Borderlands',
    minimum: { cpuScore: 28, gpuScore: 25, ram: 1, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '21690': { // Resident Evil 5
    name: 'Resident Evil 5',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '21660': { // Street Fighter IV
    name: 'Street Fighter IV',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 10, requiresSSD: false }
  },
  
  '47890': { // The Sims 3
    name: 'The Sims 3',
    minimum: { cpuScore: 28, gpuScore: 18, ram: 1, storage: 6, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 6, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 40, ram: 4, storage: 6, requiresSSD: false }
  },
  
  '10520': { // Empire: Total War
    name: 'Empire: Total War',
    minimum: { cpuScore: 28, gpuScore: 25, ram: 1, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 15, requiresSSD: false }
  },
  
  '15620': { // Warhammer 40,000: Dawn of War II
    name: 'Warhammer 40,000: Dawn of War II',
    minimum: { cpuScore: 38, gpuScore: 18, ram: 1, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 40, ram: 4, storage: 5, requiresSSD: false }
  },
  
  '3590': { // Plants vs. Zombies
    name: 'Plants vs. Zombies',
    minimum: { cpuScore: 18, gpuScore: 15, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 20, gpuScore: 15, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 35, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false }
  },
  
  '32430': { // Star Wars: The Force Unleashed
    name: 'Star Wars: The Force Unleashed',
    minimum: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 4, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 8, storage: 30, requiresSSD: false }
  },
  
  '40300': { // Risen
    name: 'Risen',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 30, ram: 2, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 5, requiresSSD: false }
  },
  
  '33930': { // ARMA 2
    name: 'ARMA 2',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 42, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 50, ram: 4, storage: 10, requiresSSD: false }
  },
  
  '10150': { // Prototype
    name: 'Prototype',
    minimum: { cpuScore: 22, gpuScore: 25, ram: 1, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '9480': { // Saints Row 2
    name: 'Saints Row 2',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 1, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 38, gpuScore: 25, ram: 2, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 40, ram: 4, storage: 15, requiresSSD: false }
  },
  
  '16450': { // F.E.A.R. 2: Project Origin
    name: 'F.E.A.R. 2: Project Origin',
    minimum: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 12, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 30, ram: 1.5, storage: 12, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 12, requiresSSD: false }
  },
  
  '40700': { // Machinarium
    name: 'Machinarium',
    minimum: { cpuScore: 22, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 40, gpuScore: 35, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '41500': { // Torchlight
    name: 'Torchlight',
    minimum: { cpuScore: 15, gpuScore: 18, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 20, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 35, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false }
  },
  
  '1250': { // Killing Floor
    name: 'Killing Floor',
    minimum: { cpuScore: 18, gpuScore: 18, ram: 0.5, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 18, ram: 1, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 45, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false }
  },
  
  '41070': { // Serious Sam HD: The First Encounter
    name: 'Serious Sam HD: The First Encounter',
    minimum: { cpuScore: 35, gpuScore: 25, ram: 1, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 4, requiresSSD: false }
  },
  
  '20500': { // Red Faction: Guerrilla
    name: 'Red Faction: Guerrilla',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 1, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 38, gpuScore: 25, ram: 2, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 40, ram: 4, storage: 5, requiresSSD: false }
  },
  
  '12840': { // DiRT 2
    name: 'DiRT 2',
    minimum: { cpuScore: 35, gpuScore: 25, ram: 1, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '24870': { // Need for Speed: Shift
    name: 'Need for Speed: Shift',
    minimum: { cpuScore: 20, gpuScore: 25, ram: 1, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 30, ram: 2, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 7, requiresSSD: false }
  },
  
  '23490': { // Tropico 3
    name: 'Tropico 3',
    minimum: { cpuScore: 28, gpuScore: 25, ram: 1, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 5, requiresSSD: false }
  },
  
  '21670': { // Bionic Commando
    name: 'Bionic Commando',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 1.5, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 4, storage: 10, requiresSSD: false }
  },
  
  '17630': { // Wolfenstein (2009)
    name: 'Wolfenstein',
    minimum: { cpuScore: 38, gpuScore: 25, ram: 1, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '33900': { // Anno 1404
    name: 'Anno 1404',
    minimum: { cpuScore: 35, gpuScore: 18, ram: 1, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 5, requiresSSD: false }
  },
  
  '35720': { // Trine
    name: 'Trine',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 25, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 40, ram: 2, storage: 1, requiresSSD: false }
  },
  
  '17450': { // Dragon Age: Origins
    name: 'Dragon Age: Origins',
    minimum: { cpuScore: 22, gpuScore: 25, ram: 1.5, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 30, ram: 4, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 8, storage: 20, requiresSSD: false }
  },
  
  '24200': { // Mass Effect 2
    name: 'Mass Effect 2',
    minimum: { cpuScore: 22, gpuScore: 28, ram: 1, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 35, ram: 2, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 50, ram: 4, storage: 15, requiresSSD: false }
  },
  
  '22380': { // Fallout: New Vegas
    name: 'Fallout: New Vegas',
    minimum: { cpuScore: 25, gpuScore: 20, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 45, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 55, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '10500': { // StarCraft II
    name: 'StarCraft II: Wings of Liberty',
    minimum: { cpuScore: 30, gpuScore: 18, ram: 2, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 45, ram: 4, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 30, requiresSSD: false }
  },
  
  '8930': { // Civilization V
    name: 'Civilization V',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 4, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 8, storage: 8, requiresSSD: false }
  },
  
  // === 2010 GAMES ===
  '24980': { // Battlefield: Bad Company 2
    name: 'Battlefield: Bad Company 2',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 2, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 4, storage: 15, requiresSSD: false }
  },
  
  '42700': { // Call of Duty: Black Ops
    name: 'Call of Duty: Black Ops',
    minimum: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 12, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 4, storage: 12, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 8, storage: 12, requiresSSD: false }
  },
  
  '8850': { // BioShock 2
    name: 'BioShock 2',
    minimum: { cpuScore: 35, gpuScore: 25, ram: 2, storage: 11, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 30, ram: 3, storage: 11, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 6, storage: 11, requiresSSD: false }
  },
  
  '48190': { // Assassin's Creed: Brotherhood
    name: "Assassin's Creed: Brotherhood",
    minimum: { cpuScore: 22, gpuScore: 25, ram: 1.5, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '50130': { // Mafia II
    name: 'Mafia II',
    minimum: { cpuScore: 35, gpuScore: 25, ram: 1.5, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 48, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 10, requiresSSD: false }
  },
  
  '6990': { // Just Cause 2
    name: 'Just Cause 2',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 3, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 6, storage: 10, requiresSSD: false }
  },
  
  '43110': { // Metro 2033
    name: 'Metro 2033',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 48, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 4, storage: 10, requiresSSD: true }
  },
  
  '108710': { // Alan Wake
    name: 'Alan Wake',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 55, ram: 4, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 8, requiresSSD: false }
  },
  
  '41700': { // S.T.A.L.K.E.R.: Call of Pripyat
    name: 'S.T.A.L.K.E.R.: Call of Pripyat',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 0.75, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 10, requiresSSD: false }
  },
  
  '57300': { // Amnesia: The Dark Descent
    name: 'Amnesia: The Dark Descent',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 35, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 50, ram: 8, requiresSSD: false }
  },
  
  '47790': { // Medal of Honor (2010)
    name: 'Medal of Honor',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 13, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 4, storage: 13, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 8, storage: 13, requiresSSD: false }
  },
  
  '45740': { // Dead Rising 2
    name: 'Dead Rising 2',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 8, requiresSSD: false }
  },
  
  '34030': { // Napoleon: Total War
    name: 'Napoleon: Total War',
    minimum: { cpuScore: 28, gpuScore: 25, ram: 1, storage: 21, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 21, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 21, requiresSSD: false }
  },
  
  '48720': { // Mount & Blade: Warband
    name: 'Mount & Blade: Warband',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 45, gpuScore: 35, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '40800': { // Super Meat Boy
    name: 'Super Meat Boy',
    minimum: { cpuScore: 18, gpuScore: 15, ram: 0.25, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 20, gpuScore: 18, ram: 0.5, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 35, gpuScore: 25, ram: 1, storage: 1, requiresSSD: false }
  },
  
  '48000': { // Limbo
    name: 'Limbo',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false }
  },
  
  '50620': { // Darksiders
    name: 'Darksiders',
    minimum: { cpuScore: 35, gpuScore: 25, ram: 1, storage: 12, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 12, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 12, requiresSSD: false }
  },
  
  '42670': { // Singularity
    name: 'Singularity',
    minimum: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '33229': { // Tom Clancy's Splinter Cell: Conviction
    name: "Tom Clancy's Splinter Cell: Conviction",
    minimum: { cpuScore: 22, gpuScore: 25, ram: 1.5, storage: 11, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 11, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 11, requiresSSD: false }
  },
  
  '28000': { // Kane & Lynch 2: Dog Days
    name: 'Kane & Lynch 2: Dog Days',
    minimum: { cpuScore: 35, gpuScore: 30, ram: 1, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 10, requiresSSD: false }
  },
  
  '45750': { // Lost Planet 2
    name: 'Lost Planet 2',
    minimum: { cpuScore: 40, gpuScore: 25, ram: 1, storage: 9, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 2, storage: 9, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 4, storage: 9, requiresSSD: false }
  },
  
  '34830': { // Sniper: Ghost Warrior
    name: 'Sniper: Ghost Warrior',
    minimum: { cpuScore: 38, gpuScore: 25, ram: 1, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 7, requiresSSD: false }
  },
  
  '460950': { // Vanquish
    name: 'Vanquish',
    minimum: { cpuScore: 50, gpuScore: 55, ram: 4, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 20, requiresSSD: true }
  },
  
  '34010': { // Alpha Protocol
    name: 'Alpha Protocol',
    minimum: { cpuScore: 28, gpuScore: 25, ram: 1, storage: 12, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 12, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 12, requiresSSD: false }
  },
  
  '40100': { // Supreme Commander 2
    name: 'Supreme Commander 2',
    minimum: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 10, requiresSSD: false }
  },
  
  '47870': { // Need for Speed: Hot Pursuit
    name: 'Need for Speed: Hot Pursuit',
    minimum: { cpuScore: 22, gpuScore: 25, ram: 1.5, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '42640': { // Blur
    name: 'Blur',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '297860': { // Split/Second
    name: 'Split/Second',
    minimum: { cpuScore: 35, gpuScore: 25, ram: 2, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '35450': { // Transformers: War for Cybertron
    name: 'Transformers: War for Cybertron',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 9, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 9, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 9, requiresSSD: false }
  },
  
  '70300': { // VVVVVV
    name: 'VVVVVV',
    minimum: { cpuScore: 25, gpuScore: 15, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false }
  },
  
  '70400': { // Recettear: An Item Shop's Tale
    name: "Recettear: An Item Shop's Tale",
    minimum: { cpuScore: 20, gpuScore: 18, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false }
  },
  
  '42910': { // Magicka
    name: 'Magicka',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '63200': { // Monday Night Combat
    name: 'Monday Night Combat',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 2, requiresSSD: false }
  },
  
  '407200': { // World of Tanks (placeholder)
    name: 'World of Tanks',
    minimum: { cpuScore: 30, gpuScore: 25, ram: 1.5, storage: 40, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 40, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 40, requiresSSD: false }
  },
  
  '35130': { // Lara Croft and the Guardian of Light
    name: 'Lara Croft and the Guardian of Light',
    minimum: { cpuScore: 35, gpuScore: 25, ram: 1, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  // === 2011-2012 ERA ===
  '72850': { // The Elder Scrolls V: Skyrim
    name: 'The Elder Scrolls V: Skyrim',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 6, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 45, ram: 4, storage: 6, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 6, requiresSSD: false }
  },
  
  '620': { // Portal 2
    name: 'Portal 2',
    minimum: { cpuScore: 35, gpuScore: 18, ram: 2, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 8, storage: 8, requiresSSD: false }
  },
  
  '1238810': { // Battlefield 3
    name: 'Battlefield 3',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 62, ram: 4, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 20, requiresSSD: true }
  },
  
  '47730': { // Dead Space 2
    name: 'Dead Space 2',
    minimum: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 10, requiresSSD: false }
  },
  
  '110800': { // L.A. Noire
    name: 'L.A. Noire',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 16, requiresSSD: false },
    recommended: { cpuScore: 38, gpuScore: 62, ram: 8, storage: 16, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 70, ram: 16, storage: 16, requiresSSD: true }
  },
  
  '55230': { // Saints Row: The Third
    name: 'Saints Row: The Third',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '107100': { // Bastion
    name: 'Bastion',
    minimum: { cpuScore: 22, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '108800': { // Crysis 2
    name: 'Crysis 2',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 9, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 62, ram: 4, storage: 9, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 9, requiresSSD: true }
  },
  
  '42680': { // Call of Duty: Modern Warfare 3
    name: 'Call of Duty: Modern Warfare 3',
    minimum: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 16, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 16, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 16, requiresSSD: false }
  },
  
  '34330': { // Total War: Shogun 2
    name: 'Total War: Shogun 2',
    minimum: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 30, ram: 2, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 45, ram: 4, storage: 20, requiresSSD: false }
  },
  
  '47900': { // Dragon Age II
    name: 'Dragon Age II',
    minimum: { cpuScore: 22, gpuScore: 25, ram: 1.5, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 55, ram: 4, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 7, requiresSSD: false }
  },
  
  '91310': { // Dead Island
    name: 'Dead Island',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 1, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 4, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 7, requiresSSD: false }
  },
  
  '24240': { // PAYDAY: The Heist
    name: 'PAYDAY: The Heist',
    minimum: { cpuScore: 35, gpuScore: 25, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '102600': { // Orcs Must Die!
    name: 'Orcs Must Die!',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 30, ram: 4, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 8, storage: 4, requiresSSD: false }
  },
  
  '206440': { // To the Moon
    name: 'To the Moon',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false }
  },
  
  '1286830': { // Star Wars: The Old Republic (placeholder)
    name: 'Star Wars: The Old Republic',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 55, ram: 4, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 65, ram: 8, storage: 50, requiresSSD: false }
  },
  
  '99810': { // Bulletstorm
    name: 'Bulletstorm',
    minimum: { cpuScore: 20, gpuScore: 25, ram: 1.5, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '39160': { // Dungeon Siege III
    name: 'Dungeon Siege III',
    minimum: { cpuScore: 35, gpuScore: 30, ram: 2, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 48, ram: 4, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 60, ram: 8, storage: 4, requiresSSD: false }
  },
  
  '21100': { // F.E.A.R. 3
    name: 'F.E.A.R. 3',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 42, gpuScore: 55, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '9200': { // Rage
    name: 'Rage',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 4, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 45, ram: 8, storage: 25, requiresSSD: false }
  },
  
  '35470': { // Red Orchestra 2
    name: 'Red Orchestra 2: Heroes of Stalingrad',
    minimum: { cpuScore: 28, gpuScore: 25, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '41300': { // Serious Sam 3: BFE
    name: 'Serious Sam 3: BFE',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 4, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 4, requiresSSD: false }
  },
  
  '71340': { // Sonic Generations
    name: 'Sonic Generations',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 11, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 55, ram: 3, storage: 11, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 6, storage: 11, requiresSSD: false }
  },
  
  '45760': { // Super Street Fighter IV: Arcade Edition
    name: 'Super Street Fighter IV: Arcade Edition',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 42, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 4, storage: 10, requiresSSD: false }
  },
  
  '35700': { // Trine 2
    name: 'Trine 2',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 2, requiresSSD: false }
  },
  
  '57600': { // Tropico 4
    name: 'Tropico 4',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 8, storage: 5, requiresSSD: false }
  },
  
  '55150': { // Warhammer 40,000: Space Marine
    name: 'Warhammer 40,000: Space Marine',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 2, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 45, ram: 4, storage: 20, requiresSSD: false }
  },
  
  '19200': { // Alice: Madness Returns
    name: 'Alice: Madness Returns',
    minimum: { cpuScore: 20, gpuScore: 25, ram: 2, storage: 9, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 9, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 8, storage: 9, requiresSSD: false }
  },
  
  '113200': { // The Binding of Isaac
    name: 'The Binding of Isaac',
    minimum: { cpuScore: 30, gpuScore: 15, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 35, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '48220': { // Might & Magic Heroes VI
    name: 'Might & Magic Heroes VI',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 1, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 55, ram: 2, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 4, storage: 8, requiresSSD: false }
  },
  
  '65810': { // Dungeon Defenders
    name: 'Dungeon Defenders',
    minimum: { cpuScore: 15, gpuScore: 25, ram: 1, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 2, requiresSSD: false }
  },
  
  '91200': { // Anomaly: Warzone Earth
    name: 'Anomaly: Warzone Earth',
    minimum: { cpuScore: 28, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '91700': { // E.Y.E: Divine Cybermancy
    name: 'E.Y.E: Divine Cybermancy',
    minimum: { cpuScore: 35, gpuScore: 18, ram: 1, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 40, ram: 4, storage: 2, requiresSSD: false }
  },
  
  '98200': { // Frozen Synapse
    name: 'Frozen Synapse',
    minimum: { cpuScore: 15, gpuScore: 18, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 20, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false }
  },
  
  '55100': { // Homefront
    name: 'Homefront',
    minimum: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 45, ram: 4, storage: 10, requiresSSD: false }
  },
  
  '98400': { // Hard Reset
    name: 'Hard Reset',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 5, requiresSSD: false }
  },
  
  '33440': { // Driver: San Francisco
    name: 'Driver: San Francisco',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 1, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 55, ram: 2, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 4, storage: 10, requiresSSD: false }
  },
  
  '105600': { // Terraria
    name: 'Terraria',
    minimum: { cpuScore: 20, gpuScore: 18, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 25, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 40, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '28050': { // Deus Ex: Human Revolution
    name: 'Deus Ex: Human Revolution',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 17, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 45, ram: 2, storage: 17, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 17, requiresSSD: false }
  },
  
  '20540': { // The Witcher 2
    name: 'The Witcher 2: Assassins of Kings',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 45, ram: 4, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 25, requiresSSD: true }
  },
  
  '200510': { // Batman: Arkham City
    name: 'Batman: Arkham City',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 17, requiresSSD: false },
    recommended: { cpuScore: 50, gpuScore: 48, ram: 4, storage: 17, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 17, requiresSSD: false }
  },
  
  '19680': { // Far Cry 3
    name: 'Far Cry 3',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 48, ram: 4, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 15, requiresSSD: false }
  },
  
  // === 2012 GAMES ===
  '8190': { // Mass Effect 3
    name: 'Mass Effect 3',
    minimum: { cpuScore: 22, gpuScore: 25, ram: 1, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 48, ram: 2, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 15, requiresSSD: false }
  },
  
  '204100': { // Max Payne 3
    name: 'Max Payne 3',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 35, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 35, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 80, ram: 32, storage: 35, requiresSSD: true }
  },
  
  '208480': { // Assassin's Creed III
    name: "Assassin's Creed III",
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 17, requiresSSD: false },
    recommended: { cpuScore: 42, gpuScore: 62, ram: 4, storage: 17, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 17, requiresSSD: false }
  },
  
  '1284210': { // Guild Wars 2 (placeholder)
    name: 'Guild Wars 2',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 4, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 50, requiresSSD: false }
  },
  
  '219150': { // The Walking Dead
    name: 'The Walking Dead',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 3, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 55, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 65, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '203140': { // Hitman: Absolution
    name: 'Hitman: Absolution',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 26, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 48, ram: 4, storage: 26, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 26, requiresSSD: false }
  },
  
  '50300': { // Spec Ops: The Line
    name: 'Spec Ops: The Line',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 60, ram: 3, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 6, storage: 10, requiresSSD: false }
  },
  
  '202970': { // Call of Duty: Black Ops II
    name: 'Call of Duty: Black Ops II',
    minimum: { cpuScore: 42, gpuScore: 30, ram: 2, storage: 16, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 60, ram: 4, storage: 16, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 16, requiresSSD: false }
  },
  
  '219890': { // Faster Than Light
    name: 'FTL: Faster Than Light',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 45, gpuScore: 35, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '218230': { // PlanetSide 2
    name: 'PlanetSide 2',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 8, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 20, requiresSSD: true }
  },
  
  '50650': { // Darksiders II
    name: 'Darksiders II',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 48, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '200710': { // Torchlight II
    name: 'Torchlight II',
    minimum: { cpuScore: 18, gpuScore: 25, ram: 1, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 2, requiresSSD: false }
  },
  
  '221100': { // DayZ (placeholder for mod)
    name: 'DayZ',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 16, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 48, ram: 4, storage: 16, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 16, requiresSSD: true }
  },
  
  '203350': { // Binary Domain
    name: 'Binary Domain',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 3, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 6, storage: 8, requiresSSD: false }
  },
  
  '219740': { // Need for Speed: Most Wanted (2012)
    name: 'Need for Speed: Most Wanted',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 62, ram: 4, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 20, requiresSSD: false }
  },
  
  '220160': { // Trials Evolution: Gold Edition
    name: 'Trials Evolution: Gold Edition',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 60, ram: 4, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 4, requiresSSD: false }
  },
  
  '219640': { // Chivalry: Medieval Warfare
    name: 'Chivalry: Medieval Warfare',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 60, ram: 4, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 7, requiresSSD: false }
  },
  
  '215470': { // Primal Carnage
    name: 'Primal Carnage',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 60, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '207170': { // Legend of Grimrock
    name: 'Legend of Grimrock',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '42160': { // War of the Roses
    name: 'War of the Roses',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 4, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 60, ram: 4, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 7, requiresSSD: false }
  },
  
  '227300': { // Euro Truck Simulator 2
    name: 'Euro Truck Simulator 2',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 4, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 68, ram: 6, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 75, ram: 12, storage: 3, requiresSSD: false }
  },
  
  '208140': { // Endless Space
    name: 'Endless Space',
    minimum: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 30, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 45, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '203770': { // Crusader Kings II
    name: 'Crusader Kings II',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '203810': { // Dear Esther
    name: 'Dear Esther',
    minimum: { cpuScore: 35, gpuScore: 18, ram: 1, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 40, ram: 4, storage: 2, requiresSSD: false }
  },
  
  '4920': { // Natural Selection 2
    name: 'Natural Selection 2',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 62, ram: 4, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 5, requiresSSD: false }
  },
  
  '214560': { // Mark of the Ninja
    name: 'Mark of the Ninja',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '236090': { // Dust: An Elysian Tail
    name: 'Dust: An Elysian Tail',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 38, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '223510': { // Miasmata
    name: 'Miasmata',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '207690': { // Botanicula
    name: 'Botanicula',
    minimum: { cpuScore: 22, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 45, gpuScore: 35, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '102500': { // Kingdoms of Amalur: Reckoning
    name: 'Kingdoms of Amalur: Reckoning',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 48, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '63380': { // Sniper Elite V2
    name: 'Sniper Elite V2',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 45, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '204890': { // Sins of a Solar Empire: Rebellion
    name: 'Sins of a Solar Empire: Rebellion',
    minimum: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 4, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 5, requiresSSD: false }
  },
  
  '47780': { // Medal of Honor: Warfighter
    name: 'Medal of Honor: Warfighter',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 62, ram: 4, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 20, requiresSSD: false }
  },
  
  '214250': { // I Am Alive
    name: 'I Am Alive',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 55, ram: 3, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 6, storage: 3, requiresSSD: false }
  },
  
  '200910': { // Resonance
    name: 'Resonance',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false }
  },
  
  '239350': { // Spelunky
    name: 'Spelunky',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 50, gpuScore: 30, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 45, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '214340': { // Deponia
    name: 'Deponia',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '207040': { // Sine Mora
    name: 'Sine Mora',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 2, requiresSSD: false }
  },
  
  '49520': { // Borderlands 2
    name: 'Borderlands 2',
    minimum: { cpuScore: 28, gpuScore: 25, ram: 2, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 38, ram: 2, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 55, ram: 4, storage: 20, requiresSSD: false }
  },
  
  '205100': { // Dishonored
    name: 'Dishonored',
    minimum: { cpuScore: 35, gpuScore: 30, ram: 3, storage: 9, requiresSSD: false },
    recommended: { cpuScore: 50, gpuScore: 48, ram: 4, storage: 9, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 9, requiresSSD: false }
  },
  
  '200260': { // Sleeping Dogs
    name: 'Sleeping Dogs',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 48, ram: 4, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 20, requiresSSD: false }
  },
  
  '211420': { // Dark Souls: Prepare to Die Edition
    name: 'Dark Souls: Prepare to Die Edition',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 48, ram: 4, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 4, requiresSSD: false }
  },
  
  '65800': { // Diablo III (placeholder)
    name: 'Diablo III',
    minimum: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 45, ram: 2, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 25, requiresSSD: false }
  },
  
  '65730': { // XCOM: Enemy Unknown
    name: 'XCOM: Enemy Unknown',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 30, ram: 4, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 8, storage: 20, requiresSSD: false }
  },
  
  '219990': { // Hotline Miami
    name: 'Hotline Miami',
    minimum: { cpuScore: 18, gpuScore: 15, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 20, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 35, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false }
  },
  
  // === 2013-2014 ERA ===
  '8870': { // BioShock Infinite
    name: 'BioShock Infinite',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 48, ram: 4, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 30, requiresSSD: false }
  },
  
  '203160': { // Tomb Raider (2013)
    name: 'Tomb Raider',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 1, storage: 17, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 48, ram: 4, storage: 17, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 17, requiresSSD: false }
  },
  
  '218620': { // Payday 2
    name: 'Payday 2',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 31, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 25, ram: 8, storage: 31, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 40, ram: 16, storage: 31, requiresSSD: false }
  },
  
  '250320': { // The Wolf Among Us
    name: 'The Wolf Among Us',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 3, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 25, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 40, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '238960': { // Papers, Please
    name: 'Papers, Please',
    minimum: { cpuScore: 22, gpuScore: 20, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 40, gpuScore: 40, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '42960': { // Battlefield 4
    name: 'Battlefield 4',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 55, gpuScore: 60, ram: 8, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 30, requiresSSD: true }
  },
  
  '242050': { // Assassin's Creed IV: Black Flag
    name: "Assassin's Creed IV: Black Flag",
    minimum: { cpuScore: 45, gpuScore: 30, ram: 2, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 30, requiresSSD: false }
  },
  
  '286690': { // Metro: Last Light
    name: 'Metro: Last Light',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 62, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 8, storage: 10, requiresSSD: true }
  },
  
  '206420': { // Saints Row IV
    name: 'Saints Row IV',
    minimum: { cpuScore: 45, gpuScore: 48, ram: 4, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '107410': { // Arma 3
    name: 'Arma 3',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 32, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 4, storage: 32, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 32, requiresSSD: true }
  },
  
  '220440': { // Crysis 3
    name: 'Crysis 3',
    minimum: { cpuScore: 25, gpuScore: 55, ram: 2, storage: 17, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 62, ram: 4, storage: 17, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 8, storage: 17, requiresSSD: true }
  },
  
  '252490': { // Rust
    name: 'Rust',
    minimum: { cpuScore: 25, gpuScore: 70, ram: 8, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 75, ram: 16, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 80, ram: 32, storage: 20, requiresSSD: true }
  },
  
  '232430': { // Gone Home
    name: 'Gone Home',
    minimum: { cpuScore: 22, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '214950': { // Total War: Rome II
    name: 'Total War: Rome II',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 35, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 55, ram: 4, storage: 35, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 35, requiresSSD: true }
  },
  
  '47770': { // Dead Space 3
    name: 'Dead Space 3',
    minimum: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 4, storage: 15, requiresSSD: false }
  },
  
  '238320': { // Outlast
    name: 'Outlast',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 60, ram: 3, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 70, ram: 6, storage: 5, requiresSSD: false }
  },
  
  '236390': { // StarCraft II: Heart of the Swarm
    name: 'StarCraft II: Heart of the Swarm',
    minimum: { cpuScore: 30, gpuScore: 18, ram: 1.5, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 45, ram: 4, storage: 30, requiresSSD: false }
  },
  
  '236850': { // Europa Universalis IV
    name: 'Europa Universalis IV',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '238650': { // Path of Exile
    name: 'Path of Exile',
    minimum: { cpuScore: 30, gpuScore: 60, ram: 4, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 20, requiresSSD: true }
  },
  
  '241600': { // Rogue Legacy
    name: 'Rogue Legacy',
    minimum: { cpuScore: 20, gpuScore: 25, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '219750': { // Don't Starve
    name: "Don't Starve",
    minimum: { cpuScore: 22, gpuScore: 25, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '233130': { // Shadow Warrior (2013)
    name: 'Shadow Warrior',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 13, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 13, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 13, requiresSSD: false }
  },
  
  '235600': { // Splinter Cell: Blacklist
    name: "Tom Clancy's Splinter Cell: Blacklist",
    minimum: { cpuScore: 35, gpuScore: 30, ram: 2, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 42, gpuScore: 60, ram: 4, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 25, requiresSSD: false }
  },
  
  '235460': { // Metal Gear Rising: Revengeance
    name: 'Metal Gear Rising: Revengeance',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 60, ram: 4, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 70, ram: 8, storage: 25, requiresSSD: false }
  },
  
  '220240': { // Devil May Cry
    name: 'DmC: Devil May Cry',
    minimum: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 9, requiresSSD: false },
    recommended: { cpuScore: 42, gpuScore: 60, ram: 4, storage: 9, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 9, requiresSSD: false }
  },
  
  '241540': { // State of Decay
    name: 'State of Decay',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '24780': { // SimCity (2013)
    name: 'SimCity',
    minimum: { cpuScore: 28, gpuScore: 25, ram: 2, storage: 12, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 4, storage: 12, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 45, ram: 8, storage: 12, requiresSSD: false }
  },
  
  '204450': { // Call of Juarez: Gunslinger
    name: 'Call of Juarez: Gunslinger',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 60, ram: 4, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 7, requiresSSD: false }
  },
  
  '219900': { // Grim Dawn
    name: 'Grim Dawn',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 4, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 5, requiresSSD: false }
  },
  
  '237630': { // DuckTales: Remastered
    name: 'DuckTales: Remastered',
    minimum: { cpuScore: 40, gpuScore: 25, ram: 1, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 4, storage: 2, requiresSSD: false }
  },
  
  '231430': { // Company of Heroes 2
    name: 'Company of Heroes 2',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 60, ram: 4, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 8, storage: 30, requiresSSD: false }
  },
  
  '242700': { // Injustice: Gods Among Us
    name: 'Injustice: Gods Among Us Ultimate Edition',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 21, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 4, storage: 21, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 21, requiresSSD: false }
  },
  
  '219850': { // Antichamber
    name: 'Antichamber',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 30, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '231200': { // Kentucky Route Zero
    name: 'Kentucky Route Zero',
    minimum: { cpuScore: 15, gpuScore: 18, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 45, gpuScore: 35, ram: 2, storage: 1, requiresSSD: false }
  },
  
  '242550': { // Rayman Legends
    name: 'Rayman Legends',
    minimum: { cpuScore: 35, gpuScore: 25, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '39210': { // Final Fantasy XIV: A Realm Reborn
    name: 'Final Fantasy XIV: A Realm Reborn',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 60, requiresSSD: true }
  },
  
  '248820': { // Risk of Rain
    name: 'Risk of Rain',
    minimum: { cpuScore: 30, gpuScore: 25, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '108600': { // Project Zomboid
    name: 'Project Zomboid',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 3, requiresSSD: false }
  },
  
  '225080': { // Brothers: A Tale of Two Sons
    name: 'Brothers: A Tale of Two Sons',
    minimum: { cpuScore: 28, gpuScore: 25, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 30, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '234650': { // Shadowrun Returns
    name: 'Shadowrun Returns',
    minimum: { cpuScore: 18, gpuScore: 25, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '209000': { // Batman: Arkham Origins
    name: 'Batman: Arkham Origins',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 4, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 20, requiresSSD: false }
  },
  
  '214770': { // Guacamelee! Gold Edition
    name: 'Guacamelee! Gold Edition',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 30, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 2, storage: 1, requiresSSD: false }
  },
  
  '233720': { // Surgeon Simulator 2013
    name: 'Surgeon Simulator 2013',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '206190': { // Gunpoint
    name: 'Gunpoint',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 35, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '212900': { // Sanctum 2
    name: 'Sanctum 2',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 45, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '222730': { // Reus
    name: 'Reus',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '239070': { // Hammerwatch
    name: 'Hammerwatch',
    minimum: { cpuScore: 20, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 35, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '221910': { // The Stanley Parable
    name: 'The Stanley Parable',
    minimum: { cpuScore: 35, gpuScore: 18, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 45, gpuScore: 45, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '240760': { // Wasteland 2
    name: 'Wasteland 2',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 25, ram: 8, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 40, ram: 16, storage: 30, requiresSSD: false }
  },
  
  // === 2014 GAMES ===
  '1222690': { // Dragon Age: Inquisition
    name: 'Dragon Age: Inquisition',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 26, requiresSSD: false },
    recommended: { cpuScore: 55, gpuScore: 60, ram: 8, storage: 26, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 26, requiresSSD: true }
  },
  
  '241930': { // Middle-earth: Shadow of Mordor
    name: 'Middle-earth: Shadow of Mordor',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 3, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 70, ram: 8, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 25, requiresSSD: true }
  },
  
  '214490': { // Alien: Isolation
    name: 'Alien: Isolation',
    minimum: { cpuScore: 35, gpuScore: 55, ram: 4, storage: 35, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 35, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 35, requiresSSD: true }
  },
  
  '236430': { // Dark Souls II
    name: 'Dark Souls II',
    minimum: { cpuScore: 35, gpuScore: 35, ram: 2, storage: 23, requiresSSD: false },
    recommended: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 23, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 8, storage: 23, requiresSSD: false }
  },
  
  '298110': { // Far Cry 4
    name: 'Far Cry 4',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 30, requiresSSD: true }
  },
  
  '230230': { // Divinity: Original Sin
    name: 'Divinity: Original Sin',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 62, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '243470': { // Watch Dogs
    name: 'Watch Dogs',
    minimum: { cpuScore: 45, gpuScore: 55, ram: 6, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 62, ram: 8, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 25, requiresSSD: true }
  },
  
  '201810': { // Wolfenstein: The New Order
    name: 'Wolfenstein: The New Order',
    minimum: { cpuScore: 65, gpuScore: 60, ram: 4, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 70, ram: 4, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 8, storage: 50, requiresSSD: true }
  },
  
  '213670': { // South Park: The Stick of Truth
    name: 'South Park: The Stick of Truth',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 6, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 55, ram: 4, storage: 6, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 6, requiresSSD: false }
  },
  
  '209650': { // Call of Duty: Advanced Warfare
    name: 'Call of Duty: Advanced Warfare',
    minimum: { cpuScore: 50, gpuScore: 55, ram: 6, storage: 55, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 55, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 55, requiresSSD: true }
  },
  
  '345750': { // Hearthstone (placeholder)
    name: 'Hearthstone',
    minimum: { cpuScore: 20, gpuScore: 30, ram: 3, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 28, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 45, gpuScore: 40, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '1237950': { // Titanfall
    name: 'Titanfall',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 50, requiresSSD: true }
  },
  
  '268810': { // The Evil Within
    name: 'The Evil Within',
    minimum: { cpuScore: 65, gpuScore: 55, ram: 4, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 70, ram: 4, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 8, storage: 50, requiresSSD: true }
  },
  
  '258520': { // The Vanishing of Ethan Carter
    name: 'The Vanishing of Ethan Carter',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 9, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 62, ram: 8, storage: 9, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 16, storage: 9, requiresSSD: false }
  },
  
  '237930': { // Transistor
    name: 'Transistor',
    minimum: { cpuScore: 40, gpuScore: 55, ram: 4, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 60, ram: 8, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 16, storage: 3, requiresSSD: false }
  },
  
  '244210': { // Assetto Corsa
    name: 'Assetto Corsa',
    minimum: { cpuScore: 28, gpuScore: 55, ram: 2, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 60, ram: 6, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 75, ram: 12, storage: 15, requiresSSD: false }
  },
  
  '335670': { // LISA: The Painful
    name: 'LISA',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '250900': { // Shovel Knight
    name: 'Shovel Knight',
    minimum: { cpuScore: 25, gpuScore: 20, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 25, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 40, gpuScore: 35, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '313600': { // Elite Dangerous
    name: 'Elite Dangerous',
    minimum: { cpuScore: 25, gpuScore: 55, ram: 4, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 68, ram: 8, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 8, requiresSSD: true }
  },
  
  '242920': { // Banished
    name: 'Banished',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 55, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 65, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '282070': { // This War of Mine
    name: 'This War of Mine',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 60, ram: 4, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 5, requiresSSD: false }
  },
  
  '257510': { // The Talos Principle
    name: 'The Talos Principle',
    minimum: { cpuScore: 25, gpuScore: 55, ram: 2, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 62, ram: 4, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 75, ram: 8, storage: 5, requiresSSD: true }
  },
  
  '289130': { // Endless Legend
    name: 'Endless Legend',
    minimum: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 8, requiresSSD: false }
  },
  
  '261640': { // Borderlands: The Pre-Sequel
    name: 'Borderlands: The Pre-Sequel',
    minimum: { cpuScore: 28, gpuScore: 25, ram: 2, storage: 13, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 62, ram: 2, storage: 13, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 4, storage: 13, requiresSSD: false }
  },
  
  '222880': { // Insurgency
    name: 'Insurgency',
    minimum: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 45, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '249050': { // Dungeon of the Endless
    name: 'Dungeon of the Endless',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '232790': { // Broken Age
    name: 'Broken Age',
    minimum: { cpuScore: 22, gpuScore: 30, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 55, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '265550': { // Dead Rising 3
    name: 'Dead Rising 3',
    minimum: { cpuScore: 60, gpuScore: 62, ram: 6, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 70, ram: 8, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 30, requiresSSD: true }
  },
  
  '242400': { // Castlevania: Lords of Shadow 2
    name: 'Castlevania: Lords of Shadow 2',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 2, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 4, storage: 25, requiresSSD: false }
  },
  
  '311340': { // Metal Gear Solid V: Ground Zeroes
    name: 'Metal Gear Solid V: Ground Zeroes',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 68, ram: 8, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 4, requiresSSD: true }
  },
  
  '204530': { // Infested Planet
    name: 'Infested Planet',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '260230': { // Valiant Hearts: The Great War
    name: 'Valiant Hearts: The Great War',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 42, gpuScore: 55, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '265930': { // Goat Simulator
    name: 'Goat Simulator',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 45, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '235210': { // Strider (2014)
    name: 'Strider',
    minimum: { cpuScore: 45, gpuScore: 60, ram: 4, storage: 6, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 68, ram: 4, storage: 6, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 8, storage: 6, requiresSSD: false }
  },
  
  '256290': { // Child of Light
    name: 'Child of Light',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '226840': { // Age of Wonders III
    name: 'Age of Wonders III',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '237990': { // The Banner Saga
    name: 'The Banner Saga',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 45, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '251730': { // Legend of Grimrock 2
    name: 'Legend of Grimrock 2',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '300550': { // Shadowrun: Dragonfall
    name: 'Shadowrun: Dragonfall',
    minimum: { cpuScore: 18, gpuScore: 25, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '241260': { // Sherlock Holmes: Crimes and Punishments
    name: 'Sherlock Holmes: Crimes and Punishments',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 14, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 14, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 14, requiresSSD: false }
  },
  
  '239160': { // Thief (2014)
    name: 'Thief',
    minimum: { cpuScore: 25, gpuScore: 55, ram: 4, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 60, ram: 4, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 8, storage: 20, requiresSSD: true }
  },
  
  '246620': { // Plague Inc: Evolved
    name: 'Plague Inc: Evolved',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '319510': { // Five Nights at Freddy's
    name: "Five Nights at Freddy's",
    minimum: { cpuScore: 25, gpuScore: 30, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 55, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 65, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '94400': { // Nidhogg
    name: 'Nidhogg',
    minimum: { cpuScore: 18, gpuScore: 15, ram: 0.5, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 20, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 35, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false }
  },
  
  '242640': { // Styx: Master of Shadows
    name: 'Styx: Master of Shadows',
    minimum: { cpuScore: 28, gpuScore: 55, ram: 3, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 62, ram: 4, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 8, storage: 7, requiresSSD: true }
  },
  
  '243930': { // Bound by Flame
    name: 'Bound by Flame',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '258970': { // Gauntlet (2014)
    name: 'Gauntlet',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 4, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 55, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '285160': { // Lego The Hobbit
    name: 'Lego The Hobbit',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 30, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 45, ram: 8, storage: 10, requiresSSD: false }
  },
  
  // === 2015 CLASSICS ===
  '292030': { // The Witcher 3
    name: 'The Witcher 3: Wild Hunt',
    minimum: { cpuScore: 40, gpuScore: 48, ram: 6, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 55, gpuScore: 60, ram: 8, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 50, requiresSSD: true }
  },
  
  '271590': { // GTA V
    name: 'Grand Theft Auto V',
    minimum: { cpuScore: 25, gpuScore: 20, ram: 4, storage: 72, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 48, ram: 8, storage: 72, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 16, storage: 72, requiresSSD: false }
  },
  
  '359550': { // Rainbow Six Siege
    name: 'Rainbow Six Siege',
    minimum: { cpuScore: 35, gpuScore: 35, ram: 6, storage: 85, requiresSSD: false },
    recommended: { cpuScore: 50, gpuScore: 55, ram: 8, storage: 85, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 85, requiresSSD: true }
  },
  
  '377160': { // Fallout 4
    name: 'Fallout 4',
    minimum: { cpuScore: 40, gpuScore: 38, ram: 8, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 30, requiresSSD: true }
  },
  
  '287700': { // Metal Gear Solid V: The Phantom Pain
    name: 'Metal Gear Solid V: The Phantom Pain',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 28, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 68, ram: 8, storage: 28, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 28, requiresSSD: true }
  },
  
  '252950': { // Rocket League
    name: 'Rocket League',
    minimum: { cpuScore: 28, gpuScore: 25, ram: 2, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 48, ram: 4, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 7, requiresSSD: false }
  },
  
  '391540': { // Undertale
    name: 'Undertale',
    minimum: { cpuScore: 25, gpuScore: 18, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 30, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '255710': { // Cities: Skylines
    name: 'Cities: Skylines',
    minimum: { cpuScore: 35, gpuScore: 30, ram: 4, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 6, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 12, storage: 4, requiresSSD: false }
  },
  
  '239140': { // Dying Light
    name: 'Dying Light',
    minimum: { cpuScore: 65, gpuScore: 62, ram: 4, storage: 40, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 65, ram: 8, storage: 40, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 40, requiresSSD: true }
  },
  
  '1237980': { // Star Wars Battlefront
    name: 'Star Wars Battlefront',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 40, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 72, ram: 16, storage: 40, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 32, storage: 40, requiresSSD: true }
  },
  
  '208650': { // Batman: Arkham Knight
    name: 'Batman: Arkham Knight',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 6, storage: 45, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 68, ram: 8, storage: 45, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 45, requiresSSD: true }
  },
  
  '261570': { // Ori and the Blind Forest
    name: 'Ori and the Blind Forest',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 4, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 8, requiresSSD: false }
  },
  
  '282140': { // SOMA
    name: 'SOMA',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 8, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 25, requiresSSD: false }
  },
  
  '291650': { // Pillars of Eternity
    name: 'Pillars of Eternity',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 14, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 55, ram: 8, storage: 14, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 65, ram: 16, storage: 14, requiresSSD: false }
  },
  
  '234140': { // Mad Max
    name: 'Mad Max',
    minimum: { cpuScore: 55, gpuScore: 60, ram: 6, storage: 32, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 68, ram: 8, storage: 32, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 32, requiresSSD: true }
  },
  
  '225540': { // Just Cause 3
    name: 'Just Cause 3',
    minimum: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 54, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 8, storage: 54, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 54, requiresSSD: true }
  },
  
  '319630': { // Life is Strange
    name: 'Life is Strange',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 2, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 4, storage: 3, requiresSSD: false }
  },
  
  '346110': { // ARK: Survival Evolved
    name: 'ARK: Survival Evolved',
    minimum: { cpuScore: 25, gpuScore: 70, ram: 8, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 60, requiresSSD: true }
  },
  
  '233450': { // Prison Architect
    name: 'Prison Architect',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 8, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 1, requiresSSD: false }
  },
  
  '220200': { // Kerbal Space Program
    name: 'Kerbal Space Program',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 55, ram: 8, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 65, ram: 16, storage: 3, requiresSSD: false }
  },
  
  '307780': { // Mortal Kombat X
    name: 'Mortal Kombat X',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 3, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 60, ram: 8, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 70, ram: 16, storage: 60, requiresSSD: true }
  },
  
  '333930': { // Dirty Bomb
    name: 'Dirty Bomb',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 65, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '368500': { // Assassin's Creed Syndicate
    name: "Assassin's Creed Syndicate",
    minimum: { cpuScore: 60, gpuScore: 60, ram: 6, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 68, ram: 8, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 50, requiresSSD: true }
  },
  
  '311210': { // Call of Duty: Black Ops III
    name: 'Call of Duty: Black Ops III',
    minimum: { cpuScore: 50, gpuScore: 55, ram: 6, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 72, ram: 8, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 60, requiresSSD: true }
  },
  
  '335300': { // Dark Souls II: Scholar of the First Sin
    name: 'Dark Souls II: Scholar of the First Sin',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 23, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 65, ram: 8, storage: 23, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 70, ram: 16, storage: 23, requiresSSD: false }
  },
  
  '316790': { // Grim Fandango Remastered
    name: 'Grim Fandango Remastered',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 6, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 55, ram: 8, storage: 6, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 65, ram: 16, storage: 6, requiresSSD: false }
  },
  
  '310560': { // DiRT Rally
    name: 'DiRT Rally',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 65, ram: 8, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 50, requiresSSD: true }
  },
  
  '232090': { // Killing Floor 2
    name: 'Killing Floor 2',
    minimum: { cpuScore: 42, gpuScore: 30, ram: 4, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 62, ram: 4, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 8, storage: 60, requiresSSD: false }
  },
  
  '273350': { // Evolve
    name: 'Evolve',
    minimum: { cpuScore: 42, gpuScore: 62, ram: 4, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 70, ram: 6, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 12, storage: 50, requiresSSD: true }
  },
  
  '295110': { // H1Z1
    name: 'H1Z1',
    minimum: { cpuScore: 50, gpuScore: 48, ram: 4, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 8, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 20, requiresSSD: false }
  },
  
  '274170': { // Hotline Miami 2: Wrong Number
    name: 'Hotline Miami 2: Wrong Number',
    minimum: { cpuScore: 28, gpuScore: 25, ram: 1, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 4, requiresSSD: false }
  },
  
  '350080': { // Wolfenstein: The Old Blood
    name: 'Wolfenstein: The Old Blood',
    minimum: { cpuScore: 65, gpuScore: 62, ram: 4, storage: 40, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 40, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 40, requiresSSD: true }
  },
  
  '346010': { // Besiege
    name: 'Besiege',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '329070': { // Keep Talking and Nobody Explodes
    name: 'Keep Talking and Nobody Explodes',
    minimum: { cpuScore: 20, gpuScore: 25, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '368370': { // Her Story
    name: 'Her Story',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '274190': { // Broforce
    name: 'Broforce',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 16, storage: 1, requiresSSD: false }
  },
  
  '243970': { // Invisible, Inc.
    name: 'Invisible, Inc.',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '332200': { // Axiom Verge
    name: 'Axiom Verge',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '394510': { // Helldivers
    name: 'Helldivers',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 4, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 55, ram: 4, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 10, requiresSSD: false }
  },
  
  '247080': { // Crypt of the NecroDancer
    name: 'Crypt of the NecroDancer',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 30, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '226860': { // Galactic Civilizations III
    name: 'Galactic Civilizations III',
    minimum: { cpuScore: 45, gpuScore: 30, ram: 4, storage: 12, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 55, ram: 6, storage: 12, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 65, ram: 12, storage: 12, requiresSSD: false }
  },
  
  '373620': { // StarCraft II: Legacy of the Void
    name: 'StarCraft II: Legacy of the Void',
    minimum: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 55, ram: 4, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 65, ram: 8, storage: 30, requiresSSD: false }
  },
  
  '375910': { // Anno 2205
    name: 'Anno 2205',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 35, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 35, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 35, requiresSSD: true }
  },
  
  '238370': { // Magicka 2
    name: 'Magicka 2',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 4, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 65, ram: 8, storage: 8, requiresSSD: false }
  },
  
  '304650': { // Sunless Sea
    name: 'Sunless Sea',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '266510': { // Hand of Fate
    name: 'Hand of Fate',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 4, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 55, ram: 8, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 3, requiresSSD: false }
  },
  
  '286160': { // Tabletop Simulator
    name: 'Tabletop Simulator',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 55, ram: 8, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 65, ram: 16, storage: 3, requiresSSD: false }
  },
  
  '307670': { // Hard West
    name: 'Hard West',
    minimum: { cpuScore: 40, gpuScore: 55, ram: 4, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 60, ram: 8, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 5, requiresSSD: false }
  },
  
  // === 2016 ===
  '2357570': { // Overwatch 2
    name: 'Overwatch 2',
    minimum: { cpuScore: 35, gpuScore: 35, ram: 6, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 8, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 50, requiresSSD: true }
  },
  
  '413150': { // Stardew Valley
    name: 'Stardew Valley',
    minimum: { cpuScore: 20, gpuScore: 15, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 25, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 35, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '374320': { // Dark Souls III
    name: 'DARK SOULS III',
    minimum: { cpuScore: 40, gpuScore: 42, ram: 8, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 55, gpuScore: 60, ram: 8, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 25, requiresSSD: true }
  },
  
  '379720': { // DOOM (2016)
    name: 'DOOM',
    minimum: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 55, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 8, storage: 55, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 55, requiresSSD: true }
  },
  
  '480490': { // Prey (2017)
    name: 'Prey',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 16, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 20, requiresSSD: true }
  },
  
  '268500': { // XCOM 2
    name: 'XCOM 2',
    minimum: { cpuScore: 40, gpuScore: 55, ram: 4, storage: 45, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 68, ram: 8, storage: 45, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 45, requiresSSD: true }
  },
  
  '1238840': { // Battlefield 1
    name: 'Battlefield 1',
    minimum: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 50, requiresSSD: true }
  },
  
  '289070': { // Sid Meier's Civilization VI
    name: "Sid Meier's Civilization VI",
    minimum: { cpuScore: 50, gpuScore: 55, ram: 4, storage: 12, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 12, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 12, requiresSSD: false }
  },
  
  '1237970': { // Titanfall 2
    name: 'Titanfall 2',
    minimum: { cpuScore: 35, gpuScore: 48, ram: 8, storage: 45, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 16, storage: 45, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 32, storage: 45, requiresSSD: true }
  },
  
  '403640': { // Dishonored 2
    name: 'Dishonored 2',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 60, requiresSSD: true }
  },
  
  '447040': { // Watch Dogs 2
    name: 'Watch Dogs 2',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 6, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 75, ram: 8, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 80, ram: 16, storage: 50, requiresSSD: true }
  },
  
  '391220': { // Rise of the Tomb Raider
    name: 'Rise of the Tomb Raider',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 6, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 8, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 25, requiresSSD: true }
  },
  
  '281990': { // Stellaris
    name: 'Stellaris',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 8, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 10, requiresSSD: false }
  },
  
  '364360': { // Total War: Warhammer
    name: 'Total War: Warhammer',
    minimum: { cpuScore: 35, gpuScore: 55, ram: 3, storage: 35, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 68, ram: 8, storage: 35, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 35, requiresSSD: true }
  },
  
  '236870': { // Hitman (2016)
    name: 'Hitman',
    minimum: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 8, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 50, requiresSSD: true }
  },
  
  '304430': { // Inside
    name: 'Inside',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 3, requiresSSD: false }
  },
  
  '383870': { // Firewatch
    name: 'Firewatch',
    minimum: { cpuScore: 50, gpuScore: 55, ram: 6, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 68, ram: 8, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 4, requiresSSD: false }
  },
  
  '427520': { // Factorio
    name: 'Factorio',
    minimum: { cpuScore: 35, gpuScore: 30, ram: 4, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 60, ram: 8, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 3, requiresSSD: false }
  },
  
  '210770': { // The Witness
    name: 'The Witness',
    minimum: { cpuScore: 22, gpuScore: 62, ram: 4, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 65, ram: 8, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 75, ram: 16, storage: 5, requiresSSD: true }
  },
  
  '493340': { // Planet Coaster
    name: 'Planet Coaster',
    minimum: { cpuScore: 60, gpuScore: 62, ram: 8, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 12, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 24, storage: 8, requiresSSD: true }
  },
  
  '393380': { // Squad
    name: 'Squad',
    minimum: { cpuScore: 28, gpuScore: 60, ram: 8, storage: 55, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 70, ram: 16, storage: 55, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 75, ram: 32, storage: 55, requiresSSD: true }
  },
  
  '242860': { // Verdun
    name: 'Verdun',
    minimum: { cpuScore: 40, gpuScore: 55, ram: 4, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 10, requiresSSD: false }
  },
  
  '311690': { // Enter the Gungeon
    name: 'Enter the Gungeon',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '262060': { // Darkest Dungeon
    name: 'Darkest Dungeon',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '322500': { // Superhot
    name: 'Superhot',
    minimum: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 4, requiresSSD: false }
  },
  
  '477160': { // Devil Daggers
    name: 'Devil Daggers',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '388880': { // Oxenfree
    name: 'Oxenfree',
    minimum: { cpuScore: 50, gpuScore: 55, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '257850': { // Hyper Light Drifter
    name: 'Hyper Light Drifter',
    minimum: { cpuScore: 18, gpuScore: 30, ram: 4, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 55, ram: 8, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 65, ram: 16, storage: 1, requiresSSD: false }
  },
  
  '384190': { // Abzû
    name: 'Abzû',
    minimum: { cpuScore: 35, gpuScore: 65, ram: 4, storage: 6, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 65, ram: 8, storage: 6, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 6, requiresSSD: true }
  },
  
  '381210': { // Dead by Daylight
    name: 'Dead by Daylight',
    minimum: { cpuScore: 55, gpuScore: 60, ram: 8, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 55, gpuScore: 68, ram: 8, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 25, requiresSSD: false }
  },
  
  '394360': { // Hearts of Iron IV
    name: 'Hearts of Iron IV',
    minimum: { cpuScore: 45, gpuScore: 60, ram: 4, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '283640': { // Salt and Sanctuary
    name: 'Salt and Sanctuary',
    minimum: { cpuScore: 22, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '115100': { // Owlboy
    name: 'Owlboy',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '324800': { // Shadow Warrior 2
    name: 'Shadow Warrior 2',
    minimum: { cpuScore: 50, gpuScore: 62, ram: 8, storage: 14, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 72, ram: 8, storage: 14, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 14, requiresSSD: true }
  },
  
  '337000': { // Deus Ex: Mankind Divided
    name: 'Deus Ex: Mankind Divided',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 55, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 16, storage: 55, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 32, storage: 55, requiresSSD: true }
  },
  
  '362960': { // Tyranny
    name: 'Tyranny',
    minimum: { cpuScore: 45, gpuScore: 55, ram: 6, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 15, requiresSSD: false }
  },
  
  '310950': { // Street Fighter V
    name: 'Street Fighter V',
    minimum: { cpuScore: 55, gpuScore: 62, ram: 6, storage: 16, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 16, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 16, requiresSSD: false }
  },
  
  '474960': { // Quantum Break
    name: 'Quantum Break',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 55, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 70, ram: 16, storage: 55, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 32, storage: 55, requiresSSD: true }
  },
  
  '281640': { // The Banner Saga 2
    name: 'The Banner Saga 2',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '504370': { // Battlerite
    name: 'Battlerite',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 4, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 8, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 4, requiresSSD: false }
  },
  
  '356400': { // Thumper
    name: 'Thumper',
    minimum: { cpuScore: 50, gpuScore: 62, ram: 4, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 72, ram: 8, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 1, requiresSSD: false }
  },
  
  '386940': { // Ultimate Chicken Horse
    name: 'Ultimate Chicken Horse',
    minimum: { cpuScore: 20, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '211820': { // Starbound
    name: 'Starbound',
    minimum: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 50, gpuScore: 30, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 45, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '444090': { // Paladins
    name: 'Paladins',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 55, ram: 4, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 65, ram: 8, storage: 30, requiresSSD: false }
  },
  
  '280160': { // Aragami
    name: 'Aragami',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 6, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 6, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 6, requiresSSD: false }
  },
  
  '423580': { // Burly Men at Sea
    name: 'Burly Men at Sea',
    minimum: { cpuScore: 20, gpuScore: 18, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 35, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '374290': { // Virginia
    name: 'Virginia',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 6, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 12, storage: 4, requiresSSD: false }
  },
  
  // === 2017 ===
  '578080': { // PUBG
    name: 'PUBG: BATTLEGROUNDS',
    minimum: { cpuScore: 45, gpuScore: 48, ram: 8, storage: 40, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 16, storage: 40, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 40, requiresSSD: true }
  },
  
  '435150': { // Divinity: Original Sin 2
    name: 'Divinity: Original Sin 2',
    minimum: { cpuScore: 40, gpuScore: 38, ram: 4, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 60, requiresSSD: true }
  },
  
  '418370': { // Resident Evil 7
    name: 'Resident Evil 7: Biohazard',
    minimum: { cpuScore: 60, gpuScore: 68, ram: 8, storage: 24, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 8, storage: 24, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 24, requiresSSD: true }
  },
  
  '524220': { // NieR:Automata
    name: 'NieR:Automata',
    minimum: { cpuScore: 50, gpuScore: 68, ram: 4, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 50, requiresSSD: true }
  },
  
  '582160': { // Cuphead
    name: 'Cuphead',
    minimum: { cpuScore: 42, gpuScore: 30, ram: 2, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 50, gpuScore: 55, ram: 4, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 65, ram: 8, storage: 4, requiresSSD: false }
  },
  
  '612880': { // Wolfenstein II: The New Colossus
    name: 'Wolfenstein II: The New Colossus',
    minimum: { cpuScore: 70, gpuScore: 68, ram: 8, storage: 55, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 55, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 55, requiresSSD: true }
  },
  
  '644930': { // Total War: Warhammer II
    name: 'Total War: Warhammer II',
    minimum: { cpuScore: 35, gpuScore: 55, ram: 5, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 68, ram: 8, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 60, requiresSSD: true }
  },
  
  '356190': { // Middle-earth: Shadow of War
    name: 'Middle-earth: Shadow of War',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 60, requiresSSD: true }
  },
  
  '485510': { // Nioh: Complete Edition
    name: 'Nioh: Complete Edition',
    minimum: { cpuScore: 60, gpuScore: 65, ram: 6, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 8, storage: 100, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 100, requiresSSD: true }
  },
  
  '488790': { // South Park: The Fractured But Whole
    name: 'South Park: The Fractured But Whole',
    minimum: { cpuScore: 60, gpuScore: 70, ram: 6, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 80, ram: 16, storage: 20, requiresSSD: false }
  },
  
  '501300': { // What Remains of Edith Finch
    name: 'What Remains of Edith Finch',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 2, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 5, requiresSSD: false }
  },
  
  '481510': { // Night in the Woods
    name: 'Night in the Woods',
    minimum: { cpuScore: 60, gpuScore: 30, ram: 4, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 5, requiresSSD: false }
  },
  
  '462770': { // Pyre
    name: 'Pyre',
    minimum: { cpuScore: 35, gpuScore: 55, ram: 4, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 60, ram: 8, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 15, requiresSSD: false }
  },
  
  '304390': { // For Honor
    name: 'For Honor',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 40, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 40, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 40, requiresSSD: true }
  },
  
  '460930': { // Tom Clancy's Ghost Recon Wildlands
    name: "Tom Clancy's Ghost Recon Wildlands",
    minimum: { cpuScore: 60, gpuScore: 60, ram: 6, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 8, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 50, requiresSSD: true }
  },
  
  '424370': { // Little Nightmares
    name: 'Little Nightmares',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 10, requiresSSD: false }
  },
  
  '389730': { // Tekken 7
    name: 'Tekken 7',
    minimum: { cpuScore: 55, gpuScore: 60, ram: 6, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 80, ram: 16, storage: 60, requiresSSD: false }
  },
  
  '601430': { // The Evil Within 2
    name: 'The Evil Within 2',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 40, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 40, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 40, requiresSSD: true }
  },
  
  '240720': { // Getting Over It with Bennett Foddy
    name: 'Getting Over It with Bennett Foddy',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '337340': { // Finding Paradise
    name: 'Finding Paradise',
    minimum: { cpuScore: 18, gpuScore: 20, ram: 1, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 25, ram: 2, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 35, ram: 4, storage: 2, requiresSSD: false }
  },
  
  '268910': { // Cuphead
    name: 'Cuphead',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 2, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 20, requiresSSD: false }
  },
  
  '268650': { // Sonic Mania
    name: 'Sonic Mania',
    minimum: { cpuScore: 40, gpuScore: 25, ram: 2, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 50, gpuScore: 30, ram: 4, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 45, ram: 8, storage: 5, requiresSSD: false }
  },
  
  '253230': { // A Hat in Time
    name: 'A Hat in Time',
    minimum: { cpuScore: 35, gpuScore: 55, ram: 4, storage: 9, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 70, ram: 8, storage: 9, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 9, requiresSSD: false }
  },
  
  '411300': { // ELEX
    name: 'ELEX',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 35, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 35, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 35, requiresSSD: true }
  },
  
  '456670': { // Hand of Fate 2
    name: 'Hand of Fate 2',
    minimum: { cpuScore: 28, gpuScore: 55, ram: 4, storage: 6, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 60, ram: 8, storage: 6, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 6, requiresSSD: false }
  },
  
  '514900': { // Observer
    name: 'Observer',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 75, ram: 16, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 80, ram: 32, storage: 10, requiresSSD: true }
  },
  
  '451020': { // Battle Chasers: Nightwar
    name: 'Battle Chasers: Nightwar',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 55, ram: 8, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 16, storage: 30, requiresSSD: false }
  },
  
  '378540': { // The Surge
    name: 'The Surge',
    minimum: { cpuScore: 65, gpuScore: 62, ram: 8, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 16, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 32, storage: 20, requiresSSD: true }
  },
  
  '473690': { // Absolver
    name: 'Absolver',
    minimum: { cpuScore: 65, gpuScore: 62, ram: 4, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 70, ram: 8, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 7, requiresSSD: false }
  },
  
  '567640': { // Danganronpa V3: Killing Harmony
    name: 'Danganronpa V3: Killing Harmony',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 15, requiresSSD: false }
  },
  
  '597220': { // West of Loathing
    name: 'West of Loathing',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '368340': { // Rain World
    name: 'Rain World',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '558420': { // Stories Untold
    name: 'Stories Untold',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '268130': { // Heat Signature
    name: 'Heat Signature',
    minimum: { cpuScore: 22, gpuScore: 30, ram: 4, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 55, ram: 8, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 65, ram: 16, storage: 1, requiresSSD: false }
  },
  
  '457140': { // Oxygen Not Included
    name: 'Oxygen Not Included',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 60, ram: 8, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 1, requiresSSD: false }
  },
  
  '433340': { // Slime Rancher
    name: 'Slime Rancher',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 1, requiresSSD: false }
  },
  
  '305620': { // The Long Dark
    name: 'The Long Dark',
    minimum: { cpuScore: 60, gpuScore: 30, ram: 4, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 55, ram: 8, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 65, ram: 16, storage: 7, requiresSSD: false }
  },
  
  '392110': { // Endless Space 2
    name: 'Endless Space 2',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 68, ram: 8, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 8, requiresSSD: false }
  },
  
  '285190': { // Warhammer 40k: Dawn of War III
    name: 'Warhammer 40,000: Dawn of War III',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 68, ram: 8, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 50, requiresSSD: false }
  },
  
  '493840': { // Marvel vs. Capcom: Infinite
    name: 'Marvel vs. Capcom: Infinite',
    minimum: { cpuScore: 55, gpuScore: 62, ram: 6, storage: 59, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 59, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 59, requiresSSD: false }
  },
  
  '418460': { // Rising Storm 2: Vietnam
    name: 'Rising Storm 2: Vietnam',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 68, ram: 6, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 12, storage: 60, requiresSSD: false }
  },
  
  '312660': { // Sniper Elite 4
    name: 'Sniper Elite 4',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 65, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 8, storage: 65, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 65, requiresSSD: true }
  },
  
  '438740': { // Friday the 13th: The Game
    name: 'Friday the 13th: The Game',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 8, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 4, requiresSSD: false }
  },
  
  '1237990': { // Star Wars Battlefront II
    name: 'Star Wars Battlefront II',
    minimum: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 60, requiresSSD: true }
  },
  
  '378860': { // Project CARS 2
    name: 'Project CARS 2',
    minimum: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 32, storage: 50, requiresSSD: true }
  },
  
  // === 2018-2019 ===
  '582010': { // Monster Hunter: World
    name: 'Monster Hunter: World',
    minimum: { cpuScore: 45, gpuScore: 45, ram: 8, storage: 48, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 8, storage: 48, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 48, requiresSSD: true }
  },
  
  '1174180': { // Red Dead Redemption 2
    name: 'Red Dead Redemption 2',
    minimum: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 150, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 12, storage: 150, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 150, requiresSSD: true }
  },
  
  '1172470': { // Apex Legends
    name: 'Apex Legends',
    minimum: { cpuScore: 40, gpuScore: 25, ram: 6, storage: 56, requiresSSD: false },
    recommended: { cpuScore: 55, gpuScore: 60, ram: 8, storage: 56, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 56, requiresSSD: true }
  },
  
  '552520': { // Far Cry 5
    name: 'Far Cry 5',
    minimum: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 40, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 8, storage: 40, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 40, requiresSSD: true }
  },
  
  '379430': { // Kingdom Come: Deliverance
    name: 'Kingdom Come: Deliverance',
    minimum: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 70, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 70, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 70, requiresSSD: true }
  },
  
  '323370': { // Frostpunk
    name: 'Frostpunk',
    minimum: { cpuScore: 38, gpuScore: 60, ram: 4, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 38, gpuScore: 72, ram: 8, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 8, requiresSSD: true }
  },
  
  '504230': { // Celeste
    name: 'Celeste',
    minimum: { cpuScore: 50, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 30, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 45, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '590380': { // Into the Breach
    name: 'Into the Breach',
    minimum: { cpuScore: 22, gpuScore: 25, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 50, gpuScore: 45, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '653530': { // Return of the Obra Dinn
    name: 'Return of the Obra Dinn',
    minimum: { cpuScore: 60, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 2, requiresSSD: false }
  },
  
  '863550': { // Hitman 2
    name: 'Hitman 2',
    minimum: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 85, ram: 32, storage: 60, requiresSSD: true }
  },
  
  '427290': { // Vampyr
    name: 'Vampyr',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 16, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 32, storage: 20, requiresSSD: true }
  },
  
  '560130': { // Pillars of Eternity II: Deadfire
    name: 'Pillars of Eternity II: Deadfire',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 45, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 45, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 45, requiresSSD: false }
  },
  
  '606280': { // Darksiders III
    name: 'Darksiders III',
    minimum: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 16, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 32, storage: 15, requiresSSD: true }
  },
  
  '517630': { // Just Cause 4
    name: 'Just Cause 4',
    minimum: { cpuScore: 60, gpuScore: 68, ram: 8, storage: 59, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 59, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 85, ram: 32, storage: 59, requiresSSD: true }
  },
  
  '586140': { // The Crew 2
    name: 'The Crew 2',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 80, ram: 16, storage: 30, requiresSSD: true }
  },
  
  '495420': { // State of Decay 2
    name: 'State of Decay 2',
    minimum: { cpuScore: 65, gpuScore: 68, ram: 8, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 70, ram: 16, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 32, storage: 30, requiresSSD: false }
  },
  
  '552500': { // Warhammer: Vermintide 2
    name: 'Warhammer: Vermintide 2',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 6, storage: 45, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 8, storage: 45, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 45, requiresSSD: true }
  },
  
  '588650': { // Dead Cells
    name: 'Dead Cells',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '683320': { // Gris
    name: 'Gris',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 4, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 50, gpuScore: 55, ram: 8, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 4, requiresSSD: false }
  },
  
  '1222700': { // A Way Out
    name: 'A Way Out',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 70, ram: 16, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 32, storage: 25, requiresSSD: false }
  },
  
  '1238820': { // Battlefield V
    name: 'Battlefield V',
    minimum: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 12, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 24, storage: 50, requiresSSD: true }
  },
  
  '348310': { // Kenshi
    name: 'Kenshi',
    minimum: { cpuScore: 25, gpuScore: 55, ram: 6, storage: 14, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 72, ram: 16, storage: 14, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 75, ram: 32, storage: 14, requiresSSD: false }
  },
  
  '228380': { // Wreckfest
    name: 'Wreckfest',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 72, ram: 8, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 4, requiresSSD: true }
  },
  
  '535930': { // Two Point Hospital
    name: 'Two Point Hospital',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 6, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 6, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 80, ram: 16, storage: 6, requiresSSD: false }
  },
  
  '750920': { // Shadow of the Tomb Raider
    name: 'Shadow of the Tomb Raider',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 40, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 40, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 40, requiresSSD: true }
  },
  
  '242760': { // The Forest
    name: 'The Forest',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 4, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 5, requiresSSD: false }
  },
  
  '718670': { // Cultist Simulator
    name: 'Cultist Simulator',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 55, gpuScore: 45, ram: 4, storage: 1, requiresSSD: false }
  },
  
  '648800': { // Raft
    name: 'Raft',
    minimum: { cpuScore: 25, gpuScore: 60, ram: 4, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 68, ram: 8, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 3, requiresSSD: false }
  },
  
  '294100': { // RimWorld
    name: 'RimWorld',
    minimum: { cpuScore: 40, gpuScore: 25, ram: 4, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 50, gpuScore: 30, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 45, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '620590': { // Ancestors Legacy
    name: 'Ancestors Legacy',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 25, requiresSSD: false }
  },
  
  '637090': { // BATTLETECH
    name: 'BATTLETECH',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 70, ram: 16, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 32, storage: 30, requiresSSD: false }
  },
  
  '548430': { // Deep Rock Galactic
    name: 'Deep Rock Galactic',
    minimum: { cpuScore: 28, gpuScore: 60, ram: 6, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 72, ram: 8, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 5, requiresSSD: false }
  },
  
  '464920': { // Surviving Mars
    name: 'Surviving Mars',
    minimum: { cpuScore: 50, gpuScore: 30, ram: 4, storage: 6, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 6, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 6, requiresSSD: false }
  },
  
  '489630': { // Warhammer 40,000: Gladius
    name: 'Warhammer 40,000: Gladius - Relics of War',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 68, ram: 8, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 4, requiresSSD: false }
  },
  
  '1225570': { // Unravel Two
    name: 'Unravel Two',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 70, ram: 6, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 12, storage: 10, requiresSSD: false }
  },
  
  '568800': { // Call of Duty: Black Ops 4
    name: 'Call of Duty: Black Ops 4',
    minimum: { cpuScore: 55, gpuScore: 60, ram: 8, storage: 55, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 72, ram: 12, storage: 55, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 24, storage: 55, requiresSSD: true }
  },
  
  '583950': { // Artifact
    name: 'Artifact',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 72, ram: 8, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 7, requiresSSD: false }
  },
  
  '581320': { // Insurgency: Sandstorm
    name: 'Insurgency: Sandstorm',
    minimum: { cpuScore: 60, gpuScore: 68, ram: 8, storage: 40, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 40, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 80, ram: 32, storage: 40, requiresSSD: true }
  },
  
  '760060': { // Mutant Year Zero: Road to Eden
    name: 'Mutant Year Zero: Road to Eden',
    minimum: { cpuScore: 60, gpuScore: 62, ram: 6, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 8, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 8, requiresSSD: true }
  },
  
  '519860': { // Dusk
    name: 'Dusk',
    minimum: { cpuScore: 28, gpuScore: 35, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 60, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '453090': { // Parkitect
    name: 'Parkitect',
    minimum: { cpuScore: 28, gpuScore: 30, ram: 2, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 35, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false }
  },
  
  '702670': { // Donut County
    name: 'Donut County',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 30, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '606150': { // Moonlighter
    name: 'Moonlighter',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 2, requiresSSD: false }
  },
  
  '764790': { // The Messenger
    name: 'The Messenger',
    minimum: { cpuScore: 55, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 68, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '742300': { // Mega Man 11
    name: 'Mega Man 11',
    minimum: { cpuScore: 60, gpuScore: 68, ram: 4, storage: 7, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 8, storage: 7, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 7, requiresSSD: false }
  },
  
  '559100': { // Phantom Doctrine
    name: 'Phantom Doctrine',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 32, storage: 30, requiresSSD: false }
  },
  
  '728880': { // Overcooked! 2
    name: 'Overcooked! 2',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 8, storage: 3, requiresSSD: false }
  },
  
  '599140': { // Graveyard Keeper
    name: 'Graveyard Keeper',
    minimum: { cpuScore: 20, gpuScore: 25, ram: 4, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 55, ram: 8, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 65, ram: 16, storage: 1, requiresSSD: false }
  },
  
  '758810': { // Ashen
    name: 'Ashen',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 6, storage: 14, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 72, ram: 8, storage: 14, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 14, requiresSSD: true }
  },
  
  // === 2019 GAMES ===
  '814380': { // Sekiro: Shadows Die Twice
    name: 'Sekiro: Shadows Die Twice',
    minimum: { cpuScore: 50, gpuScore: 68, ram: 4, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 72, ram: 8, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 25, requiresSSD: true }
  },
  
  '870780': { // Control
    name: 'Control',
    minimum: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 42, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 42, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 42, requiresSSD: true }
  },
  
  '632470': { // Disco Elysium
    name: 'Disco Elysium',
    minimum: { cpuScore: 60, gpuScore: 62, ram: 4, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 72, ram: 8, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 20, requiresSSD: false }
  },
  
  '883710': { // Resident Evil 2 (Remake)
    name: 'Resident Evil 2',
    minimum: { cpuScore: 60, gpuScore: 68, ram: 8, storage: 26, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 8, storage: 26, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 26, requiresSSD: true }
  },
  
  '412020': { // Metro Exodus
    name: 'Metro Exodus',
    minimum: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 59, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 80, ram: 8, storage: 59, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 85, ram: 16, storage: 59, requiresSSD: true }
  },
  
  '1172380': { // Star Wars Jedi: Fallen Order
    name: 'Star Wars Jedi: Fallen Order',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 55, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 55, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 85, ram: 32, storage: 55, requiresSSD: true }
  },
  
  '753640': { // Outer Wilds
    name: 'Outer Wilds',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 75, ram: 8, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 8, requiresSSD: false }
  },
  
  '752590': { // A Plague Tale: Innocence
    name: 'A Plague Tale: Innocence',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 72, ram: 16, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 32, storage: 50, requiresSSD: true }
  },
  
  '601150': { // Devil May Cry 5
    name: 'Devil May Cry 5',
    minimum: { cpuScore: 60, gpuScore: 68, ram: 8, storage: 35, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 8, storage: 35, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 35, requiresSSD: true }
  },
  
  '578650': { // The Outer Worlds
    name: 'The Outer Worlds',
    minimum: { cpuScore: 50, gpuScore: 65, ram: 4, storage: 40, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 8, storage: 40, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 40, requiresSSD: true }
  },
  
  '397540': { // Borderlands 3
    name: 'Borderlands 3',
    minimum: { cpuScore: 60, gpuScore: 70, ram: 6, storage: 75, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 75, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 75, requiresSSD: true }
  },
  
  '1097840': { // Gears 5
    name: 'Gears 5',
    minimum: { cpuScore: 60, gpuScore: 68, ram: 8, storage: 80, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 80, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 80, requiresSSD: true }
  },
  
  '779340': { // Total War: Three Kingdoms
    name: 'Total War: Three Kingdoms',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 72, ram: 8, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 60, requiresSSD: true }
  },
  
  '617290': { // Remnant: From the Ashes
    name: 'Remnant: From the Ashes',
    minimum: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 16, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 32, storage: 50, requiresSSD: true }
  },
  
  '606880': { // GreedFall
    name: 'GreedFall',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 25, requiresSSD: true }
  },
  
  '916440': { // Anno 1800
    name: 'Anno 1800',
    minimum: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 72, ram: 8, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 60, requiresSSD: true }
  },
  
  '646570': { // Slay the Spire
    name: 'Slay the Spire',
    minimum: { cpuScore: 25, gpuScore: 55, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 25, gpuScore: 60, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '736260': { // Baba Is You
    name: 'Baba Is You',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '460960': { // Katana ZERO
    name: 'Katana ZERO',
    minimum: { cpuScore: 50, gpuScore: 35, ram: 4, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 72, ram: 8, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 1, requiresSSD: false }
  },
  
  '837470': { // Untitled Goose Game
    name: 'Untitled Goose Game',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 16, storage: 2, requiresSSD: false }
  },
  
  '703080': { // Planet Zoo
    name: 'Planet Zoo',
    minimum: { cpuScore: 65, gpuScore: 68, ram: 8, storage: 16, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 16, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 85, ram: 32, storage: 16, requiresSSD: true }
  },
  
  '629760': { // Mordhau
    name: 'Mordhau',
    minimum: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 75, ram: 16, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 20, requiresSSD: false }
  },
  
  // === 2020 ===
  '1091500': { // Cyberpunk 2077
    name: 'Cyberpunk 2077',
    minimum: { cpuScore: 55, gpuScore: 62, ram: 12, storage: 70, requiresSSD: true },
    recommended: { cpuScore: 80, gpuScore: 65, ram: 16, storage: 70, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 85, ram: 16, storage: 70, requiresSSD: true }
  },
  
  '1517290': { // Valorant (placeholder - not on Steam)
    name: 'Valorant',
    minimum: { cpuScore: 30, gpuScore: 20, ram: 4, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 52, ram: 4, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 30, requiresSSD: true }
  },
  
  '1628350': { // Genshin Impact (placeholder - not on Steam)
    name: 'Genshin Impact',
    minimum: { cpuScore: 40, gpuScore: 32, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 16, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 50, requiresSSD: true }
  },
  
  '782330': { // DOOM Eternal
    name: 'DOOM Eternal',
    minimum: { cpuScore: 60, gpuScore: 72, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 8, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 85, ram: 16, storage: 50, requiresSSD: true }
  },
  
  '546560': { // Half-Life: Alyx
    name: 'Half-Life: Alyx',
    minimum: { cpuScore: 70, gpuScore: 75, ram: 12, storage: 70, requiresSSD: false },
    recommended: { cpuScore: 80, gpuScore: 85, ram: 16, storage: 70, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 90, ram: 32, storage: 70, requiresSSD: true }
  },
  
  '1250410': { // Microsoft Flight Simulator
    name: 'Microsoft Flight Simulator',
    minimum: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 150, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 65, ram: 16, storage: 150, requiresSSD: true },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 150, requiresSSD: true }
  },
  
  '1145360': { // Hades
    name: 'Hades',
    minimum: { cpuScore: 30, gpuScore: 25, ram: 4, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 35, ram: 8, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 50, ram: 16, storage: 15, requiresSSD: false }
  },
  
  '1151640': { // Horizon Zero Dawn
    name: 'Horizon Zero Dawn Complete Edition',
    minimum: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 100, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 100, requiresSSD: true }
  },
  
  '1089350': { // Ghostrunner
    name: 'Ghostrunner',
    minimum: { cpuScore: 65, gpuScore: 68, ram: 8, storage: 22, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 22, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 22, requiresSSD: true }
  },
  
  '1222730': { // Star Wars: Squadrons
    name: 'Star Wars: Squadrons',
    minimum: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 40, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 40, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 40, requiresSSD: true }
  },
  
  '1097150': { // Fall Guys
    name: 'Fall Guys',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 75, ram: 16, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 2, requiresSSD: false }
  },
  
  '1938080': { // Call of Duty: Warzone
    name: 'Call of Duty: Warzone',
    minimum: { cpuScore: 55, gpuScore: 70, ram: 8, storage: 175, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 72, ram: 12, storage: 175, requiresSSD: true },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 175, requiresSSD: true }
  },
  
  '1337520': { // Crusader Kings III
    name: 'Crusader Kings III',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 6, storage: 8, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 8, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 8, requiresSSD: false }
  },
  
  '1091100': { // Spelunky 2
    name: 'Spelunky 2',
    minimum: { cpuScore: 70, gpuScore: 30, ram: 4, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 72, ram: 8, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 1, requiresSSD: false }
  },
  
  '972660': { // Spiritfarer
    name: 'Spiritfarer',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 70, ram: 6, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 12, storage: 10, requiresSSD: false }
  },
  
  '632360': { // Risk of Rain 2
    name: 'Risk of Rain 2',
    minimum: { cpuScore: 50, gpuScore: 62, ram: 4, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 70, ram: 4, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 8, storage: 4, requiresSSD: false }
  },
  
  // === 2021 ===
  '1551360': { // Forza Horizon 5
    name: 'Forza Horizon 5',
    minimum: { cpuScore: 45, gpuScore: 45, ram: 8, storage: 110, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 65, ram: 16, storage: 110, requiresSSD: true },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 110, requiresSSD: true }
  },
  
  '1426210': { // It Takes Two
    name: 'It Takes Two',
    minimum: { cpuScore: 35, gpuScore: 48, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 55, gpuScore: 60, ram: 16, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 50, requiresSSD: true }
  },
  
  '1240440': { // Halo Infinite
    name: 'Halo Infinite',
    minimum: { cpuScore: 60, gpuScore: 72, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 80, gpuScore: 85, ram: 16, storage: 50, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 90, ram: 32, storage: 50, requiresSSD: true }
  },
  
  '1252330': { // Deathloop
    name: 'Deathloop',
    minimum: { cpuScore: 75, gpuScore: 75, ram: 12, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 80, gpuScore: 85, ram: 16, storage: 30, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 90, ram: 32, storage: 30, requiresSSD: true }
  },
  
  '1466860': { // Resident Evil Village
    name: 'Resident Evil Village',
    minimum: { cpuScore: 70, gpuScore: 72, ram: 8, storage: 35, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 80, ram: 16, storage: 35, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 32, storage: 35, requiresSSD: true }
  },
  
  '1466840': { // Age of Empires IV
    name: 'Age of Empires IV',
    minimum: { cpuScore: 65, gpuScore: 30, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 72, ram: 16, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 80, ram: 32, storage: 50, requiresSSD: true }
  },
  
  '607080': { // Psychonauts 2
    name: 'Psychonauts 2',
    minimum: { cpuScore: 55, gpuScore: 68, ram: 8, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 8, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 30, requiresSSD: true }
  },
  
  '892970': { // Valheim
    name: 'Valheim',
    minimum: { cpuScore: 40, gpuScore: 70, ram: 8, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 75, ram: 16, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 80, ram: 32, storage: 1, requiresSSD: false }
  },
  
  '924970': { // Back 4 Blood
    name: 'Back 4 Blood',
    minimum: { cpuScore: 60, gpuScore: 72, ram: 8, storage: 40, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 80, ram: 12, storage: 40, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 24, storage: 40, requiresSSD: true }
  },
  
  '979690': { // The Ascent
    name: 'The Ascent',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 35, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 85, ram: 16, storage: 35, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 90, ram: 32, storage: 35, requiresSSD: true }
  },
  
  '1088850': { // Marvel's Guardians of the Galaxy
    name: "Marvel's Guardians of the Galaxy",
    minimum: { cpuScore: 60, gpuScore: 75, ram: 8, storage: 80, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 80, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 80, requiresSSD: true }
  },
  
  '1124300': { // Humankind
    name: 'Humankind',
    minimum: { cpuScore: 60, gpuScore: 68, ram: 8, storage: 25, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 75, ram: 16, storage: 25, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 32, storage: 25, requiresSSD: false }
  },
  
  '1824220': { // Chivalry 2
    name: 'Chivalry 2',
    minimum: { cpuScore: 55, gpuScore: 60, ram: 8, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 32, storage: 20, requiresSSD: true }
  },
  
  '1184370': { // Pathfinder: Wrath of the Righteous
    name: 'Pathfinder: Wrath of the Righteous',
    minimum: { cpuScore: 50, gpuScore: 70, ram: 6, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 72, ram: 8, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 50, requiresSSD: false }
  },
  
  '1659040': { // Hitman 3
    name: 'Hitman 3',
    minimum: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 32, storage: 60, requiresSSD: true }
  },
  
  '740130': { // Tales of Arise
    name: 'Tales of Arise',
    minimum: { cpuScore: 65, gpuScore: 68, ram: 8, storage: 40, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 72, ram: 8, storage: 40, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 80, ram: 16, storage: 40, requiresSSD: true }
  },
  
  '860510': { // Little Nightmares II
    name: 'Little Nightmares II',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 60, ram: 8, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 10, requiresSSD: false }
  },
  
  '1092790': { // Inscryption
    name: 'Inscryption',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 4, storage: 3, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 72, ram: 8, storage: 3, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 3, requiresSSD: false }
  },
  
  '1282730': { // Loop Hero
    name: 'Loop Hero',
    minimum: { cpuScore: 40, gpuScore: 30, ram: 2, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 50, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '763890': { // Wildermyth
    name: 'Wildermyth',
    minimum: { cpuScore: 50, gpuScore: 30, ram: 3, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false }
  },
  
  // === 2022 ===
  '1245620': { // Elden Ring
    name: 'Elden Ring',
    minimum: { cpuScore: 50, gpuScore: 62, ram: 12, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 65, ram: 16, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 60, requiresSSD: true }
  },
  
  '1817070': { // Marvel's Spider-Man Remastered
    name: "Marvel's Spider-Man Remastered",
    minimum: { cpuScore: 35, gpuScore: 48, ram: 8, storage: 75, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 16, storage: 75, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 75, requiresSSD: true }
  },
  
  '1593500': { // God of War
    name: 'God of War',
    minimum: { cpuScore: 50, gpuScore: 48, ram: 8, storage: 70, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 62, ram: 8, storage: 70, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 70, requiresSSD: true }
  },
  
  '1782120': { // Vampire Survivors
    name: 'Vampire Survivors',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '1332010': { // Stray
    name: 'Stray',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 65, ram: 8, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 80, ram: 16, storage: 10, requiresSSD: true }
  },
  
  '534380': { // Dying Light 2 Stay Human
    name: 'Dying Light 2 Stay Human',
    minimum: { cpuScore: 80, gpuScore: 72, ram: 8, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 90, gpuScore: 90, ram: 32, storage: 60, requiresSSD: true }
  },
  
  '1403900': { // A Plague Tale: Requiem
    name: 'A Plague Tale: Requiem',
    minimum: { cpuScore: 65, gpuScore: 72, ram: 16, storage: 55, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 90, ram: 16, storage: 55, requiresSSD: true },
    ultra: { cpuScore: 85, gpuScore: 95, ram: 32, storage: 55, requiresSSD: true }
  },
  
  '1361210': { // Warhammer 40,000: Darktide
    name: 'Warhammer 40,000: Darktide',
    minimum: { cpuScore: 65, gpuScore: 72, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 80, gpuScore: 88, ram: 16, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 90, gpuScore: 92, ram: 32, storage: 50, requiresSSD: true }
  },
  
  '1313140': { // Cult of the Lamb
    name: 'Cult of the Lamb',
    minimum: { cpuScore: 50, gpuScore: 62, ram: 4, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 72, ram: 8, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 4, requiresSSD: false }
  },
  
  '1533420': { // Neon White
    name: 'Neon White',
    minimum: { cpuScore: 50, gpuScore: 55, ram: 6, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 65, ram: 6, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 12, storage: 4, requiresSSD: false }
  },
  
  '1142720': { // Total War: Warhammer III
    name: 'Total War: Warhammer III',
    minimum: { cpuScore: 50, gpuScore: 70, ram: 6, storage: 120, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 78, ram: 8, storage: 120, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 85, ram: 16, storage: 120, requiresSSD: true }
  },
  
  '2138710': { // Sifu
    name: 'Sifu',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 22, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 72, ram: 10, storage: 22, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 80, ram: 20, storage: 22, requiresSSD: true }
  },
  
  '1938091': { // Call of Duty: Modern Warfare II
    name: 'Call of Duty: Modern Warfare II',
    minimum: { cpuScore: 50, gpuScore: 70, ram: 8, storage: 125, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 75, ram: 12, storage: 125, requiresSSD: true },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 24, storage: 125, requiresSSD: true }
  },
  
  '1687950': { // Persona 5 Royal
    name: 'Persona 5 Royal',
    minimum: { cpuScore: 70, gpuScore: 60, ram: 8, storage: 41, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 68, ram: 8, storage: 41, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 80, ram: 16, storage: 41, requiresSSD: false }
  },
  
  '975370': { // Dwarf Fortress
    name: 'Dwarf Fortress',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 1, requiresSSD: false }
  },
  
  '1659420': { // Uncharted: Legacy of Thieves
    name: 'Uncharted: Legacy of Thieves Collection',
    minimum: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 126, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 126, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 32, storage: 126, requiresSSD: true }
  },
  
  '1846380': { // Need for Speed Unbound
    name: 'Need for Speed Unbound',
    minimum: { cpuScore: 75, gpuScore: 72, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 90, gpuScore: 90, ram: 32, storage: 50, requiresSSD: true }
  },
  
  '553420': { // Tunic
    name: 'Tunic',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 80, ram: 8, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 85, ram: 16, storage: 4, requiresSSD: false }
  },
  
  '1205520': { // Pentiment
    name: 'Pentiment',
    minimum: { cpuScore: 50, gpuScore: 60, ram: 4, storage: 12, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 75, ram: 8, storage: 12, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 80, ram: 16, storage: 12, requiresSSD: false }
  },
  
  '368260': { // Marvel's Midnight Suns
    name: "Marvel's Midnight Suns",
    minimum: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 32, storage: 60, requiresSSD: true }
  },
  
  // === 2023 ===
  '1086940': { // Baldur's Gate 3
    name: "Baldur's Gate 3",
    minimum: { cpuScore: 45, gpuScore: 60, ram: 8, storage: 150, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 65, ram: 16, storage: 150, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 150, requiresSSD: true }
  },
  
  '1966720': { // Starfield
    name: 'Starfield',
    minimum: { cpuScore: 60, gpuScore: 65, ram: 16, storage: 125, requiresSSD: true },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 125, requiresSSD: true },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 32, storage: 125, requiresSSD: true }
  },
  
  '730': { // Counter-Strike 2
    name: 'Counter-Strike 2',
    minimum: { cpuScore: 35, gpuScore: 25, ram: 8, storage: 85, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 66, ram: 16, storage: 85, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 85, requiresSSD: true }
  },
  
  '1304930': { // Alan Wake 2
    name: 'Alan Wake 2',
    minimum: { cpuScore: 55, gpuScore: 65, ram: 16, storage: 90, requiresSSD: true },
    recommended: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 90, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 85, ram: 32, storage: 90, requiresSSD: true }
  },
  
  '2077590': { // Cyberpunk 2077: Phantom Liberty
    name: 'Cyberpunk 2077: Phantom Liberty',
    minimum: { cpuScore: 70, gpuScore: 75, ram: 12, storage: 70, requiresSSD: true },
    recommended: { cpuScore: 85, gpuScore: 85, ram: 16, storage: 70, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 92, ram: 32, storage: 70, requiresSSD: true }
  },
  
  '2050650': { // Resident Evil 4 (Remake)
    name: 'Resident Evil 4',
    minimum: { cpuScore: 70, gpuScore: 72, ram: 8, storage: 67, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 80, ram: 16, storage: 67, requiresSSD: false },
    ultra: { cpuScore: 90, gpuScore: 90, ram: 32, storage: 67, requiresSSD: true }
  },
  
  '990080': { // Hogwarts Legacy
    name: 'Hogwarts Legacy',
    minimum: { cpuScore: 65, gpuScore: 70, ram: 16, storage: 85, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 82, ram: 16, storage: 85, requiresSSD: false },
    ultra: { cpuScore: 90, gpuScore: 90, ram: 32, storage: 85, requiresSSD: true }
  },
  
  '2344520': { // Diablo IV
    name: 'Diablo IV',
    minimum: { cpuScore: 65, gpuScore: 60, ram: 8, storage: 90, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 72, ram: 16, storage: 90, requiresSSD: true },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 32, storage: 90, requiresSSD: true }
  },
  
  '1627720': { // Lies of P
    name: 'Lies of P',
    minimum: { cpuScore: 50, gpuScore: 70, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 50, gpuScore: 78, ram: 16, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 85, ram: 32, storage: 50, requiresSSD: true }
  },
  
  '1364780': { // Street Fighter 6
    name: 'Street Fighter 6',
    minimum: { cpuScore: 70, gpuScore: 75, ram: 8, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 90, gpuScore: 90, ram: 32, storage: 60, requiresSSD: true }
  },
  
  '1693980': { // Dead Space (Remake)
    name: 'Dead Space',
    minimum: { cpuScore: 65, gpuScore: 80, ram: 16, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 85, ram: 16, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 90, ram: 32, storage: 50, requiresSSD: true }
  },
  
  '1817230': { // Hi-Fi RUSH
    name: 'Hi-Fi RUSH',
    minimum: { cpuScore: 60, gpuScore: 72, ram: 8, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 80, ram: 8, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 88, ram: 16, storage: 20, requiresSSD: true }
  },
  
  '1888160': { // Armored Core VI
    name: 'Armored Core VI: Fires of Rubicon',
    minimum: { cpuScore: 70, gpuScore: 75, ram: 12, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 32, storage: 60, requiresSSD: true }
  },
  
  '1282100': { // Remnant II
    name: 'Remnant II',
    minimum: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 80, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 85, ram: 16, storage: 80, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 90, ram: 32, storage: 80, requiresSSD: true }
  },
  
  '1868140': { // Dave the Diver
    name: 'Dave the Diver',
    minimum: { cpuScore: 50, gpuScore: 55, ram: 8, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 65, ram: 16, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 32, storage: 5, requiresSSD: false }
  },
  
  '1562430': { // Dredge
    name: 'Dredge',
    minimum: { cpuScore: 50, gpuScore: 55, ram: 4, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 65, ram: 6, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 12, storage: 2, requiresSSD: false }
  },
  
  // === 2024 ===
  '553850': { // Helldivers 2
    name: 'Helldivers 2',
    minimum: { cpuScore: 60, gpuScore: 52, ram: 8, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 66, ram: 16, storage: 100, requiresSSD: true },
    ultra: { cpuScore: 85, gpuScore: 80, ram: 16, storage: 100, requiresSSD: true }
  },
  
  '1623730': { // Palworld
    name: 'Palworld',
    minimum: { cpuScore: 50, gpuScore: 50, ram: 16, storage: 40, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 70, ram: 32, storage: 40, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 85, ram: 32, storage: 40, requiresSSD: true }
  },
  
  '2358720': { // Black Myth: Wukong
    name: 'Black Myth: Wukong',
    minimum: { cpuScore: 60, gpuScore: 62, ram: 16, storage: 130, requiresSSD: true },
    recommended: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 130, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 85, ram: 32, storage: 130, requiresSSD: true }
  },
  
  '2767030': { // Marvel Rivals (placeholder)
    name: 'Marvel Rivals',
    minimum: { cpuScore: 60, gpuScore: 62, ram: 12, storage: 70, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 70, requiresSSD: true },
    ultra: { cpuScore: 85, gpuScore: 80, ram: 16, storage: 70, requiresSSD: true }
  },
  
  '1845910': { // Dragon Age: The Veilguard
    name: 'Dragon Age: The Veilguard',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 16, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 100, requiresSSD: true },
    ultra: { cpuScore: 85, gpuScore: 80, ram: 32, storage: 100, requiresSSD: true }
  },
  
  '1643320': { // S.T.A.L.K.E.R. 2
    name: 'S.T.A.L.K.E.R. 2: Heart of Chornobyl',
    minimum: { cpuScore: 60, gpuScore: 62, ram: 16, storage: 150, requiresSSD: true },
    recommended: { cpuScore: 75, gpuScore: 78, ram: 32, storage: 150, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 88, ram: 32, storage: 150, requiresSSD: true }
  },
  
  '2215430': { // Balatro
    name: 'Balatro',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 50, gpuScore: 55, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 65, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '2215950': { // Ghost of Tsushima
    name: 'Ghost of Tsushima DIRECTOR\'S CUT',
    minimum: { cpuScore: 70, gpuScore: 70, ram: 8, storage: 75, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 75, requiresSSD: false },
    ultra: { cpuScore: 90, gpuScore: 90, ram: 32, storage: 75, requiresSSD: true }
  },
  
  '1363080': { // Manor Lords
    name: 'Manor Lords',
    minimum: { cpuScore: 65, gpuScore: 72, ram: 8, storage: 16, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 75, ram: 16, storage: 16, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 32, storage: 16, requiresSSD: true }
  },
  
  '2054970': { // Dragon's Dogma 2
    name: 'Dragon\'s Dogma 2',
    minimum: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 150, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 150, requiresSSD: false },
    ultra: { cpuScore: 90, gpuScore: 90, ram: 32, storage: 150, requiresSSD: true }
  },
  
  '526870': { // Satisfactory
    name: 'Satisfactory',
    minimum: { cpuScore: 70, gpuScore: 75, ram: 8, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 80, gpuScore: 85, ram: 16, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 90, gpuScore: 90, ram: 32, storage: 20, requiresSSD: true }
  },
  
  '2183900': { // Warhammer 40,000: Space Marine 2
    name: 'Warhammer 40,000: Space Marine 2',
    minimum: { cpuScore: 75, gpuScore: 75, ram: 12, storage: 75, requiresSSD: false },
    recommended: { cpuScore: 85, gpuScore: 90, ram: 16, storage: 75, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 95, ram: 32, storage: 75, requiresSSD: true }
  },
  
  '1601580': { // Frostpunk 2
    name: 'Frostpunk 2',
    minimum: { cpuScore: 70, gpuScore: 72, ram: 16, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 85, gpuScore: 85, ram: 16, storage: 30, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 92, ram: 32, storage: 30, requiresSSD: true }
  },
  
  '1778820': { // Tekken 8
    name: 'Tekken 8',
    minimum: { cpuScore: 65, gpuScore: 72, ram: 8, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 85, ram: 16, storage: 100, requiresSSD: false },
    ultra: { cpuScore: 90, gpuScore: 90, ram: 32, storage: 100, requiresSSD: true }
  },
  
  '1574140': { // Animal Well
    name: 'Animal Well',
    minimum: { cpuScore: 50, gpuScore: 30, ram: 4, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 55, ram: 8, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 65, ram: 16, storage: 1, requiresSSD: false }
  },
  
  '1458140': { // Pacific Drive
    name: 'Pacific Drive',
    minimum: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 88, ram: 16, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 90, gpuScore: 92, ram: 32, storage: 20, requiresSSD: true }
  },
  
  // === 2025 ===
  '2282330': { // Monster Hunter Wilds
    name: 'Monster Hunter Wilds',
    minimum: { cpuScore: 70, gpuScore: 78, ram: 16, storage: 140, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 85, ram: 16, storage: 140, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 92, ram: 32, storage: 140, requiresSSD: true }
  },
  
  '2280110': { // DOOM: The Dark Ages
    name: 'DOOM: The Dark Ages',
    minimum: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 100, requiresSSD: true },
    recommended: { cpuScore: 85, gpuScore: 92, ram: 32, storage: 100, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 95, ram: 64, storage: 100, requiresSSD: true }
  },
  
  '2281450': { // Kingdom Come: Deliverance II
    name: 'Kingdom Come: Deliverance II',
    minimum: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 85, gpuScore: 92, ram: 32, storage: 100, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 95, ram: 64, storage: 100, requiresSSD: true }
  },
  
  '1295660': { // Sid Meier's Civilization VII
    name: "Sid Meier's Civilization VII",
    minimum: { cpuScore: 80, gpuScore: 72, ram: 8, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 88, ram: 16, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 90, gpuScore: 92, ram: 32, storage: 20, requiresSSD: true }
  },
  
  '2281460': { // Mafia: The Old Country
    name: 'Mafia: The Old Country',
    minimum: { cpuScore: 80, gpuScore: 85, ram: 16, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 85, gpuScore: 92, ram: 32, storage: 100, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 95, ram: 64, storage: 100, requiresSSD: true }
  },
  
  '2555140': { // Borderlands 4
    name: 'Borderlands 4',
    minimum: { cpuScore: 70, gpuScore: 85, ram: 16, storage: 75, requiresSSD: false },
    recommended: { cpuScore: 85, gpuScore: 95, ram: 32, storage: 75, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 98, ram: 64, storage: 75, requiresSSD: true }
  },
  
  '1030301': { // Like a Dragon: Pirate Yakuza in Hawaii
    name: 'Like a Dragon: Pirate Yakuza in Hawaii',
    minimum: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 80, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 85, ram: 16, storage: 80, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 90, ram: 32, storage: 80, requiresSSD: true }
  },
  
  '2281470': { // The First Berserker: Khazan
    name: 'The First Berserker: Khazan',
    minimum: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 70, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 88, ram: 16, storage: 70, requiresSSD: false },
    ultra: { cpuScore: 90, gpuScore: 92, ram: 32, storage: 70, requiresSSD: true }
  },
  
  // === 2026 ===
  '2281480': { // Death Stranding 2: On the Beach
    name: 'Death Stranding 2: On the Beach',
    minimum: { cpuScore: 80, gpuScore: 78, ram: 16, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 85, gpuScore: 90, ram: 16, storage: 100, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 95, ram: 32, storage: 100, requiresSSD: true }
  },
  
  '2281490': { // Crimson Desert
    name: 'Crimson Desert',
    minimum: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 85, ram: 16, storage: 100, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 92, ram: 32, storage: 100, requiresSSD: true }
  },
  
  '2162350': { // Slay the Spire 2
    name: 'Slay the Spire 2',
    minimum: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 2, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 2, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 2, requiresSSD: false }
  },
  
  '2281500': { // Tomb Raider: Legacy of Atlantis
    name: 'Tomb Raider: Legacy of Atlantis',
    minimum: { cpuScore: 80, gpuScore: 85, ram: 16, storage: 80, requiresSSD: false },
    recommended: { cpuScore: 85, gpuScore: 92, ram: 32, storage: 80, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 95, ram: 64, storage: 80, requiresSSD: true }
  },
  
  '2281510': { // Resident Evil: Requiem
    name: 'Resident Evil: Requiem',
    minimum: { cpuScore: 75, gpuScore: 80, ram: 16, storage: 70, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 88, ram: 16, storage: 70, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 92, ram: 32, storage: 70, requiresSSD: true }
  },
  
  '2281520': { // Control 2
    name: 'Control 2',
    minimum: { cpuScore: 75, gpuScore: 88, ram: 16, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 90, gpuScore: 95, ram: 32, storage: 100, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 98, ram: 64, storage: 100, requiresSSD: true }
  },
  
  '1628030': { // ARC Raiders
    name: 'ARC Raiders',
    minimum: { cpuScore: 65, gpuScore: 72, ram: 12, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 85, ram: 16, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 90, ram: 32, storage: 50, requiresSSD: true }
  },
  
  '2281530': { // Phantom Blade Zero
    name: 'Phantom Blade Zero',
    minimum: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 70, requiresSSD: false },
    recommended: { cpuScore: 85, gpuScore: 90, ram: 32, storage: 70, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 95, ram: 64, storage: 70, requiresSSD: true }
  },
  
  '2281540': { // Fable
    name: 'Fable',
    minimum: { cpuScore: 70, gpuScore: 85, ram: 16, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 85, gpuScore: 95, ram: 32, storage: 100, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 98, ram: 64, storage: 100, requiresSSD: true }
  },
  
  '1643330': { // Anno 117: Pax Romana
    name: 'Anno 117: Pax Romana',
    minimum: { cpuScore: 70, gpuScore: 78, ram: 16, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 85, ram: 16, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 90, ram: 32, storage: 60, requiresSSD: true }
  },
  
  // === INDIE/LIGHTER ===
  '1030300': { // Hollow Knight: Silksong (placeholder)
    name: 'Hollow Knight: Silksong',
    minimum: { cpuScore: 30, gpuScore: 35, ram: 4, storage: 10, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 48, ram: 8, storage: 10, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 60, ram: 16, storage: 10, requiresSSD: false }
  },
  
  // === SANDBOX ===
  '1600': { // Roblox (placeholder)
    name: 'Roblox',
    minimum: { cpuScore: 25, gpuScore: 20, ram: 1, storage: 1, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 42, ram: 4, storage: 1, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 55, ram: 8, storage: 1, requiresSSD: false }
  },
  
  '1142711': { // Minecraft (Java Edition placeholder)
    name: 'Minecraft',
    minimum: { cpuScore: 35, gpuScore: 20, ram: 4, storage: 4, requiresSSD: false },
    recommended: { cpuScore: 50, gpuScore: 55, ram: 8, storage: 4, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 4, requiresSSD: false }
  },
  
  // === ADDITIONAL 2015 GAMES ===
  
  '111800': { // League of Legends (placeholder)
    name: 'League of Legends',
    minimum: { cpuScore: 30, gpuScore: 25, ram: 2, storage: 16, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 38, ram: 4, storage: 16, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 55, ram: 8, storage: 16, requiresSSD: false }
  },
  
  '570': { // Dota 2
    name: 'Dota 2',
    minimum: { cpuScore: 35, gpuScore: 30, ram: 4, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 48, ram: 8, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 16, storage: 15, requiresSSD: false }
  },
  
  '1222670': { // The Sims 4
    name: 'The Sims 4',
    minimum: { cpuScore: 35, gpuScore: 20, ram: 4, storage: 26, requiresSSD: false },
    recommended: { cpuScore: 55, gpuScore: 52, ram: 8, storage: 26, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 26, requiresSSD: false }
  },
  
  '230410': { // Warframe
    name: 'Warframe',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 62, ram: 8, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 50, requiresSSD: true }
  },
  
  // === 2016 GAMES ===
  '275850': { // No Man's Sky
    name: "No Man's Sky",
    minimum: { cpuScore: 35, gpuScore: 62, ram: 8, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 65, ram: 16, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 80, ram: 16, storage: 15, requiresSSD: true }
  },
  
  // === 2017 GAMES ===
  
  '414340': { // Hellblade: Senua's Sacrifice
    name: "Hellblade: Senua's Sacrifice",
    minimum: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 30, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 30, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 30, requiresSSD: true }
  },
  
  '1085660': { // Destiny 2
    name: 'Destiny 2',
    minimum: { cpuScore: 35, gpuScore: 48, ram: 6, storage: 105, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 60, ram: 8, storage: 105, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 105, requiresSSD: true }
  },
  
  // === 2018 GAMES ===
  '637650': { // Final Fantasy XV
    name: 'Final Fantasy XV',
    minimum: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 55, gpuScore: 62, ram: 16, storage: 100, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 100, requiresSSD: true }
  },
  
  '1172620': { // Sea of Thieves
    name: 'Sea of Thieves',
    minimum: { cpuScore: 30, gpuScore: 42, ram: 4, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 50, requiresSSD: true }
  },
  
  '812140': { // Assassin's Creed Odyssey
    name: "Assassin's Creed Odyssey",
    minimum: { cpuScore: 40, gpuScore: 48, ram: 8, storage: 46, requiresSSD: false },
    recommended: { cpuScore: 55, gpuScore: 60, ram: 8, storage: 46, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 46, requiresSSD: true }
  },
  
  '264710': { // Subnautica
    name: 'Subnautica',
    minimum: { cpuScore: 35, gpuScore: 20, ram: 4, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 52, ram: 8, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 65, gpuScore: 65, ram: 16, storage: 20, requiresSSD: false }
  },
  
  // === 2019 GAMES ===
  
  // === 2020 GAMES ===
  '1190460': { // Death Stranding
    name: 'Death Stranding',
    minimum: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 80, requiresSSD: false },
    recommended: { cpuScore: 55, gpuScore: 62, ram: 8, storage: 80, requiresSSD: false },
    ultra: { cpuScore: 75, gpuScore: 75, ram: 16, storage: 80, requiresSSD: true }
  },
  
  '739630': { // Phasmophobia
    name: 'Phasmophobia',
    minimum: { cpuScore: 55, gpuScore: 60, ram: 8, storage: 18, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 18, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 80, ram: 16, storage: 18, requiresSSD: true }
  },
  
  // === 2022 GAMES ===
  
  // === 2023 GAMES ===
  
  '949230': { // Cities: Skylines II
    name: 'Cities: Skylines II',
    minimum: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 80, gpuScore: 88, ram: 16, storage: 60, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 92, ram: 32, storage: 60, requiresSSD: true }
  },
  
  '1144200': { // Ready or Not
    name: 'Ready or Not',
    minimum: { cpuScore: 45, gpuScore: 48, ram: 8, storage: 90, requiresSSD: false },
    recommended: { cpuScore: 65, gpuScore: 62, ram: 16, storage: 90, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 90, requiresSSD: true }
  },
  
  '1874880': { // Arma Reforger
    name: 'Arma Reforger',
    minimum: { cpuScore: 45, gpuScore: 58, ram: 8, storage: 20, requiresSSD: false },
    recommended: { cpuScore: 60, gpuScore: 68, ram: 16, storage: 20, requiresSSD: false },
    ultra: { cpuScore: 80, gpuScore: 80, ram: 16, storage: 20, requiresSSD: true }
  },
  
  '1282590': { // Remnant II
    name: 'Remnant II',
    minimum: { cpuScore: 55, gpuScore: 58, ram: 16, storage: 80, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 80, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 80, ram: 32, storage: 80, requiresSSD: true }
  },
  
  '1501750': { // Lords of the Fallen
    name: 'Lords of the Fallen',
    minimum: { cpuScore: 60, gpuScore: 62, ram: 16, storage: 45, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 45, requiresSSD: true },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 32, storage: 45, requiresSSD: true }
  },
  
  // === 2024 GAMES ===
  '1203620': { // Enshrouded
    name: 'Enshrouded',
    minimum: { cpuScore: 55, gpuScore: 62, ram: 16, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 60, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 32, storage: 60, requiresSSD: true }
  },
  
  '1943960': { // Banishers: Ghosts of New Eden
    name: 'Banishers: Ghosts of New Eden',
    minimum: { cpuScore: 35, gpuScore: 65, ram: 16, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 80, ram: 32, storage: 50, requiresSSD: true }
  },
  
  '2074920': { // Arena Breakout: Infinite
    name: 'Arena Breakout: Infinite',
    minimum: { cpuScore: 65, gpuScore: 48, ram: 16, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 75, gpuScore: 65, ram: 32, storage: 60, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 85, ram: 32, storage: 60, requiresSSD: true }
  },
  
  '2650540': { // Bodycam
    name: 'Bodycam',
    minimum: { cpuScore: 70, gpuScore: 70, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 80, gpuScore: 88, ram: 16, storage: 50, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 95, ram: 32, storage: 50, requiresSSD: true }
  },
  
  // === 2025 GAMES ===
  '1203220': { // Path of Exile 2
    name: 'Path of Exile 2',
    minimum: { cpuScore: 40, gpuScore: 48, ram: 8, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 100, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 32, storage: 100, requiresSSD: true }
  },
  
  '1649240': { // ARC Raiders (placeholder)
    name: 'ARC Raiders',
    minimum: { cpuScore: 60, gpuScore: 52, ram: 12, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 85, ram: 32, storage: 50, requiresSSD: true }
  },
  
  '2379780': { // Clair Obscur: Expedition 33 (placeholder)
    name: 'Clair Obscur: Expedition 33',
    minimum: { cpuScore: 75, gpuScore: 65, ram: 16, storage: 70, requiresSSD: false },
    recommended: { cpuScore: 80, gpuScore: 78, ram: 16, storage: 70, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 88, ram: 32, storage: 70, requiresSSD: true }
  },
  
  '2456100': { // Ghost of Yotei (placeholder)
    name: 'Ghost of Yotei',
    minimum: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 80, requiresSSD: false },
    recommended: { cpuScore: 90, gpuScore: 85, ram: 16, storage: 80, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 92, ram: 32, storage: 80, requiresSSD: true }
  },
  
  '2567120': { // Mafia: The Old Country (placeholder)
    name: 'Mafia: The Old Country',
    minimum: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 70, requiresSSD: false },
    recommended: { cpuScore: 90, gpuScore: 85, ram: 16, storage: 70, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 92, ram: 32, storage: 70, requiresSSD: true }
  },
  
  '2501870': { // Judas (placeholder)
    name: 'Judas',
    minimum: { cpuScore: 80, gpuScore: 77, ram: 16, storage: 80, requiresSSD: true },
    recommended: { cpuScore: 90, gpuScore: 88, ram: 32, storage: 80, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 95, ram: 32, storage: 80, requiresSSD: true }
  },
  
  '2379760': { // Dying Light: The Beast (placeholder)
    name: 'Dying Light: The Beast',
    minimum: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 60, requiresSSD: false },
    recommended: { cpuScore: 80, gpuScore: 78, ram: 16, storage: 60, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 88, ram: 32, storage: 60, requiresSSD: true }
  },
  
  '1898300': { // Fable (placeholder)
    name: 'Fable',
    minimum: { cpuScore: 80, gpuScore: 77, ram: 16, storage: 80, requiresSSD: false },
    recommended: { cpuScore: 90, gpuScore: 85, ram: 32, storage: 80, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 92, ram: 32, storage: 80, requiresSSD: true }
  },
  
  '1649200': { // Marathon (placeholder)
    name: 'Marathon',
    minimum: { cpuScore: 75, gpuScore: 70, ram: 16, storage: 70, requiresSSD: false },
    recommended: { cpuScore: 80, gpuScore: 88, ram: 16, storage: 70, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 92, ram: 32, storage: 70, requiresSSD: true }
  },
  
  '1145371': { // Hades II
    name: 'Hades II',
    minimum: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 15, requiresSSD: false },
    recommended: { cpuScore: 45, gpuScore: 40, ram: 8, storage: 15, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 55, ram: 16, storage: 15, requiresSSD: false }
  },
  
  '2561560': { // The Last of Us Part II (placeholder)
    name: 'The Last of Us Part II Remastered',
    minimum: { cpuScore: 70, gpuScore: 65, ram: 16, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 80, gpuScore: 75, ram: 32, storage: 100, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 88, ram: 32, storage: 100, requiresSSD: true }
  },
  
  '2379790': { // Fatal Fury: City of the Wolves (placeholder)
    name: 'Fatal Fury: City of the Wolves',
    minimum: { cpuScore: 55, gpuScore: 62, ram: 8, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 50, requiresSSD: false },
    ultra: { cpuScore: 85, gpuScore: 80, ram: 16, storage: 50, requiresSSD: true }
  },
  
  '2567130': { // Slay the Spire 2 (placeholder)
    name: 'Slay the Spire 2',
    minimum: { cpuScore: 25, gpuScore: 25, ram: 4, storage: 5, requiresSSD: false },
    recommended: { cpuScore: 40, gpuScore: 35, ram: 8, storage: 5, requiresSSD: false },
    ultra: { cpuScore: 60, gpuScore: 50, ram: 16, storage: 5, requiresSSD: false }
  },
  
  // === 2026 GAMES ===
  '2567140': { // Borderlands 4 (placeholder)
    name: 'Borderlands 4',
    minimum: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 90, gpuScore: 85, ram: 32, storage: 100, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 92, ram: 32, storage: 100, requiresSSD: true }
  },
  
  '2567150': { // Death Stranding 2 (placeholder)
    name: 'Death Stranding 2: On the Beach',
    minimum: { cpuScore: 65, gpuScore: 65, ram: 16, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 100, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 88, ram: 32, storage: 100, requiresSSD: true }
  },
  
  '2567160': { // Battlefield 6 (placeholder)
    name: 'Battlefield 6',
    minimum: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 100, requiresSSD: true },
    recommended: { cpuScore: 95, gpuScore: 92, ram: 32, storage: 100, requiresSSD: true },
    ultra: { cpuScore: 98, gpuScore: 96, ram: 32, storage: 100, requiresSSD: true }
  },
  
  '2567170': { // Ninja Gaiden 4 (placeholder)
    name: 'Ninja Gaiden 4',
    minimum: { cpuScore: 70, gpuScore: 58, ram: 16, storage: 50, requiresSSD: false },
    recommended: { cpuScore: 80, gpuScore: 77, ram: 16, storage: 50, requiresSSD: true },
    ultra: { cpuScore: 90, gpuScore: 88, ram: 32, storage: 50, requiresSSD: true }
  },
  
  '2567180': { // The Elder Scrolls VI (placeholder)
    name: 'The Elder Scrolls VI',
    minimum: { cpuScore: 90, gpuScore: 75, ram: 16, storage: 150, requiresSSD: true },
    recommended: { cpuScore: 95, gpuScore: 88, ram: 32, storage: 150, requiresSSD: true },
    ultra: { cpuScore: 98, gpuScore: 96, ram: 32, storage: 150, requiresSSD: true }
  },
  
  '2567190': { // Star Wars: Eclipse (placeholder)
    name: 'Star Wars: Eclipse',
    minimum: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 100, requiresSSD: false },
    recommended: { cpuScore: 90, gpuScore: 92, ram: 32, storage: 100, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 95, ram: 32, storage: 100, requiresSSD: true }
  },
  
  '2567200': { // Control 2 (placeholder)
    name: 'Control 2',
    minimum: { cpuScore: 85, gpuScore: 75, ram: 16, storage: 70, requiresSSD: true },
    recommended: { cpuScore: 95, gpuScore: 88, ram: 32, storage: 70, requiresSSD: true },
    ultra: { cpuScore: 98, gpuScore: 95, ram: 32, storage: 70, requiresSSD: true }
  },
  
  '2567210': { // Marvel's Wolverine (placeholder)
    name: "Marvel's Wolverine",
    minimum: { cpuScore: 80, gpuScore: 75, ram: 16, storage: 80, requiresSSD: false },
    recommended: { cpuScore: 90, gpuScore: 92, ram: 32, storage: 80, requiresSSD: true },
    ultra: { cpuScore: 95, gpuScore: 95, ram: 32, storage: 80, requiresSSD: true }
  }
};
