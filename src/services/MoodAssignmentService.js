export const assignMoodToGame = (gameName, genres = []) => {
  const name = String(gameName || '').toLowerCase();

  if (
    name.includes('stardew valley') || name.includes('animal crossing')
    || name.includes('the sims') || name.includes('powerwash')
    || name.includes('slime rancher') || name.includes('yonder')
    || name.includes('a short hike') || name.includes('journey')
    || name.includes('flower') || name.includes('gris')
    || name.includes('abzu') || name.includes('firewatch')
    || name.includes('unpacking') || name.includes('townscaper')
    || name.includes('solitaire') || name.includes('mahjong')
    || name.includes('match 3') || name.includes('bejeweled')
    || name.includes('candy crush') || name.includes('plants vs zombies')
    || name.includes('angry birds') || name.includes('cut the rope')
    || name.includes('tetris') || name.includes('puzzloop')
    || name.includes('peggle') || name.includes('zuma')
  ) {
    return 'Relaxed';
  }

  if (
    name.includes('call of duty') || name.includes('counter-strike')
    || name.includes('league of legends') || name.includes('dota')
    || name.includes('overwatch') || name.includes('valorant')
    || name.includes('rocket league') || name.includes('apex legends')
    || name.includes('rainbow six') || name.includes('fifa')
    || name.includes('nba 2k') || name.includes('madden')
    || name.includes('cs:go') || name.includes('csgo')
    || name.includes('team fortress') || name.includes('tf2')
    || name.includes('among us') || name.includes('jackbox')
    || name.includes('fall guys') || name.includes('party animals')
  ) {
    return 'Social';
  }

  if (
    name.includes('civilization') || name.includes('xcom')
    || name.includes('chess') || name.includes('total war')
    || name.includes('starcraft') || name.includes('age of empires')
    || name.includes('company of heroes') || name.includes('warhammer')
    || name.includes('endless legend') || name.includes('into the breach')
    || name.includes('doom') || name.includes('resident evil')
    || name.includes('dead space') || name.includes('bloodborne')
    || name.includes('sekiro') || name.includes('dark souls')
    || name.includes('hades') || name.includes('ultrakill')
    || name.includes('devil may cry') || name.includes('bayonetta')
  ) {
    return 'Focused';
  }

  if (
    name.includes('minecraft') || name.includes('terraria')
    || name.includes('roblox') || name.includes("garry's mod")
    || name.includes('dreams') || name.includes('littlebigplanet')
    || name.includes('super mario maker') || name.includes('trackmania')
    || name.includes('noita') || name.includes('risk of rain')
  ) {
    return 'Creative';
  }

  if (
    name.includes("no man's sky") || name.includes('subnautica')
    || name.includes('the legend of zelda') || name.includes('elder scrolls')
    || name.includes('fallout') || name.includes('skyrim')
    || name.includes('oblivion') || name.includes('morrowind')
    || name.includes('breath of the wild') || name.includes('horizon')
    || name.includes('her story') || name.includes('return of obra dinn')
    || name.includes('outer wilds') || name.includes('witness')
    || name.includes('portal') || name.includes('antichamber')
    || name.includes('braid') || name.includes('limbo')
    || name.includes('inside') || name.includes('somerville')
    || name.includes('cyberpunk') || name.includes('the witcher')
    || name.includes('dragon age') || name.includes('mass effect')
  ) {
    return 'Escapist';
  }

  const genreToMoodMap = {
    Shooter: 'Social',
    RPG: 'Escapist',
    Simulation: 'Relaxed',
    Puzzle: 'Focused',
    Racing: 'Focused',
    Sports: 'Social',
    Strategy: 'Focused',
    Adventure: 'Escapist',
    Indie: 'Creative',
    Platformer: 'Relaxed',
    Fighting: 'Social',
    Stealth: 'Focused',
    Horror: 'Escapist',
    Management: 'Focused',
    Casual: 'Relaxed'
  };

  return genreToMoodMap[genres[0]] || 'Relaxed';
};
