// GameRequirementsHeuristics.js
// Estimates hardware requirements for games not in the explicit database.
// Uses name-pattern matching, genre heuristics, and release-year proxies.

export class GameRequirementsHeuristics {
  // Known high-demand modern games (name pattern -> requirements)
  static KNOWN_GAMES = {
    // AAA Open World / Action-Adventure (2020+)
    'cyberpunk2077': { min: { cpuScore: 45, gpuScore: 50, ram: 12, storage: 70, requiresSSD: true }, rec: { cpuScore: 65, gpuScore: 75, ram: 16, storage: 70, requiresSSD: true }, ultra: { cpuScore: 85, gpuScore: 95, ram: 24, storage: 70, requiresSSD: true } },
    'cyberpunk':     { min: { cpuScore: 45, gpuScore: 50, ram: 12, storage: 70, requiresSSD: true }, rec: { cpuScore: 65, gpuScore: 75, ram: 16, storage: 70, requiresSSD: true }, ultra: { cpuScore: 85, gpuScore: 95, ram: 24, storage: 70, requiresSSD: true } },
    'witcher3':      { min: { cpuScore: 30, gpuScore: 35, ram: 6,  storage: 35, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 55, ram: 8,  storage: 35, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 75, ram: 12, storage: 35, requiresSSD: false } },
    'witcher':       { min: { cpuScore: 30, gpuScore: 35, ram: 6,  storage: 35, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 55, ram: 8,  storage: 35, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 75, ram: 12, storage: 35, requiresSSD: false } },
    'eldenring':     { min: { cpuScore: 45, gpuScore: 50, ram: 12, storage: 60, requiresSSD: true }, rec: { cpuScore: 60, gpuScore: 70, ram: 16, storage: 60, requiresSSD: true }, ultra: { cpuScore: 80, gpuScore: 90, ram: 24, storage: 60, requiresSSD: true } },
    'reddead2':      { min: { cpuScore: 45, gpuScore: 50, ram: 8,  storage: 150, requiresSSD: true }, rec: { cpuScore: 60, gpuScore: 70, ram: 12, storage: 150, requiresSSD: true }, ultra: { cpuScore: 80, gpuScore: 90, ram: 16, storage: 150, requiresSSD: true } },
    'reddead':       { min: { cpuScore: 45, gpuScore: 50, ram: 8,  storage: 150, requiresSSD: true }, rec: { cpuScore: 60, gpuScore: 70, ram: 12, storage: 150, requiresSSD: true }, ultra: { cpuScore: 80, gpuScore: 90, ram: 16, storage: 150, requiresSSD: true } },
    'gtav':          { min: { cpuScore: 35, gpuScore: 40, ram: 4,  storage: 72, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8,  storage: 72, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 72, requiresSSD: true } },
    'gta5':          { min: { cpuScore: 35, gpuScore: 40, ram: 4,  storage: 72, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8,  storage: 72, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 72, requiresSSD: true } },
    'gta':           { min: { cpuScore: 35, gpuScore: 40, ram: 4,  storage: 72, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8,  storage: 72, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 72, requiresSSD: true } },
    'horizonzerodawn': { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 100, requiresSSD: true }, rec: { cpuScore: 55, gpuScore: 65, ram: 16, storage: 100, requiresSSD: true }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 100, requiresSSD: true } },
    'horizonforbiddenwest': { min: { cpuScore: 55, gpuScore: 60, ram: 16, storage: 150, requiresSSD: true }, rec: { cpuScore: 75, gpuScore: 80, ram: 16, storage: 150, requiresSSD: true }, ultra: { cpuScore: 90, gpuScore: 95, ram: 32, storage: 150, requiresSSD: true } },
    'ghostoftsushima': { min: { cpuScore: 50, gpuScore: 55, ram: 16, storage: 60, requiresSSD: true }, rec: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 60, requiresSSD: true }, ultra: { cpuScore: 85, gpuScore: 90, ram: 24, storage: 60, requiresSSD: true } },
    'spiderman':     { min: { cpuScore: 45, gpuScore: 50, ram: 8,  storage: 75, requiresSSD: true }, rec: { cpuScore: 60, gpuScore: 70, ram: 16, storage: 75, requiresSSD: true }, ultra: { cpuScore: 80, gpuScore: 90, ram: 16, storage: 75, requiresSSD: true } },
    'godofwar':      { min: { cpuScore: 45, gpuScore: 50, ram: 8,  storage: 70, requiresSSD: true }, rec: { cpuScore: 60, gpuScore: 70, ram: 8,  storage: 70, requiresSSD: true }, ultra: { cpuScore: 80, gpuScore: 90, ram: 16, storage: 70, requiresSSD: true } },
    'assassinscreed': { min: { cpuScore: 35, gpuScore: 40, ram: 6, storage: 45, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 45, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 45, requiresSSD: true } },
    'assassinscreedvalhalla': { min: { cpuScore: 50, gpuScore: 55, ram: 8, storage: 50, requiresSSD: true }, rec: { cpuScore: 65, gpuScore: 75, ram: 16, storage: 50, requiresSSD: true }, ultra: { cpuScore: 85, gpuScore: 90, ram: 16, storage: 50, requiresSSD: true } },
    'assassinscreedodyssey': { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 46, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 46, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 46, requiresSSD: true } },
    'assassinscreedorigins': { min: { cpuScore: 40, gpuScore: 45, ram: 6, storage: 42, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 42, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 42, requiresSSD: true } },
    'farcry':        { min: { cpuScore: 35, gpuScore: 40, ram: 8, storage: 40, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 40, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 40, requiresSSD: true } },
    'farcry6':       { min: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 60, requiresSSD: true }, rec: { cpuScore: 60, gpuScore: 70, ram: 16, storage: 60, requiresSSD: true }, ultra: { cpuScore: 80, gpuScore: 90, ram: 16, storage: 60, requiresSSD: true } },
    'watchdogs':     { min: { cpuScore: 40, gpuScore: 45, ram: 6, storage: 45, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 45, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 45, requiresSSD: true } },
    'daysgone':      { min: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 70, requiresSSD: true }, rec: { cpuScore: 60, gpuScore: 70, ram: 16, storage: 70, requiresSSD: true }, ultra: { cpuScore: 80, gpuScore: 90, ram: 16, storage: 70, requiresSSD: true } },
    'lastofus':      { min: { cpuScore: 55, gpuScore: 60, ram: 16, storage: 100, requiresSSD: true }, rec: { cpuScore: 75, gpuScore: 80, ram: 16, storage: 100, requiresSSD: true }, ultra: { cpuScore: 90, gpuScore: 95, ram: 32, storage: 100, requiresSSD: true } },
    'metroexodus':   { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 59, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 59, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 59, requiresSSD: true } },
    'metro':         { min: { cpuScore: 35, gpuScore: 40, ram: 4, storage: 10, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 10, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 8, storage: 10, requiresSSD: false } },
    'dyinglight':    { min: { cpuScore: 35, gpuScore: 40, ram: 8, storage: 40, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 40, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 40, requiresSSD: true } },
    'dyinglight2':   { min: { cpuScore: 50, gpuScore: 55, ram: 8, storage: 60, requiresSSD: true }, rec: { cpuScore: 65, gpuScore: 75, ram: 16, storage: 60, requiresSSD: true }, ultra: { cpuScore: 85, gpuScore: 90, ram: 16, storage: 60, requiresSSD: true } },
    'dragonsdogma2': { min: { cpuScore: 55, gpuScore: 60, ram: 16, storage: 80, requiresSSD: true }, rec: { cpuScore: 75, gpuScore: 80, ram: 16, storage: 80, requiresSSD: true }, ultra: { cpuScore: 90, gpuScore: 95, ram: 32, storage: 80, requiresSSD: true } },
    'dragonsdogma':  { min: { cpuScore: 30, gpuScore: 35, ram: 4, storage: 20, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 6, storage: 20, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 20, requiresSSD: false } },
    'baldursgate3':  { min: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 150, requiresSSD: true }, rec: { cpuScore: 60, gpuScore: 70, ram: 16, storage: 150, requiresSSD: true }, ultra: { cpuScore: 80, gpuScore: 90, ram: 16, storage: 150, requiresSSD: true } },
    'baldursgate':   { min: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 150, requiresSSD: true }, rec: { cpuScore: 60, gpuScore: 70, ram: 16, storage: 150, requiresSSD: true }, ultra: { cpuScore: 80, gpuScore: 90, ram: 16, storage: 150, requiresSSD: true } },
    'starfield':     { min: { cpuScore: 50, gpuScore: 55, ram: 16, storage: 140, requiresSSD: true }, rec: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 140, requiresSSD: true }, ultra: { cpuScore: 90, gpuScore: 95, ram: 32, storage: 140, requiresSSD: true } },
    'fallout4':      { min: { cpuScore: 35, gpuScore: 40, ram: 8, storage: 30, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 30, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 30, requiresSSD: true } },
    'fallout':       { min: { cpuScore: 30, gpuScore: 35, ram: 4, storage: 30, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 30, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 30, requiresSSD: false } },
    'skyrim':        { min: { cpuScore: 30, gpuScore: 35, ram: 2, storage: 6,  requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 50, ram: 4, storage: 6,  requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 70, ram: 8, storage: 6,  requiresSSD: false } },
    'oblivion':      { min: { cpuScore: 25, gpuScore: 20, ram: 0.5, storage: 4, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 35, ram: 1, storage: 4, requiresSSD: false }, ultra: { cpuScore: 50, gpuScore: 50, ram: 2, storage: 4, requiresSSD: false } },
    'hogwartslegacy': { min: { cpuScore: 50, gpuScore: 55, ram: 16, storage: 85, requiresSSD: true }, rec: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 85, requiresSSD: true }, ultra: { cpuScore: 90, gpuScore: 95, ram: 32, storage: 85, requiresSSD: true } },
    'batmanarkham':  { min: { cpuScore: 35, gpuScore: 40, ram: 4, storage: 20, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 20, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 8, storage: 20, requiresSSD: false } },
    'arkham':        { min: { cpuScore: 35, gpuScore: 40, ram: 4, storage: 20, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 20, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 8, storage: 20, requiresSSD: false } },
    'mortal kombat': { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 60, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 60, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 60, requiresSSD: true } },
    'tekken':        { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 50, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 50, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 50, requiresSSD: true } },
    'streetfighter': { min: { cpuScore: 40, gpuScore: 45, ram: 6, storage: 30, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 30, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 30, requiresSSD: true } },
    'soulslike':     { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 25, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 25, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 25, requiresSSD: true } },
    'darksouls':     { min: { cpuScore: 35, gpuScore: 40, ram: 4, storage: 8, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 8, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 8, storage: 8, requiresSSD: false } },
    'sekiro':        { min: { cpuScore: 40, gpuScore: 45, ram: 4, storage: 25, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 25, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 8, storage: 25, requiresSSD: true } },

    // Shooters
    'callofduty':    { min: { cpuScore: 50, gpuScore: 55, ram: 8, storage: 125, requiresSSD: true }, rec: { cpuScore: 65, gpuScore: 75, ram: 12, storage: 125, requiresSSD: true }, ultra: { cpuScore: 85, gpuScore: 90, ram: 16, storage: 125, requiresSSD: true } },
    'cod':           { min: { cpuScore: 50, gpuScore: 55, ram: 8, storage: 125, requiresSSD: true }, rec: { cpuScore: 65, gpuScore: 75, ram: 12, storage: 125, requiresSSD: true }, ultra: { cpuScore: 85, gpuScore: 90, ram: 16, storage: 125, requiresSSD: true } },
    'battlefield':   { min: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 50, requiresSSD: false }, rec: { cpuScore: 60, gpuScore: 70, ram: 12, storage: 50, requiresSSD: true }, ultra: { cpuScore: 80, gpuScore: 90, ram: 16, storage: 50, requiresSSD: true } },
    'apexlegends':   { min: { cpuScore: 40, gpuScore: 45, ram: 6, storage: 56, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 56, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 56, requiresSSD: true } },
    'valorant':      { min: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 20, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 50, ram: 4, storage: 20, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 20, requiresSSD: false } },
    'cs2':           { min: { cpuScore: 35, gpuScore: 40, ram: 4, storage: 85, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 85, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 85, requiresSSD: true } },
    'csgo':          { min: { cpuScore: 25, gpuScore: 30, ram: 2, storage: 15, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 45, ram: 4, storage: 15, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 15, requiresSSD: false } },
    'counterstrike': { min: { cpuScore: 30, gpuScore: 35, ram: 4, storage: 50, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 50, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 50, requiresSSD: false } },
    'overwatch':     { min: { cpuScore: 30, gpuScore: 35, ram: 4, storage: 30, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 55, ram: 6, storage: 30, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 30, requiresSSD: false } },
    'overwatch2':    { min: { cpuScore: 35, gpuScore: 40, ram: 6, storage: 50, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 50, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 50, requiresSSD: true } },
    'rainbowsix':    { min: { cpuScore: 35, gpuScore: 40, ram: 6, storage: 61, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 61, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 61, requiresSSD: true } },
    'tarkov':        { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 35, requiresSSD: true }, rec: { cpuScore: 55, gpuScore: 65, ram: 16, storage: 35, requiresSSD: true }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 35, requiresSSD: true } },
    'escapefromtarkov': { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 35, requiresSSD: true }, rec: { cpuScore: 55, gpuScore: 65, ram: 16, storage: 35, requiresSSD: true }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 35, requiresSSD: true } },
    'pubg':          { min: { cpuScore: 35, gpuScore: 40, ram: 8, storage: 30, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 30, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 30, requiresSSD: true } },
    'destiny2':      { min: { cpuScore: 40, gpuScore: 45, ram: 6, storage: 105, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 105, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 105, requiresSSD: true } },
    'halo':          { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 50, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 50, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 50, requiresSSD: true } },
    'doom':          { min: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 50, requiresSSD: false }, rec: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 50, requiresSSD: false }, ultra: { cpuScore: 80, gpuScore: 90, ram: 16, storage: 50, requiresSSD: true } },
    'doometernal':   { min: { cpuScore: 50, gpuScore: 55, ram: 8, storage: 50, requiresSSD: true }, rec: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 50, requiresSSD: true }, ultra: { cpuScore: 85, gpuScore: 90, ram: 16, storage: 50, requiresSSD: true } },
    'halflifealyx':  { min: { cpuScore: 55, gpuScore: 60, ram: 12, storage: 70, requiresSSD: true }, rec: { cpuScore: 75, gpuScore: 80, ram: 16, storage: 70, requiresSSD: true }, ultra: { cpuScore: 90, gpuScore: 95, ram: 24, storage: 70, requiresSSD: true } },

    // Sports / Racing
    'fifa':          { min: { cpuScore: 35, gpuScore: 40, ram: 8, storage: 50, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 50, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 50, requiresSSD: true } },
    'fc24':          { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 50, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 50, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 50, requiresSSD: true } },
    'fc25':          { min: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 50, requiresSSD: false }, rec: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 50, requiresSSD: false }, ultra: { cpuScore: 80, gpuScore: 90, ram: 16, storage: 50, requiresSSD: true } },
    'nba':           { min: { cpuScore: 35, gpuScore: 40, ram: 4, storage: 80, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 80, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 8, storage: 80, requiresSSD: false } },
    'forza':         { min: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 80, requiresSSD: true }, rec: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 80, requiresSSD: true }, ultra: { cpuScore: 80, gpuScore: 90, ram: 16, storage: 80, requiresSSD: true } },
    'granturismo':   { min: { cpuScore: 50, gpuScore: 55, ram: 16, storage: 100, requiresSSD: true }, rec: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 100, requiresSSD: true }, ultra: { cpuScore: 85, gpuScore: 90, ram: 24, storage: 100, requiresSSD: true } },
    'f1':            { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 80, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 80, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 80, requiresSSD: true } },
    'needforspeed':  { min: { cpuScore: 35, gpuScore: 40, ram: 8, storage: 50, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 50, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 50, requiresSSD: true } },
    'assetto':       { min: { cpuScore: 40, gpuScore: 45, ram: 4, storage: 20, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 20, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 20, requiresSSD: false } },

    // Strategy / Management
    'civilization':  { min: { cpuScore: 20, gpuScore: 15, ram: 4, storage: 12, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 30, ram: 8, storage: 12, requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 50, ram: 16, storage: 12, requiresSSD: false } },
    'civ':           { min: { cpuScore: 20, gpuScore: 15, ram: 4, storage: 12, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 30, ram: 8, storage: 12, requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 50, ram: 16, storage: 12, requiresSSD: false } },
    'totalwar':      { min: { cpuScore: 35, gpuScore: 40, ram: 5, storage: 35, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 35, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 35, requiresSSD: true } },
    'companyofheroes': { min: { cpuScore: 25, gpuScore: 25, ram: 4, storage: 30, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 40, ram: 8, storage: 30, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 30, requiresSSD: false } },
    'ageofempires':  { min: { cpuScore: 15, gpuScore: 10, ram: 2, storage: 30, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 20, ram: 4, storage: 30, requiresSSD: false }, ultra: { cpuScore: 40, gpuScore: 35, ram: 8, storage: 30, requiresSSD: false } },
    'anno':          { min: { cpuScore: 35, gpuScore: 35, ram: 8, storage: 40, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 55, ram: 8, storage: 40, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 40, requiresSSD: false } },
    'factorio':      { min: { cpuScore: 20, gpuScore: 15, ram: 4, storage: 1, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 25, ram: 8, storage: 1, requiresSSD: false }, ultra: { cpuScore: 50, gpuScore: 40, ram: 16, storage: 1, requiresSSD: false } },
    'satisfactory':  { min: { cpuScore: 35, gpuScore: 35, ram: 8, storage: 20, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 55, ram: 8, storage: 20, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 20, requiresSSD: false } },
    'cities':        { min: { cpuScore: 25, gpuScore: 20, ram: 4, storage: 4, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 35, ram: 8, storage: 4, requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 50, ram: 16, storage: 4, requiresSSD: false } },
    'crusaderkings': { min: { cpuScore: 30, gpuScore: 25, ram: 4, storage: 5, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 45, ram: 8, storage: 5, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 65, ram: 16, storage: 5, requiresSSD: false } },
    'stellaris':     { min: { cpuScore: 30, gpuScore: 25, ram: 4, storage: 6, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 45, ram: 8, storage: 6, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 65, ram: 16, storage: 6, requiresSSD: false } },
    'hearts of iron': { min: { cpuScore: 30, gpuScore: 25, ram: 4, storage: 2, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 45, ram: 8, storage: 2, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 65, ram: 16, storage: 2, requiresSSD: false } },

    // Survival / Crafting
    'minecraft':     { min: { cpuScore: 15, gpuScore: 15, ram: 2, storage: 1, requiresSSD: false }, rec: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 2, requiresSSD: false }, ultra: { cpuScore: 50, gpuScore: 50, ram: 8, storage: 2, requiresSSD: false } },
    'subnautica':    { min: { cpuScore: 30, gpuScore: 35, ram: 4, storage: 20, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 20, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 20, requiresSSD: false } },
    'rust':          { min: { cpuScore: 35, gpuScore: 35, ram: 10, storage: 12, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 50, ram: 16, storage: 12, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 12, requiresSSD: true } },
    'ark':           { min: { cpuScore: 35, gpuScore: 40, ram: 8, storage: 60, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 55, ram: 8, storage: 60, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 60, requiresSSD: true } },
    'valheim':       { min: { cpuScore: 30, gpuScore: 35, ram: 4, storage: 1, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 1, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 1, requiresSSD: false } },
    '7daystodie':    { min: { cpuScore: 30, gpuScore: 35, ram: 6, storage: 15, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 15, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 70, ram: 16, storage: 15, requiresSSD: false } },
    'projectzomboid': { min: { cpuScore: 20, gpuScore: 15, ram: 2, storage: 5, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 30, ram: 4, storage: 5, requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 50, ram: 8, storage: 5, requiresSSD: false } },
    'theforest':     { min: { cpuScore: 30, gpuScore: 35, ram: 4, storage: 5, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 4, storage: 5, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 5, requiresSSD: false } },
    'sonsoftheforest': { min: { cpuScore: 40, gpuScore: 45, ram: 12, storage: 20, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 16, storage: 20, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 20, requiresSSD: true } },
    'dayz':          { min: { cpuScore: 35, gpuScore: 40, ram: 8, storage: 16, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 55, ram: 12, storage: 16, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 75, ram: 16, storage: 16, requiresSSD: true } },
    'dysonsphere':   { min: { cpuScore: 30, gpuScore: 35, ram: 6, storage: 3, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 3, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 70, ram: 16, storage: 3, requiresSSD: false } },
    'spaceengineers': { min: { cpuScore: 30, gpuScore: 35, ram: 8, storage: 35, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 35, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 70, ram: 16, storage: 35, requiresSSD: false } },
    'empyrion':      { min: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 15, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 15, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 15, requiresSSD: false } },
    'astroneer':     { min: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 2, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 2, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 2, requiresSSD: false } },
    'nomanssky':     { min: { cpuScore: 30, gpuScore: 35, ram: 8, storage: 15, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 15, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 75, ram: 16, storage: 15, requiresSSD: true } },

    // RPG / Isometric
    'diablo':        { min: { cpuScore: 35, gpuScore: 40, ram: 8, storage: 50, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 16, storage: 50, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 50, requiresSSD: true } },
    'pathofexile':   { min: { cpuScore: 30, gpuScore: 35, ram: 8, storage: 40, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 40, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 75, ram: 16, storage: 40, requiresSSD: true } },
    'divinity':      { min: { cpuScore: 35, gpuScore: 35, ram: 4, storage: 25, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 55, ram: 8, storage: 25, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 75, ram: 8, storage: 25, requiresSSD: false } },
    'pillarsofeternity': { min: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 14, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 14, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 14, requiresSSD: false } },
    'discoelysium':  { min: { cpuScore: 25, gpuScore: 25, ram: 4, storage: 20, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 40, ram: 8, storage: 20, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 20, requiresSSD: false } },
    'mass effect':   { min: { cpuScore: 35, gpuScore: 40, ram: 4, storage: 55, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 55, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 55, requiresSSD: true } },
    'dragonage':     { min: { cpuScore: 35, gpuScore: 40, ram: 4, storage: 20, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 20, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 8, storage: 20, requiresSSD: false } },
    'finalfantasy':  { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 100, requiresSSD: true }, rec: { cpuScore: 55, gpuScore: 65, ram: 16, storage: 100, requiresSSD: true }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 100, requiresSSD: true } },
    'persona':       { min: { cpuScore: 30, gpuScore: 35, ram: 4, storage: 20, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 20, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 20, requiresSSD: false } },
    'monsterhunter': { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 48, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 48, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 48, requiresSSD: true } },
    'nier':          { min: { cpuScore: 35, gpuScore: 40, ram: 8, storage: 50, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 50, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 50, requiresSSD: true } },
    'yakuza':        { min: { cpuScore: 30, gpuScore: 35, ram: 4, storage: 40, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 40, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 40, requiresSSD: false } },
    'kingdomcome':   { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 70, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 70, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 70, requiresSSD: true } },
    'outerwilds':    { min: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 10, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 10, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 10, requiresSSD: false } },

    // Simulation / Life
    'thesims':       { min: { cpuScore: 25, gpuScore: 20, ram: 4, storage: 26, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 40, ram: 8, storage: 26, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 60, ram: 16, storage: 26, requiresSSD: false } },
    'simulator':     { min: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 20, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 20, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 70, ram: 16, storage: 20, requiresSSD: false } },
    'stardewvalley': { min: { cpuScore: 15, gpuScore: 15, ram: 2, storage: 0.5, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 25, ram: 4, storage: 0.5, requiresSSD: false }, ultra: { cpuScore: 45, gpuScore: 45, ram: 4, storage: 0.5, requiresSSD: false } },
    'terraria':      { min: { cpuScore: 15, gpuScore: 10, ram: 2, storage: 0.2, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 20, ram: 4, storage: 0.2, requiresSSD: false }, ultra: { cpuScore: 40, gpuScore: 35, ram: 4, storage: 0.2, requiresSSD: false } },
    'hollowknight':  { min: { cpuScore: 20, gpuScore: 15, ram: 2, storage: 8, requiresSSD: false }, rec: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 8, requiresSSD: false }, ultra: { cpuScore: 50, gpuScore: 50, ram: 4, storage: 8, requiresSSD: false } },
    'celeste':       { min: { cpuScore: 15, gpuScore: 15, ram: 2, storage: 1, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 25, ram: 4, storage: 1, requiresSSD: false }, ultra: { cpuScore: 45, gpuScore: 45, ram: 4, storage: 1, requiresSSD: false } },
    'hades':         { min: { cpuScore: 20, gpuScore: 20, ram: 4, storage: 15, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 35, ram: 8, storage: 15, requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 55, ram: 8, storage: 15, requiresSSD: false } },
    'hades2':        { min: { cpuScore: 25, gpuScore: 25, ram: 4, storage: 10, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 40, ram: 8, storage: 10, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 10, requiresSSD: false } },
    'bindingofisaac': { min: { cpuScore: 15, gpuScore: 10, ram: 2, storage: 0.5, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 20, ram: 4, storage: 0.5, requiresSSD: false }, ultra: { cpuScore: 45, gpuScore: 40, ram: 4, storage: 0.5, requiresSSD: false } },
    'slaythespire':  { min: { cpuScore: 15, gpuScore: 10, ram: 2, storage: 1, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 20, ram: 4, storage: 1, requiresSSD: false }, ultra: { cpuScore: 45, gpuScore: 40, ram: 4, storage: 1, requiresSSD: false } },
    'darkestdungeon': { min: { cpuScore: 20, gpuScore: 20, ram: 2, storage: 6, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 35, ram: 4, storage: 6, requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 55, ram: 8, storage: 6, requiresSSD: false } },
    'vampire':       { min: { cpuScore: 25, gpuScore: 25, ram: 4, storage: 7, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 40, ram: 8, storage: 7, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 7, requiresSSD: false } },
    'deadcells':     { min: { cpuScore: 20, gpuScore: 15, ram: 2, storage: 0.5, requiresSSD: false }, rec: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 0.5, requiresSSD: false }, ultra: { cpuScore: 50, gpuScore: 50, ram: 4, storage: 0.5, requiresSSD: false } },
    'dontstarve':    { min: { cpuScore: 15, gpuScore: 10, ram: 1, storage: 0.5, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 20, ram: 2, storage: 0.5, requiresSSD: false }, ultra: { cpuScore: 45, gpuScore: 40, ram: 4, storage: 0.5, requiresSSD: false } },
    'cuphead':       { min: { cpuScore: 20, gpuScore: 15, ram: 2, storage: 4, requiresSSD: false }, rec: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 4, requiresSSD: false }, ultra: { cpuScore: 50, gpuScore: 50, ram: 4, storage: 4, requiresSSD: false } },
    'undertale':     { min: { cpuScore: 10, gpuScore: 5, ram: 2, storage: 0.2, requiresSSD: false }, rec: { cpuScore: 20, gpuScore: 15, ram: 2, storage: 0.2, requiresSSD: false }, ultra: { cpuScore: 35, gpuScore: 30, ram: 4, storage: 0.2, requiresSSD: false } },
    'amongus':       { min: { cpuScore: 10, gpuScore: 5, ram: 1, storage: 0.25, requiresSSD: false }, rec: { cpuScore: 20, gpuScore: 15, ram: 1, storage: 0.25, requiresSSD: false }, ultra: { cpuScore: 35, gpuScore: 30, ram: 2, storage: 0.25, requiresSSD: false } },
    'fallguys':      { min: { cpuScore: 20, gpuScore: 20, ram: 8, storage: 2, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 35, ram: 8, storage: 2, requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 55, ram: 8, storage: 2, requiresSSD: false } },
    'geforcenow':    { min: { cpuScore: 20, gpuScore: 20, ram: 4, storage: 0.2, requiresSSD: false }, rec: { cpuScore: 30, gpuScore: 35, ram: 4, storage: 0.2, requiresSSD: false }, ultra: { cpuScore: 50, gpuScore: 55, ram: 8, storage: 0.2, requiresSSD: false } },

    // MMO / Live Service
    'worldofwarcraft': { min: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 70, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 50, ram: 8, storage: 70, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 70, requiresSSD: true } },
    'wow':           { min: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 70, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 50, ram: 8, storage: 70, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 70, ram: 16, storage: 70, requiresSSD: true } },
    'finalfantasyxiv': { min: { cpuScore: 30, gpuScore: 35, ram: 4, storage: 60, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 60, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 70, ram: 16, storage: 60, requiresSSD: false } },
    'guildwars':     { min: { cpuScore: 30, gpuScore: 30, ram: 4, storage: 35, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 45, ram: 8, storage: 35, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 65, ram: 8, storage: 35, requiresSSD: false } },
    'newworld':      { min: { cpuScore: 35, gpuScore: 40, ram: 8, storage: 50, requiresSSD: true }, rec: { cpuScore: 50, gpuScore: 60, ram: 16, storage: 50, requiresSSD: true }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 50, requiresSSD: true } },
    'eso':           { min: { cpuScore: 30, gpuScore: 35, ram: 3, storage: 80, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 80, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 70, ram: 16, storage: 80, requiresSSD: true } },
    'lostark':       { min: { cpuScore: 35, gpuScore: 40, ram: 8, storage: 50, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 50, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 50, requiresSSD: true } },
    'genshinimpact': { min: { cpuScore: 30, gpuScore: 35, ram: 8, storage: 30, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 16, storage: 30, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 70, ram: 16, storage: 30, requiresSSD: true } },

    // Horror
    'residentevil':  { min: { cpuScore: 35, gpuScore: 40, ram: 8, storage: 35, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 35, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 35, requiresSSD: true } },
    're4':           { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 40, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 40, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 40, requiresSSD: true } },
    'silenthill':    { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 50, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 50, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 50, requiresSSD: true } },
    'alanwake':      { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 80, requiresSSD: true }, rec: { cpuScore: 55, gpuScore: 65, ram: 16, storage: 80, requiresSSD: true }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 80, requiresSSD: true } },
    'outlast':       { min: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 5, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 45, ram: 4, storage: 5, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 5, requiresSSD: false } },
    'layersoffear':  { min: { cpuScore: 30, gpuScore: 35, ram: 4, storage: 5, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 5, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 5, requiresSSD: false } },
    'phasmophobia':  { min: { cpuScore: 20, gpuScore: 25, ram: 8, storage: 16, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 40, ram: 8, storage: 16, requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 60, ram: 16, storage: 16, requiresSSD: false } },
    'deadspace':     { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 50, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 50, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 50, requiresSSD: true } },
    'scorn':         { min: { cpuScore: 35, gpuScore: 40, ram: 8, storage: 35, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 35, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 35, requiresSSD: true } },
    'littlehope':    { min: { cpuScore: 25, gpuScore: 25, ram: 8, storage: 40, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 40, ram: 8, storage: 40, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 60, ram: 16, storage: 40, requiresSSD: false } },
    'untildawn':     { min: { cpuScore: 45, gpuScore: 50, ram: 16, storage: 70, requiresSSD: true }, rec: { cpuScore: 60, gpuScore: 70, ram: 16, storage: 70, requiresSSD: true }, ultra: { cpuScore: 80, gpuScore: 90, ram: 24, storage: 70, requiresSSD: true } },

    // Indies / Platformers / Puzzle
    'limbo':         { min: { cpuScore: 10, gpuScore: 5, ram: 1, storage: 0.1, requiresSSD: false }, rec: { cpuScore: 20, gpuScore: 15, ram: 2, storage: 0.1, requiresSSD: false }, ultra: { cpuScore: 35, gpuScore: 30, ram: 4, storage: 0.1, requiresSSD: false } },
    'inside':        { min: { cpuScore: 15, gpuScore: 15, ram: 2, storage: 3, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 25, ram: 4, storage: 3, requiresSSD: false }, ultra: { cpuScore: 45, gpuScore: 45, ram: 4, storage: 3, requiresSSD: false } },
    'ori':           { min: { cpuScore: 20, gpuScore: 20, ram: 4, storage: 8, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 35, ram: 8, storage: 8, requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 55, ram: 8, storage: 8, requiresSSD: false } },
    'gris':          { min: { cpuScore: 10, gpuScore: 10, ram: 2, storage: 4, requiresSSD: false }, rec: { cpuScore: 20, gpuScore: 20, ram: 4, storage: 4, requiresSSD: false }, ultra: { cpuScore: 40, gpuScore: 40, ram: 4, storage: 4, requiresSSD: false } },
    'journey':       { min: { cpuScore: 15, gpuScore: 10, ram: 4, storage: 3, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 20, ram: 4, storage: 3, requiresSSD: false }, ultra: { cpuScore: 45, gpuScore: 40, ram: 8, storage: 3, requiresSSD: false } },
    'witness':       { min: { cpuScore: 15, gpuScore: 15, ram: 4, storage: 5, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 25, ram: 8, storage: 5, requiresSSD: false }, ultra: { cpuScore: 45, gpuScore: 45, ram: 8, storage: 5, requiresSSD: false } },
    'braid':         { min: { cpuScore: 10, gpuScore: 5, ram: 1, storage: 0.2, requiresSSD: false }, rec: { cpuScore: 20, gpuScore: 15, ram: 2, storage: 0.2, requiresSSD: false }, ultra: { cpuScore: 35, gpuScore: 30, ram: 4, storage: 0.2, requiresSSD: false } },
    'bastion':       { min: { cpuScore: 15, gpuScore: 10, ram: 2, storage: 1.5, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 20, ram: 4, storage: 1.5, requiresSSD: false }, ultra: { cpuScore: 45, gpuScore: 40, ram: 4, storage: 1.5, requiresSSD: false } },
    'transistor':    { min: { cpuScore: 15, gpuScore: 15, ram: 2, storage: 3, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 25, ram: 4, storage: 3, requiresSSD: false }, ultra: { cpuScore: 45, gpuScore: 45, ram: 8, storage: 3, requiresSSD: false } },
    'pyre':          { min: { cpuScore: 15, gpuScore: 15, ram: 2, storage: 7, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 25, ram: 4, storage: 7, requiresSSD: false }, ultra: { cpuScore: 45, gpuScore: 45, ram: 8, storage: 7, requiresSSD: false } },
    'shovelknight':  { min: { cpuScore: 10, gpuScore: 5, ram: 1, storage: 0.3, requiresSSD: false }, rec: { cpuScore: 20, gpuScore: 15, ram: 2, storage: 0.3, requiresSSD: false }, ultra: { cpuScore: 35, gpuScore: 30, ram: 4, storage: 0.3, requiresSSD: false } },
    'spiritfarer':   { min: { cpuScore: 15, gpuScore: 15, ram: 2, storage: 7, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 25, ram: 4, storage: 7, requiresSSD: false }, ultra: { cpuScore: 45, gpuScore: 45, ram: 8, storage: 7, requiresSSD: false } },
    'katana zero':   { min: { cpuScore: 15, gpuScore: 10, ram: 2, storage: 0.2, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 20, ram: 4, storage: 0.2, requiresSSD: false }, ultra: { cpuScore: 45, gpuScore: 40, ram: 4, storage: 0.2, requiresSSD: false } },
    'blasphemous':   { min: { cpuScore: 20, gpuScore: 15, ram: 4, storage: 0.3, requiresSSD: false }, rec: { cpuScore: 30, gpuScore: 30, ram: 8, storage: 0.3, requiresSSD: false }, ultra: { cpuScore: 50, gpuScore: 50, ram: 8, storage: 0.3, requiresSSD: false } },

    // VR
    'beat saber':    { min: { cpuScore: 25, gpuScore: 30, ram: 8, storage: 1, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 1, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 70, ram: 16, storage: 1, requiresSSD: false } },
    'vrchat':        { min: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 1, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 1, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 70, ram: 16, storage: 1, requiresSSD: false } },
    'boneworks':     { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 10, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 16, storage: 10, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 10, requiresSSD: true } },
    'superhot':      { min: { cpuScore: 25, gpuScore: 30, ram: 4, storage: 4, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 4, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 4, requiresSSD: false } },
    'pavlov':        { min: { cpuScore: 30, gpuScore: 35, ram: 8, storage: 10, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 10, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 75, ram: 16, storage: 10, requiresSSD: true } },

    // Additional popular modern titles
    'helldivers2':   { min: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 100, requiresSSD: true }, rec: { cpuScore: 60, gpuScore: 70, ram: 16, storage: 100, requiresSSD: true }, ultra: { cpuScore: 80, gpuScore: 90, ram: 16, storage: 100, requiresSSD: true } },
    'palworld':      { min: { cpuScore: 35, gpuScore: 40, ram: 16, storage: 40, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 55, ram: 32, storage: 40, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 75, ram: 32, storage: 40, requiresSSD: true } },
    'enshrouded':    { min: { cpuScore: 40, gpuScore: 45, ram: 16, storage: 60, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 16, storage: 60, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 32, storage: 60, requiresSSD: true } },
    'soulmask':      { min: { cpuScore: 35, gpuScore: 40, ram: 16, storage: 30, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 55, ram: 16, storage: 30, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 75, ram: 32, storage: 30, requiresSSD: true } },
    'contentwarning': { min: { cpuScore: 25, gpuScore: 25, ram: 8, storage: 1, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 40, ram: 8, storage: 1, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 60, ram: 16, storage: 1, requiresSSD: false } },
    'satisfactory2': { min: { cpuScore: 40, gpuScore: 45, ram: 12, storage: 25, requiresSSD: true }, rec: { cpuScore: 55, gpuScore: 65, ram: 16, storage: 25, requiresSSD: true }, ultra: { cpuScore: 75, gpuScore: 85, ram: 24, storage: 25, requiresSSD: true } },
    'rimworld':      { min: { cpuScore: 20, gpuScore: 20, ram: 4, storage: 1, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 35, ram: 8, storage: 1, requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 55, ram: 16, storage: 1, requiresSSD: false } },
    'dwarffortress': { min: { cpuScore: 20, gpuScore: 20, ram: 4, storage: 0.3, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 35, ram: 8, storage: 0.3, requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 55, ram: 16, storage: 0.3, requiresSSD: false } },
    'oxygennotincluded': { min: { cpuScore: 25, gpuScore: 25, ram: 4, storage: 2, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 40, ram: 8, storage: 2, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 60, ram: 16, storage: 2, requiresSSD: false } },
    'kerbalspaceprogram': { min: { cpuScore: 20, gpuScore: 20, ram: 4, storage: 3, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 35, ram: 8, storage: 3, requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 55, ram: 16, storage: 3, requiresSSD: false } },
    'againstthestorm': { min: { cpuScore: 25, gpuScore: 25, ram: 4, storage: 5, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 40, ram: 8, storage: 5, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 5, requiresSSD: false } },
    'frostpunk2':    { min: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 30, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 16, storage: 30, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 30, requiresSSD: true } },
    'balatro':       { min: { cpuScore: 10, gpuScore: 5, ram: 1, storage: 0.2, requiresSSD: false }, rec: { cpuScore: 20, gpuScore: 15, ram: 2, storage: 0.2, requiresSSD: false }, ultra: { cpuScore: 35, gpuScore: 30, ram: 4, storage: 0.2, requiresSSD: false } },
    'pacificdrive':  { min: { cpuScore: 45, gpuScore: 50, ram: 16, storage: 20, requiresSSD: true }, rec: { cpuScore: 60, gpuScore: 70, ram: 16, storage: 20, requiresSSD: true }, ultra: { cpuScore: 80, gpuScore: 90, ram: 24, storage: 20, requiresSSD: true } },
  };

  // Genre-based fallback templates (minimum = 720p low 30fps true minimum)
  static GENRE_TEMPLATES = {
    'Shooter':       { min: { cpuScore: 18, gpuScore: 22, ram: 4, storage: 30, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 40, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 50, requiresSSD: true } },
    'Action':        { min: { cpuScore: 18, gpuScore: 22, ram: 4, storage: 30, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 40, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 50, requiresSSD: true } },
    'Adventure':     { min: { cpuScore: 15, gpuScore: 18, ram: 4, storage: 15, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 25, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 40, requiresSSD: false } },
    'RPG':           { min: { cpuScore: 18, gpuScore: 22, ram: 4, storage: 35, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 45, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 60, requiresSSD: true } },
    'Strategy':      { min: { cpuScore: 10, gpuScore: 10, ram: 2, storage: 15, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 30, ram: 8, storage: 25, requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 50, ram: 8, storage: 35, requiresSSD: false } },
    'Simulation':    { min: { cpuScore: 13, gpuScore: 15, ram: 4, storage: 10, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 20, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 30, requiresSSD: false } },
    'Sports':        { min: { cpuScore: 18, gpuScore: 22, ram: 4, storage: 40, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 50, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 60, requiresSSD: true } },
    'Racing':        { min: { cpuScore: 18, gpuScore: 22, ram: 4, storage: 30, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 40, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 50, requiresSSD: true } },
    'Fighting':      { min: { cpuScore: 18, gpuScore: 22, ram: 4, storage: 30, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 40, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 50, requiresSSD: true } },
    'Puzzle':        { min: { cpuScore: 5, gpuScore: 5, ram: 2, storage: 2, requiresSSD: false }, rec: { cpuScore: 15, gpuScore: 10, ram: 4, storage: 5, requiresSSD: false }, ultra: { cpuScore: 30, gpuScore: 25, ram: 4, storage: 8, requiresSSD: false } },
    'Platformer':    { min: { cpuScore: 8, gpuScore: 8, ram: 2, storage: 5, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 20, ram: 4, storage: 8, requiresSSD: false }, ultra: { cpuScore: 40, gpuScore: 35, ram: 4, storage: 12, requiresSSD: false } },
    'Casual':        { min: { cpuScore: 5, gpuScore: 5, ram: 2, storage: 2, requiresSSD: false }, rec: { cpuScore: 15, gpuScore: 10, ram: 4, storage: 5, requiresSSD: false }, ultra: { cpuScore: 30, gpuScore: 25, ram: 4, storage: 8, requiresSSD: false } },
    'Indie':         { min: { cpuScore: 8, gpuScore: 8, ram: 2, storage: 5, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 20, ram: 4, storage: 8, requiresSSD: false }, ultra: { cpuScore: 40, gpuScore: 35, ram: 4, storage: 12, requiresSSD: false } },
    'Horror':        { min: { cpuScore: 15, gpuScore: 18, ram: 4, storage: 15, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 55, ram: 8, storage: 25, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 75, ram: 8, storage: 40, requiresSSD: false } },
    'Survival':      { min: { cpuScore: 15, gpuScore: 18, ram: 4, storage: 15, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 25, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 70, ram: 16, storage: 40, requiresSSD: false } },
    'Sandbox':       { min: { cpuScore: 13, gpuScore: 15, ram: 4, storage: 5, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 40, ram: 8, storage: 15, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 60, ram: 16, storage: 25, requiresSSD: false } },
    'Roguelike':     { min: { cpuScore: 8, gpuScore: 8, ram: 2, storage: 5, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 20, ram: 4, storage: 8, requiresSSD: false }, ultra: { cpuScore: 40, gpuScore: 35, ram: 4, storage: 12, requiresSSD: false } },
    'Management':    { min: { cpuScore: 13, gpuScore: 15, ram: 4, storage: 5, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 10, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 20, requiresSSD: false } },
    'Stealth':       { min: { cpuScore: 18, gpuScore: 22, ram: 4, storage: 30, requiresSSD: false }, rec: { cpuScore: 50, gpuScore: 60, ram: 8, storage: 40, requiresSSD: false }, ultra: { cpuScore: 70, gpuScore: 80, ram: 16, storage: 50, requiresSSD: true } },
    'Tactical':      { min: { cpuScore: 15, gpuScore: 15, ram: 4, storage: 15, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 25, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 70, ram: 8, storage: 35, requiresSSD: false } },
    'Multiplayer':   { min: { cpuScore: 15, gpuScore: 18, ram: 4, storage: 20, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 30, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 75, ram: 16, storage: 40, requiresSSD: true } },
    'MOBA':          { min: { cpuScore: 12, gpuScore: 15, ram: 4, storage: 15, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 50, ram: 8, storage: 20, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 70, ram: 8, storage: 30, requiresSSD: false } },
    'MMO':           { min: { cpuScore: 15, gpuScore: 15, ram: 4, storage: 30, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 40, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 70, ram: 16, storage: 60, requiresSSD: false } },
    'Visual Novel':  { min: { cpuScore: 5, gpuScore: 5, ram: 2, storage: 5, requiresSSD: false }, rec: { cpuScore: 15, gpuScore: 10, ram: 4, storage: 10, requiresSSD: false }, ultra: { cpuScore: 25, gpuScore: 20, ram: 4, storage: 15, requiresSSD: false } },
    'Tower Defense': { min: { cpuScore: 10, gpuScore: 10, ram: 2, storage: 2, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 35, ram: 4, storage: 5, requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 55, ram: 8, storage: 8, requiresSSD: false } },
    'Deckbuilder':   { min: { cpuScore: 5, gpuScore: 5, ram: 2, storage: 2, requiresSSD: false }, rec: { cpuScore: 15, gpuScore: 10, ram: 4, storage: 5, requiresSSD: false }, ultra: { cpuScore: 30, gpuScore: 25, ram: 4, storage: 8, requiresSSD: false } },
    'Card Game':     { min: { cpuScore: 5, gpuScore: 5, ram: 2, storage: 2, requiresSSD: false }, rec: { cpuScore: 15, gpuScore: 10, ram: 4, storage: 5, requiresSSD: false }, ultra: { cpuScore: 30, gpuScore: 25, ram: 4, storage: 8, requiresSSD: false } },
    'City Builder':  { min: { cpuScore: 15, gpuScore: 15, ram: 4, storage: 5, requiresSSD: false }, rec: { cpuScore: 45, gpuScore: 50, ram: 8, storage: 10, requiresSSD: false }, ultra: { cpuScore: 65, gpuScore: 70, ram: 16, storage: 20, requiresSSD: false } },
    'Music':         { min: { cpuScore: 10, gpuScore: 10, ram: 4, storage: 5, requiresSSD: false }, rec: { cpuScore: 35, gpuScore: 35, ram: 8, storage: 8, requiresSSD: false }, ultra: { cpuScore: 55, gpuScore: 55, ram: 8, storage: 15, requiresSSD: false } },
    'Point & Click': { min: { cpuScore: 5, gpuScore: 5, ram: 2, storage: 5, requiresSSD: false }, rec: { cpuScore: 15, gpuScore: 10, ram: 4, storage: 8, requiresSSD: false }, ultra: { cpuScore: 30, gpuScore: 25, ram: 4, storage: 12, requiresSSD: false } },
    'Soulslike':     { min: { cpuScore: 20, gpuScore: 25, ram: 4, storage: 25, requiresSSD: false }, rec: { cpuScore: 55, gpuScore: 65, ram: 8, storage: 35, requiresSSD: false }, ultra: { cpuScore: 75, gpuScore: 85, ram: 16, storage: 50, requiresSSD: true } },
    'Metroidvania':  { min: { cpuScore: 8, gpuScore: 8, ram: 2, storage: 5, requiresSSD: false }, rec: { cpuScore: 25, gpuScore: 20, ram: 4, storage: 8, requiresSSD: false }, ultra: { cpuScore: 40, gpuScore: 35, ram: 4, storage: 12, requiresSSD: false } },
    'Story-driven':  { min: { cpuScore: 13, gpuScore: 15, ram: 4, storage: 10, requiresSSD: false }, rec: { cpuScore: 40, gpuScore: 40, ram: 8, storage: 20, requiresSSD: false }, ultra: { cpuScore: 60, gpuScore: 60, ram: 8, storage: 30, requiresSSD: false } },
  };

  static normalizeName(name = '') {
    return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Tries to find a known game by name pattern matching.
   * Returns a requirements object or null.
   */
  static lookupByName(gameName) {
    const normalized = this.normalizeName(gameName);
    if (!normalized) return null;

    // Direct match
    if (this.KNOWN_GAMES[normalized]) {
      return this.KNOWN_GAMES[normalized];
    }

    // Partial substring match against known keys (longer keys first to avoid false positives)
    const keys = Object.keys(this.KNOWN_GAMES).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (normalized.includes(key)) {
        return this.KNOWN_GAMES[key];
      }
    }

    return null;
  }

  /**
   * Returns estimated requirements based on game genre(s).
   */
  static lookupByGenre(genres = []) {
    const genreList = Array.isArray(genres) ? genres : [genres];
    for (const genre of genreList) {
      const template = this.GENRE_TEMPLATES[genre];
      if (template) return template;
    }
    return null;
  }

  static scaleRequirementsByYear(requirements, releaseYear) {
    if (!requirements || !releaseYear || releaseYear >= 2020) return requirements;
    const yearsOld = 2026 - releaseYear;
    let scale = 1.0;
    if (yearsOld >= 15) scale = 0.35;
    else if (yearsOld >= 10) scale = 0.5;
    else if (yearsOld >= 6) scale = 0.7;
    else if (yearsOld >= 3) scale = 0.85;

    if (scale >= 1.0) return requirements;

    const scaleField = (val) => typeof val === 'number' ? Math.max(Math.round(val * scale), 2) : val;
    return {
      ...requirements,
      cpuScore: scaleField(requirements.cpuScore),
      gpuScore: scaleField(requirements.gpuScore),
      ram: scaleField(requirements.ram),
      storage: requirements.storage
    };
  }

  /**
   * Build a proper requirements object for a game not in the explicit DB.
   */
  static estimateRequirements(game = {}) {
    const name = game.name || game.title || '';
    const genres = game.genres || [];
    const releaseYear = game.releaseYear || game.release_date
      ? new Date(game.release_date).getFullYear()
      : null;

    // 1. Try exact/partial name match
    const nameMatch = this.lookupByName(name);
    if (nameMatch) {
      return {
        name,
        minimum: this.scaleRequirementsByYear(nameMatch.min, releaseYear),
        recommended: nameMatch.rec,
        ultra: nameMatch.ultra,
        source: 'heuristic_name'
      };
    }

    // 2. Try genre-based fallback
    const genreMatch = this.lookupByGenre(genres);
    if (genreMatch) {
      return {
        name,
        minimum: this.scaleRequirementsByYear(genreMatch.min, releaseYear),
        recommended: genreMatch.rec,
        ultra: genreMatch.ultra,
        source: 'heuristic_genre'
      };
    }

    // 3. Ultra-generic fallback (lightweight indie-ish)
    const genericMin = { cpuScore: 10, gpuScore: 10, ram: 2, storage: 5, requiresSSD: false };
    return {
      name,
      minimum: this.scaleRequirementsByYear(genericMin, releaseYear),
      recommended: { cpuScore: 40, gpuScore: 45, ram: 8, storage: 20, requiresSSD: false },
      ultra: { cpuScore: 60, gpuScore: 65, ram: 8, storage: 30, requiresSSD: false },
      source: 'heuristic_generic'
    };
  }
}
