/**
 * FranchiseCollectionService - Detects and manages game franchises/collections
 * Groups games by series like Dark Souls, Resident Evil, etc.
 */

// Major game franchises and their detection patterns
const FRANCHISE_PATTERNS = [
  // Action/Adventure
  { id: 'assassins_creed', name: 'Assassin\'s Creed', patterns: [/assassin['']?s\s*creed/i, /ac\s*valhalla/i, /ac\s*odyssey/i, /ac\s*origins/i] },
  { id: 'batman_arkham', name: 'Batman: Arkham', patterns: [/batman.*arkham/i, /arkham\s*(asylum|city|knight|origins)/i] },
  { id: 'bioshock', name: 'BioShock', patterns: [/bioshock/i] },
  { id: 'borderlands', name: 'Borderlands', patterns: [/borderlands/i] },
  { id: 'darksiders', name: 'Darksiders', patterns: [/darksiders/i] },
  { id: 'dark_souls', name: 'Dark Souls', patterns: [/dark\s*souls/i, /demon['']?s\s*souls/i, /elden\s*ring/i, /bloodborne/i, /sekiro/i] },
  { id: 'dead_space', name: 'Dead Space', patterns: [/dead\s*space/i] },
  { id: 'devil_may_cry', name: 'Devil May Cry', patterns: [/devil\s*may\s*cry/i, /dmc/i] },
  { id: 'dishonored', name: 'Dishonored', patterns: [/dishonored/i] },
  { id: 'doom', name: 'DOOM', patterns: [/doom/i] },
  { id: 'dragon_age', name: 'Dragon Age', patterns: [/dragon\s*age/i] },
  { id: 'elder_scrolls', name: 'The Elder Scrolls', patterns: [/elder\s*scrolls/i, /skyrim/i, /oblivion/i, /morrowind/i] },
  { id: 'fallout', name: 'Fallout', patterns: [/fallout/i] },
  { id: 'far_cry', name: 'Far Cry', patterns: [/far\s*cry/i] },
  { id: 'final_fantasy', name: 'Final Fantasy', patterns: [/final\s*fantasy/i, /ff\s*\d+/i, /ffxiv/i, /ffxvi/i] },
  { id: 'god_of_war', name: 'God of War', patterns: [/god\s*of\s*war/i] },
  { id: 'gta', name: 'Grand Theft Auto', patterns: [/grand\s*theft\s*auto/i, /gta/i] },
  { id: 'hitman', name: 'Hitman', patterns: [/hitman/i] },
  { id: 'horizon', name: 'Horizon', patterns: [/horizon\s*zero\s*dawn/i, /horizon\s*forbidden\s*west/i] },
  { id: 'just_cause', name: 'Just Cause', patterns: [/just\s*cause/i] },
  { id: 'legend_of_zelda', name: 'The Legend of Zelda', patterns: [/legend\s*of\s*zelda/i, /zelda/i] },
  { id: 'mafia', name: 'Mafia', patterns: [/mafia/i] },
  { id: 'mass_effect', name: 'Mass Effect', patterns: [/mass\s*effect/i] },
  { id: 'metal_gear', name: 'Metal Gear', patterns: [/metal\s*gear/i, /mgs/i] },
  { id: 'metro', name: 'Metro', patterns: [/metro\s*2033/i, /metro\s*last\s*light/i, /metro\s*exodus/i] },
  { id: 'middle_earth', name: 'Middle-earth', patterns: [/middle.earth/i, /shadow\s*of\s*mordor/i, /shadow\s*of\s*war/i] },
  { id: 'mirrors_edge', name: 'Mirror\'s Edge', patterns: [/mirror['']?s?\s*edge/i] },
  { id: 'need_for_speed', name: 'Need for Speed', patterns: [/need\s*for\s*speed/i, /nfs/i] },
  { id: 'nioh', name: 'Nioh', patterns: [/nioh/i] },
  { id: 'prince_of_persia', name: 'Prince of Persia', patterns: [/prince\s*of\s*persia/i] },
  { id: 'red_dead', name: 'Red Dead', patterns: [/red\s*dead\s*redemption/i, /red\s*dead\s*online/i] },
  { id: 'resident_evil', name: 'Resident Evil', patterns: [/resident\s*evil/i, /biohazard/i] },
  { id: 'saints_row', name: 'Saints Row', patterns: [/saints\s*row/i] },
  { id: 'sleeping_dogs', name: 'Sleeping Dogs', patterns: [/sleeping\s*dogs/i] },
  { id: 'splinter_cell', name: 'Splinter Cell', patterns: [/splinter\s*cell/i] },
  { id: 'star_wars_jedi', name: 'Star Wars Jedi', patterns: [/jedi\s*fallen\s*order/i, /jedi\s*survivor/i] },
  { id: 'tomb_raider', name: 'Tomb Raider', patterns: [/tomb\s*raider/i, /lara\s*croft/i] },
  { id: 'uncharted', name: 'Uncharted', patterns: [/uncharted/i] },
  { id: 'watch_dogs', name: 'Watch Dogs', patterns: [/watch\s*dogs?/i] },
  { id: 'witcher', name: 'The Witcher', patterns: [/witcher/i] },
  { id: 'wolfenstein', name: 'Wolfenstein', patterns: [/wolfenstein/i] },
  { id: 'yakuza', name: 'Yakuza', patterns: [/yakuza/i, /like\s*a\s*dragon/i] },

  // FPS/Shooters
  { id: 'battlefield', name: 'Battlefield', patterns: [/battlefield/i, /bf\s*\d/i, /bf\s*2042/i] },
  { id: 'call_of_duty', name: 'Call of Duty', patterns: [/call\s*of\s*duty/i, /cod/i, /modern\s*warfare/i, /black\s*ops/i] },
  { id: 'counter_strike', name: 'Counter-Strike', patterns: [/counter.strike/i, /cs/i, /csgo/i, /cs2/i] },
  { id: 'destiny', name: 'Destiny', patterns: [/destiny/i] },
  { id: 'gears_of_war', name: 'Gears of War', patterns: [/gears\s*of\s*war/i, /gow/i] },
  { id: 'halo', name: 'Halo', patterns: [/halo/i, /master\s*chief/i] },
  { id: 'killzone', name: 'Killzone', patterns: [/killzone/i] },
  { id: 'left_4_dead', name: 'Left 4 Dead', patterns: [/left\s*4\s*dead/i, /left\s*for\s*dead/i, /l4d/i] },
  { id: 'overwatch', name: 'Overwatch', patterns: [/overwatch/i] },
  { id: 'payday', name: 'PAYDAY', patterns: [/payday/i] },
  { id: 'quake', name: 'Quake', patterns: [/quake/i] },
  { id: 'rainbow_six', name: 'Tom Clancy\'s Rainbow Six', patterns: [/rainbow\s*six/i, /rainbow\s*6/i, /r6\s*siege/i] },
  { id: 'titanfall', name: 'Titanfall', patterns: [/titanfall/i] },
  { id: 'unreal', name: 'Unreal Tournament', patterns: [/unreal\s*tournament/i, /ut\s*\d/i] },
  { id: 'valorant', name: 'Valorant', patterns: [/valorant/i] },

  // RPGs
  { id: 'baldurs_gate', name: 'Baldur\'s Gate', patterns: [/baldur['']?s\s*gate/i, /bg\s*3/i] },
  { id: 'chivalry', name: 'Chivalry', patterns: [/chivalry/i] },
  { id: 'cyberpunk', name: 'Cyberpunk 2077', patterns: [/cyberpunk/i] },
  { id: 'deus_ex', name: 'Deus Ex', patterns: [/deus\s*ex/i] },
  { id: 'divinity', name: 'Divinity', patterns: [/divinity/i, /dos2/i] },
  { id: 'dragons_dogma', name: 'Dragon\'s Dogma', patterns: [/dragon['']?s\s*dogma/i] },
  { id: 'fable', name: 'Fable', patterns: [/fable/i] },
  { id: 'icewind_dale', name: 'Icewind Dale', patterns: [/icewind\s*dale/i] },
  { id: 'kingdom_come', name: 'Kingdom Come', patterns: [/kingdom\s*come/i] },
  { id: 'kingdom_hearts', name: 'Kingdom Hearts', patterns: [/kingdom\s*hearts/i, /kh\s*\d/i] },
  { id: 'mount_blade', name: 'Mount & Blade', patterns: [/mount\s*(and|&)\s*blade/i, /bannerlord/i] },
  { id: 'neverwinter', name: 'Neverwinter', patterns: [/neverwinter/i] },
  { id: 'pathfinder', name: 'Pathfinder', patterns: [/pathfinder/i] },
  { id: 'pillar_of_eternity', name: 'Pillars of Eternity', patterns: [/pillars?\s*of\s*eternity/i, /poe2/i] },
  { id: 'planescape', name: 'Planescape', patterns: [/planescape/i] },
  { id: 'starfield', name: 'Starfield', patterns: [/starfield/i] },
  { id: 'thronebreaker', name: 'Thronebreaker', patterns: [/thronebreaker/i] },
  { id: 'torment', name: 'Torment', patterns: [/torment/i] },
  { id: 'tyranny', name: 'Tyranny', patterns: [/tyranny/i] },

  // Strategy
  { id: 'age_of_empires', name: 'Age of Empires', patterns: [/age\s*of\s*empires/i, /aoe/i, /age\s*of\s*mythology/i] },
  { id: 'civilization', name: 'Civilization', patterns: [/civilization/i, /civ\s*\d/i, /sid\s*meier/i] },
  { id: 'command_conquer', name: 'Command & Conquer', patterns: [/command\s*(and|&|n)\s*conquer/i, /cnc/i, /c&c/i, /red\s*alert/i] },
  { id: 'crusader_kings', name: 'Crusader Kings', patterns: [/crusader\s*kings/i, /ck\s*\d/i, /ck2/i, /ck3/i] },
  { id: 'company_of_heroes', name: 'Company of Heroes', patterns: [/company\s*of\s*heroes/i, /coh/i] },
  { id: 'dawn_of_war', name: 'Warhammer 40K: Dawn of War', patterns: [/dawn\s*of\s*war/i] },
  { id: 'europa_universalis', name: 'Europa Universalis', patterns: [/europa\s*universalis/i, /eu\s*\d/i, /eu4/i] },
  { id: 'hearts_of_iron', name: 'Hearts of Iron', patterns: [/hearts\s*of\s*iron/i, /hoi\s*\d/i, /hoi4/i] },
  { id: 'homeworld', name: 'Homeworld', patterns: [/homeworld/i] },
  { id: 'starcraft', name: 'StarCraft', patterns: [/starcraft/i, /sc2/i] },
  { id: 'stellaris', name: 'Stellaris', patterns: [/stellaris/i] },
  { id: 'supreme_commander', name: 'Supreme Commander', patterns: [/supreme\s*commander/i, /supcom/i] },
  { id: 'total_war', name: 'Total War', patterns: [/total\s*war/i] },
  { id: 'warcraft', name: 'Warcraft', patterns: [/warcraft/i, /wc3/i, /frozen\s*throne/i] },
  { id: 'xcom', name: 'XCOM', patterns: [/xcom/i] },

  // Racing
  { id: 'dirt', name: 'DiRT', patterns: [/dirt/i, /colin\s*mcrae/i] },
  { id: 'f1', name: 'F1', patterns: [/f1\s*\d{4}/i, /formula\s*1/i] },
  { id: 'forza', name: 'Forza', patterns: [/forza/i] },
  { id: 'grid', name: 'GRID', patterns: [/grid/i] },
  { id: 'gran_turismo', name: 'Gran Turismo', patterns: [/gran\s*turismo/i, /gt\s*\d/i, /gt\s*sport/i, /gt\s*7/i] },
  { id: 'wreckfest', name: 'Wreckfest', patterns: [/wreckfest/i] },
  { id: 'project_cars', name: 'Project CARS', patterns: [/project\s*cars/i] },

  // Sports
  { id: 'fifa', name: 'EA Sports FC / FIFA', patterns: [/fifa/i, /ea\s*sports\s*fc/i] },
  { id: 'madden', name: 'Madden NFL', patterns: [/madden/i] },
  { id: 'nba_2k', name: 'NBA 2K', patterns: [/nba\s*2k/i] },
  { id: 'nhl', name: 'NHL', patterns: [/nhl/i] },
  { id: 'tony_hawk', name: 'Tony Hawk', patterns: [/tony\s*hawk/i, /thps/i, /pro\s*skater/i] },
  { id: 'wwe', name: 'WWE', patterns: [/wwe/i] },

  // Survival Horror
  { id: 'alien_isolation', name: 'Alien: Isolation', patterns: [/alien.*isolation/i] },
  { id: 'amnesia', name: 'Amnesia', patterns: [/amnesia/i] },
  { id: 'outlast', name: 'Outlast', patterns: [/outlast/i] },
  { id: 'silent_hill', name: 'Silent Hill', patterns: [/silent\s*hill/i] },
  { id: 'subnautica', name: 'Subnautica', patterns: [/subnautica/i] },
  { id: 'the_forest', name: 'The Forest', patterns: [/the\s*forest/i, /sons\s*of\s*the\s*forest/i] },
  { id: 'dying_light', name: 'Dying Light', patterns: [/dying\s*light/i] },
  { id: 'dayz', name: 'DayZ', patterns: [/dayz/i] },
  { id: 'rust', name: 'Rust', patterns: [/rust/i] },
  { id: 'ark', name: 'ARK', patterns: [/ark.*survival/i] },

  // Indie
  { id: 'binding_of_isaac', name: 'The Binding of Isaac', patterns: [/binding\s*of\s*isaac/i] },
  { id: 'celeste', name: 'Celeste', patterns: [/celeste/i] },
  { id: 'cuphead', name: 'Cuphead', patterns: [/cuphead/i] },
  { id: 'hades', name: 'Hades', patterns: [/hades/i] },
  { id: 'hollow_knight', name: 'Hollow Knight', patterns: [/hollow\s*knight/i] },
  { id: 'hotline_miami', name: 'Hotline Miami', patterns: [/hotline\s*miami/i] },
  { id: 'ori', name: 'Ori', patterns: [/ori/i] },
  { id: 'shovel_knight', name: 'Shovel Knight', patterns: [/shovel\s*knight/i] },
  { id: 'stardew_valley', name: 'Stardew Valley', patterns: [/stardew\s*valley/i] },
  { id: 'terraria', name: 'Terraria', patterns: [/terraria/i] },
  { id: 'undertale', name: 'Undertale', patterns: [/undertale/i] },
  { id: 'dont_starve', name: 'Don\'t Starve', patterns: [/don['']?t\s*starve/i] },
  { id: 'minecraft', name: 'Minecraft', patterns: [/minecraft/i] },
  { id: 'satisfactory', name: 'Satisfactory', patterns: [/satisfactory/i] },
  { id: 'factorio', name: 'Factorio', patterns: [/factorio/i] },
  { id: 'slay_the_spire', name: 'Slay the Spire', patterns: [/slay\s*the\s*spire/i] },
  { id: 'cult_of_the_lamb', name: 'Cult of the Lamb', patterns: [/cult\s*of\s*the\s*lamb/i] },
  { id: 'vampire_survivors', name: 'Vampire Survivors', patterns: [/vampire\s*survivors/i] },
  { id: 'balatro', name: 'Balatro', patterns: [/balatro/i] },

  // Fighting
  { id: 'mortal_kombat', name: 'Mortal Kombat', patterns: [/mortal\s*kombat/i, /mk\s*\d/i, /mk11/i] },
  { id: 'street_fighter', name: 'Street Fighter', patterns: [/street\s*fighter/i, /sf\s*\d/i, /sf6/i, /sfv/i] },
  { id: 'tekken', name: 'Tekken', patterns: [/tekken/i] },
  { id: 'soulcalibur', name: 'Soulcalibur', patterns: [/soul\s*calibur/i, /soulcalibur/i] },
  { id: 'guilty_gear', name: 'Guilty Gear', patterns: [/guilty\s*gear/i] },
  { id: 'super_smash', name: 'Super Smash Bros.', patterns: [/super\s*smash\s*bros/i, /smash\s*bros/i, /ssb/i, /ssbm/i] },
  { id: 'injustice', name: 'Injustice', patterns: [/injustice/i] },
  { id: 'killer_instinct', name: 'Killer Instinct', patterns: [/killer\s*instinct/i] },
  { id: 'dead_or_alive', name: 'Dead or Alive', patterns: [/dead\s*or\s*alive/i, /doa/i] },
  { id: 'marvel_vs_capcom', name: 'Marvel vs. Capcom', patterns: [/marvel\s*vs.*capcom/i, /mvc/i] },

  // MMO/Multiplayer
  { id: 'world_of_warcraft', name: 'World of Warcraft', patterns: [/world\s*of\s*warcraft/i, /wow/i] },
  { id: 'guild_wars', name: 'Guild Wars', patterns: [/guild\s*wars/i, /gw2/i] },
  { id: 'final_fantasy_xiv', name: 'Final Fantasy XIV', patterns: [/final\s*fantasy\s*xiv/i, /ffxiv/i, /ff14/i] },
  { id: 'elder_scrolls_online', name: 'The Elder Scrolls Online', patterns: [/elder\s*scrolls\s*online/i, /eso/i] },
  { id: 'new_world', name: 'New World', patterns: [/new\s*world/i] },
  { id: 'lost_ark', name: 'Lost Ark', patterns: [/lost\s*ark/i] },
  { id: 'path_of_exile', name: 'Path of Exile', patterns: [/path\s*of\s*exile/i, /poe/i] },
  { id: 'warframe', name: 'Warframe', patterns: [/warframe/i] },
  { id: 'the_division', name: 'The Division', patterns: [/the\s*division/i, /division\s*2/i] },
  { id: 'monster_hunter', name: 'Monster Hunter', patterns: [/monster\s*hunter/i, /mhw/i, /mhr/i] },
  { id: 'warhammer', name: 'Warhammer', patterns: [/warhammer/i] },
  { id: 'vermintide', name: 'Warhammer: Vermintide', patterns: [/vermintide/i] },

  // VR
  { id: 'half_life_alyx', name: 'Half-Life: Alyx', patterns: [/half.life.*alyx/i, /alyx/i] },
  { id: 'beat_saber', name: 'Beat Saber', patterns: [/beat\s*saber/i] },
  { id: 'boneworks', name: 'BONEWORKS', patterns: [/boneworks/i] },
  { id: 'superhot_vr', name: 'SUPERHOT VR', patterns: [/superhot\s*vr/i] },
  { id: 'pavlov_vr', name: 'Pavlov VR', patterns: [/pavlov\s*vr/i] },
  { id: 'blade_sorcery', name: 'Blade and Sorcery', patterns: [/blade\s*and\s*sorcery/i] },
  { id: 'asgards_wrath', name: 'Asgard\'s Wrath', patterns: [/asgard['']?s\s*wrath/i] },

  // Puzzle
  { id: 'portal', name: 'Portal', patterns: [/portal/i] },
  { id: 'tetris', name: 'Tetris', patterns: [/tetris/i] },
  { id: 'witness', name: 'The Witness', patterns: [/the\s*witness/i] },
  { id: 'braid', name: 'Braid', patterns: [/braid/i] },
  { id: 'fez', name: 'Fez', patterns: [/fez/i] },
  { id: 'inside', name: 'Inside', patterns: [/inside/i] },
  { id: 'limbo', name: 'Limbo', patterns: [/limbo/i] },
  { id: 'monument_valley', name: 'Monument Valley', patterns: [/monument\s*valley/i] },

  // Platformer
  { id: 'rayman', name: 'Rayman', patterns: [/rayman/i] },
  { id: 'crash_bandicoot', name: 'Crash Bandicoot', patterns: [/crash\s*bandicoot/i] },
  { id: 'spyro', name: 'Spyro', patterns: [/spyro/i] },
  { id: 'banjo_kazooie', name: 'Banjo-Kazooie', patterns: [/banjo.*kazooie/i] },
  { id: 'donkey_kong', name: 'Donkey Kong', patterns: [/donkey\s*kong/i] },
  { id: 'kirby', name: 'Kirby', patterns: [/kirby/i] },
  { id: 'metroid', name: 'Metroid', patterns: [/metroid/i] },
  { id: 'sonic', name: 'Sonic the Hedgehog', patterns: [/sonic/i] },
  { id: 'super_mario', name: 'Super Mario', patterns: [/super\s*mario/i, /mario\s*\w+/i] },
  { id: 'little_big_planet', name: 'LittleBigPlanet', patterns: [/littlebigplanet/i, /lbp/i, /sackboy/i] },
  { id: 'ratchet_clank', name: 'Ratchet & Clank', patterns: [/ratchet.*clank/i] },
  { id: 'sly_cooper', name: 'Sly Cooper', patterns: [/sly\s*cooper/i] },
  { id: 'jak_daxter', name: 'Jak and Daxter', patterns: [/jak.*daxter/i] },

  // Story/Visual Novel
  { id: 'danganronpa', name: 'Danganronpa', patterns: [/danganronpa/i] },
  { id: 'phoenix_wright', name: 'Phoenix Wright: Ace Attorney', patterns: [/phoenix\s*wright/i, /ace\s*attorney/i] },
  { id: 'life_is_strange', name: 'Life is Strange', patterns: [/life\s*is\s*strange/i] },
  { id: 'until_dawn', name: 'Until Dawn', patterns: [/until\s*dawn/i] },
  { id: 'detroit_become_human', name: 'Detroit: Become Human', patterns: [/detroit.*become\s*human/i] },
  { id: 'heavy_rain', name: 'Heavy Rain', patterns: [/heavy\s*rain/i] },
  { id: 'beyond_two_souls', name: 'Beyond: Two Souls', patterns: [/beyond.*two\s*souls/i] },
  { id: 'the_last_of_us', name: 'The Last of Us', patterns: [/the\s*last\s*of\s*us/i, /last\s*of\s*us/i, /tlou/i] },

  // Open World
  { id: 'no_mans_sky', name: 'No Man\'s Sky', patterns: [/no\s*man['']?s\s*sky/i, /nms/i] },
  { id: 'sniper_elite', name: 'Sniper Elite', patterns: [/sniper\s*elite/i] },
  { id: 'ghost_recon', name: 'Tom Clancy\'s Ghost Recon', patterns: [/ghost\s*recon/i] },
  { id: 'ghost_of_tsushima', name: 'Ghost of Tsushima', patterns: [/ghost\s*of\s*tsushima/i] },
  { id: 'infamous', name: 'inFAMOUS', patterns: [/infamous/i] },
  { id: 'prototype', name: 'Prototype', patterns: [/prototype/i] },

  // Simulation
  { id: 'sims', name: 'The Sims', patterns: [/the\s*sims/i, /sims\s*\d/i] },
  { id: 'cities_skylines', name: 'Cities: Skylines', patterns: [/cities.*skylines/i] },
  { id: 'euro_truck', name: 'Euro Truck Simulator', patterns: [/euro\s*truck\s*simulator/i, /ets/i, /american\s*truck\s*simulator/i, /ats/i] },
  { id: 'flight_simulator', name: 'Microsoft Flight Simulator', patterns: [/flight\s*simulator/i, /msfs/i] },
  { id: 'planet_coaster', name: 'Planet Coaster', patterns: [/planet\s*coaster/i] },
  { id: 'rimworld', name: 'RimWorld', patterns: [/rimworld/i] },
  { id: 'dwarf_fortress', name: 'Dwarf Fortress', patterns: [/dwarf\s*fortress/i] },
  { id: 'oxygen_not_included', name: 'Oxygen Not Included', patterns: [/oxygen\s*not\s*included/i, /oni/i] },

  // Battle Royale
  { id: 'apex_legends', name: 'Apex Legends', patterns: [/apex\s*legends/i] },
  { id: 'fortnite', name: 'Fortnite', patterns: [/fortnite/i] },
  { id: 'pubg', name: 'PUBG', patterns: [/pubg/i, /playerunknown/i] },
  { id: 'warzone', name: 'Call of Duty: Warzone', patterns: [/warzone/i] },

  // MOBA
  { id: 'dota', name: 'Dota', patterns: [/dota/i, /dota\s*2/i] },
  { id: 'league_of_legends', name: 'League of Legends', patterns: [/league\s*of\s*legends/i, /lol/i] },
  { id: 'smite', name: 'Smite', patterns: [/smite/i] },
  { id: 'heroes_of_the_storm', name: 'Heroes of the Storm', patterns: [/heroes\s*of\s*the\s*storm/i, /hots/i] },

  // Roguelike
  { id: 'enter_the_gungeon', name: 'Enter the Gungeon', patterns: [/enter\s*the\s*gungeon/i] },
  { id: 'risk_of_rain', name: 'Risk of Rain', patterns: [/risk\s*of\s*rain/i, /ror/i, /ror2/i] },
  { id: 'dead_cells', name: 'Dead Cells', patterns: [/dead\s*cells/i] },
  { id: 'ftl', name: 'FTL: Faster Than Light', patterns: [/ftl/i, /faster\s*than\s*light/i] },
  { id: 'into_the_breach', name: 'Into the Breach', patterns: [/into\s*the\s*breach/i] },
  { id: 'spelunky', name: 'Spelunky', patterns: [/spelunky/i] },
  { id: 'nuclear_throne', name: 'Nuclear Throne', patterns: [/nuclear\s*throne/i] },
  { id: 'noita', name: 'Noita', patterns: [/noita/i] },
  { id: 'returnal', name: 'Returnal', patterns: [/returnal/i] },

  // Metroidvania
  { id: 'axiom_verge', name: 'Axiom Verge', patterns: [/axiom\s*verge/i] },
  { id: 'blasphemous', name: 'Blasphemous', patterns: [/blasphemous/i] },
  { id: 'bloodstained', name: 'Bloodstained', patterns: [/bloodstained/i] },
  { id: 'castlevania', name: 'Castlevania', patterns: [/castlevania/i] },
  { id: 'guacamelee', name: 'Guacamelee', patterns: [/guacamelee/i] },

  // Classic Valve
  { id: 'half_life', name: 'Half-Life', patterns: [/half.life/i, /half\s*life/i, /hl\s*\d/i, /hl2/i] },
  { id: 'team_fortress', name: 'Team Fortress', patterns: [/team\s*fortress/i, /tf\s*\d/i, /tf2/i] },
  { id: 'day_of_defeat', name: 'Day of Defeat', patterns: [/day\s*of\s*defeat/i, /dod/i] },

  // Cozy
  { id: 'unpacking', name: 'Unpacking', patterns: [/unpacking/i] },
  { id: 'a_short_hike', name: 'A Short Hike', patterns: [/a\s*short\s*hike/i] },
  { id: 'powerwash_simulator', name: 'PowerWash Simulator', patterns: [/powerwash\s*simulator/i] },
  { id: 'spiritfarer', name: 'Spiritfarer', patterns: [/spiritfarer/i] },

  // Mecha
  { id: 'armored_core', name: 'Armored Core', patterns: [/armored\s*core/i, /ac\s*\d/i, /ac6/i] },
  { id: 'zone_of_the_enders', name: 'Zone of the Enders', patterns: [/zone\s*of\s*the\s*enders/i, /zoe/i] },
  { id: 'gundam', name: 'Gundam', patterns: [/gundam/i] },

  // Space
  { id: 'elite_dangerous', name: 'Elite Dangerous', patterns: [/elite\s*dangerous/i] },
  { id: 'star_citizen', name: 'Star Citizen', patterns: [/star\s*citizen/i] },
  { id: 'eve_online', name: 'EVE Online', patterns: [/eve\s*online/i, /eve/i] },
  { id: 'rebel_galaxy', name: 'Rebel Galaxy', patterns: [/rebel\s*galaxy/i] },

  // Cyberpunk
  { id: 'system_shock', name: 'System Shock', patterns: [/system\s*shock/i] },
  { id: 'shadowrun', name: 'Shadowrun', patterns: [/shadowrun/i] },

  // Tactical
  { id: 'phoenix_point', name: 'Phoenix Point', patterns: [/phoenix\s*point/i] },
  { id: 'battletech', name: 'BattleTech', patterns: [/battletech/i] },
  { id: 'mechwarrior', name: 'MechWarrior', patterns: [/mechwarrior/i] },

  // Shooter Looter
  { id: 'outriders', name: 'Outriders', patterns: [/outriders/i] },
  { id: 'remnant', name: 'Remnant', patterns: [/remnant/i] },
  { id: 'tiny_tinas_wonderlands', name: 'Tiny Tina\'s Wonderlands', patterns: [/tiny\s*tina/i] },

  // Visual Novel
  { id: 'steins_gate', name: 'Steins;Gate', patterns: [/steins[;:]gate/i, /steins\s*gate/i] },
  { id: 'fate_stay_night', name: 'Fate/stay night', patterns: [/fate[/\\]stay\s*night/i, /fate\s*stay\s*night/i] },
  { id: 'zero_escape', name: 'Zero Escape', patterns: [/zero\s*escape/i, /999/i, /virtue['']?s\s*last\s*reward/i] },

  // Misc
  { id: 'garrys_mod', name: 'Garry\'s Mod', patterns: [/garry['']?s\s*mod/i, /gmod/i] },
  { id: 'roblox', name: 'Roblox', patterns: [/roblox/i] },
  { id: 'kerbal_space', name: 'Kerbal Space Program', patterns: [/kerbal\s*space\s*program/i, /ksp/i] },
  { id: 'football_manager', name: 'Football Manager', patterns: [/football\s*manager/i, /fm\s*\d{2,4}/i] },
  { id: 'assetto_corsa', name: 'Assetto Corsa', patterns: [/assetto\s*corsa/i, /acc/i] },
  { id: 'iracing', name: 'iRacing', patterns: [/iracing/i] },
  { id: 'osu', name: 'osu!', patterns: [/osu/i] },
  { id: 'guitar_hero', name: 'Guitar Hero', patterns: [/guitar\s*hero/i] },
  { id: 'rock_band', name: 'Rock Band', patterns: [/rock\s*band/i] }
];

class FranchiseCollectionService {
  /**
   * Detects which franchise a game belongs to based on its name
   * @param {string} gameName - The name of the game
   * @returns {Object|null} - Franchise info or null if no match
   */
  static detectFranchise(gameName) {
    if (!gameName || typeof gameName !== 'string') {
      return null;
    }

    const normalizedName = gameName.toLowerCase().trim();

    for (const franchise of FRANCHISE_PATTERNS) {
      for (const pattern of franchise.patterns) {
        if (pattern.test(normalizedName) || pattern.test(gameName)) {
          return {
            id: franchise.id,
            name: franchise.name,
            matchedPattern: pattern.toString()
          };
        }
      }
    }

    return null;
  }

  /**
   * Groups games by their detected franchise
   * @param {Array} games - Array of game objects
   * @returns {Object} - Object with franchise groups and ungrouped games
   */
  static groupByFranchise(games) {
    if (!Array.isArray(games) || games.length === 0) {
      return { collections: [], ungrouped: [] };
    }

    const collections = new Map();
    const ungrouped = [];

    for (const game of games) {
      const franchise = this.detectFranchise(game.name);
      
      if (franchise) {
        if (!collections.has(franchise.id)) {
          collections.set(franchise.id, {
            id: franchise.id,
            name: franchise.name,
            games: [],
            totalPlaytime: 0,
            completedCount: 0
          });
        }
        
        const collection = collections.get(franchise.id);
        collection.games.push(game);
        collection.totalPlaytime += game.time_played || 0;
        if (game.completed) collection.completedCount++;
      } else {
        ungrouped.push(game);
      }
    }

    // Convert map to array and sort by game count (descending)
    const sortedCollections = Array.from(collections.values())
      .sort((a, b) => b.games.length - a.games.length);

    return {
      collections: sortedCollections,
      ungrouped: ungrouped
    };
  }

  /**
   * Gets collection stats for display
   * @param {Object} collection - Collection object
   * @returns {Object} - Formatted stats
   */
  static getCollectionStats(collection) {
    const gameCount = collection.games.length;
    const totalPlaytime = collection.totalPlaytime;
    const hours = Math.floor(totalPlaytime / 60);
    const completedCount = collection.completedCount;
    
    return {
      gameCount,
      hours,
      completedCount,
      completionRate: gameCount > 0 ? Math.round((completedCount / gameCount) * 100) : 0,
      displayName: collection.name,
      coverGame: collection.games[0] // First game for cover art
    };
  }

  /**
   * Gets all available franchises from a game list
   * @param {Array} games - Array of game objects
   * @returns {Array} - Array of detected franchise names
   */
  static getAvailableFranchises(games) {
    const franchises = new Set();
    
    for (const game of games) {
      const franchise = this.detectFranchise(game.name);
      if (franchise) {
        franchises.add(franchise.name);
      }
    }
    
    return Array.from(franchises).sort();
  }

  /**
   * Filters games by franchise
   * @param {Array} games - Array of game objects
   * @param {string} franchiseId - Franchise ID to filter by
   * @returns {Array} - Filtered games
   */
  static filterByFranchise(games, franchiseId) {
    if (!franchiseId || !Array.isArray(games)) {
      return games;
    }

    return games.filter(game => {
      const franchise = this.detectFranchise(game.name);
      return franchise && franchise.id === franchiseId;
    });
  }

  /**
   * Checks if a game belongs to a specific franchise
   * @param {Object} game - Game object
   * @param {string} franchiseId - Franchise ID
   * @returns {boolean}
   */
  static isInFranchise(game, franchiseId) {
    if (!game || !franchiseId) return false;
    const franchise = this.detectFranchise(game.name);
    return franchise && franchise.id === franchiseId;
  }

  /**
   * Gets related games (same franchise)
   * @param {Object} game - Game object
   * @param {Array} allGames - All games in library
   * @returns {Array} - Related games from same franchise
   */
  static getRelatedGames(game, allGames) {
    if (!game || !Array.isArray(allGames)) return [];
    
    const franchise = this.detectFranchise(game.name);
    if (!franchise) return [];

    return allGames.filter(g => 
      g !== game && this.isInFranchise(g, franchise.id)
    );
  }
}

export { FranchiseCollectionService, FRANCHISE_PATTERNS };
export default FranchiseCollectionService;
