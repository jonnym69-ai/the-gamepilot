/**
 * DailyParadoxService
 *
 * Provides a daily paradox/brain-teaser that rotates each day.
 * Content mix: classic paradoxes, gaming paradoxes, logic puzzles, and
 * thought experiments. Uses day-of-year for deterministic rotation so
 * every user sees the same paradox on the same day.
 *
 * Persists "revealed" state in StorageService so the reveal button
 * remembers if the user has seen today's explanation.
 */

import StorageService from './StorageService';

const STORAGE_KEY = 'dailyParadoxState';

// Category metadata for display
const CATEGORIES = {
  classic: { label: 'Classic Paradox', icon: '🌀' },
  gaming: { label: 'Gaming Paradox', icon: '🎮' },
  logic: { label: 'Logic Puzzle', icon: '🧩' },
  thought: { label: 'Thought Experiment', icon: '💭' },
};

// The paradox library. Each entry has:
//   id, category, title, question, explanation
const PARADOXES = [
  // --- Classic Paradoxes ---
  {
    id: 'grandfather',
    category: 'classic',
    title: 'The Grandfather Paradox',
    question:
      'If you traveled back in time and killed your own grandfather before your parent was conceived, you would never be born. But if you were never born, you could never travel back to kill him. So what happens?',
    explanation:
      'This is the classic causal loop paradox. If you exist to go back, you cannot succeed; if you cannot succeed, you exist to go back. Proposed resolutions include the Novikov self-consistency principle (the universe prevents contradictory actions) and many-worlds (you create a new branch where you never exist, but your origin branch is unchanged).',
  },
  {
    id: 'barber',
    category: 'classic',
    title: 'The Barber Paradox',
    question:
      'In a town, the barber shaves all those, and only those, who do not shave themselves. Who shaves the barber?',
    explanation:
      'If the barber shaves himself, he breaks the rule (he only shaves those who do not shave themselves). If he does not shave himself, he must be shaved by the barber — himself. This is Russell’s Paradox in everyday language, showing that naive set theory can produce contradictions.',
  },
  {
    id: 'pinocchio',
    category: 'classic',
    title: 'The Pinocchio Paradox',
    question:
      'Pinocchio says, "My nose will grow now." If it grows, he was telling the truth — but his nose only grows when he lies. If it does not grow, he was lying — but then it should grow. What happens?',
    explanation:
      'This is a variant of the Liar Paradox ("This sentence is false"). The statement creates a self-referential loop with no consistent resolution. Some argue the nose simply stays the same, because the statement is neither a clear truth nor a clear lie — it is a paradox.',
  },
  {
    id: 'ship-of-theseus',
    category: 'classic',
    title: 'The Ship of Theseus',
    question:
      'Over the years, every plank of Theseus’s ship is replaced, one by one. When no original plank remains, is it still the same ship? And if someone reassembles the old planks into a ship, which is the real Ship of Theseus?',
    explanation:
      'This paradox questions identity over time. There is no single correct answer — it depends on whether you define identity by material continuity, structural form, or functional purpose. It is central to debates about personal identity and object persistence.',
  },
  {
    id: 'liar',
    category: 'classic',
    title: 'The Liar Paradox',
    question: 'A person says, "I am lying right now." Are they telling the truth or lying?',
    explanation:
      'If they are telling the truth, they are lying — which means they are not telling the truth. If they are lying, then the statement "I am lying" is true. This self-referential paradox has no consistent truth value and is foundational to logic and theories of truth.',
  },
  {
    id: 'unexpected-hanging',
    category: 'classic',
    title: 'The Unexpected Hanging',
    question:
      'A prisoner is told: "You will be hanged on a surprise day next week — you will not know the day until the morning of the execution." The prisoner reasons it cannot be Friday (or he would know by Thursday evening), and works backwards to conclude it cannot happen at all. Yet the hangman arrives on Wednesday — and the prisoner is completely surprised. What went wrong?',
    explanation:
      'The prisoner’s logic is self-defeating. By concluding the hanging cannot happen, he makes any day a surprise. The paradox highlights the tension between knowledge, prediction, and self-reference.',
  },
  {
    id: 'sorites',
    category: 'classic',
    title: 'The Sorites Paradox (Heap)',
    question:
      'A heap of 10,000 grains of sand is clearly a heap. Remove one grain — it is still a heap. Keep removing grains one by one. At what point does it stop being a heap? And if the last grain is not a heap, at which grain did it change?',
    explanation:
      'This is the paradox of vagueness. There is no sharp boundary, yet the transition clearly happens. It challenges the idea that all concepts have precise definitions and is central to fuzzy logic and sorites reasoning.',
  },
  {
    id: 'russell',
    category: 'classic',
    title: 'Russell’s Paradox',
    question: 'Consider the set of all sets that do not contain themselves. Does this set contain itself?',
    explanation:
      'If it contains itself, it should not (by definition). If it does not contain itself, it should. This paradox revealed a fundamental flaw in naive set theory and led to the development of axiomatic set theory.',
  },
  {
    id: 'zeno-achilles',
    category: 'classic',
    title: 'Zeno’s Achilles and the Tortoise',
    question:
      'Achilles gives a tortoise a head start. To catch up, he must reach the tortoise’s starting point. But by then, the tortoise has moved. He must reach that new point, but the tortoise has moved again. Does Achilles ever pass the tortoise?',
    explanation:
      'Zeno argued that motion is impossible because it requires completing infinitely many sub-tasks. Modern calculus resolves this: an infinite series can have a finite sum, so Achilles does overtake the tortoise in finite time.',
  },
  {
    id: 'crocodile',
    category: 'classic',
    title: 'The Crocodile Paradox',
    question:
      'A crocodile steals a child and tells the mother: "I will return the child if you correctly guess what I will do." The mother says, "You will not return the child." What should the crocodile do?',
    explanation:
      'If the crocodile returns the child, the mother guessed wrong — so he should not return it. If he does not return it, the mother guessed right — so he should return it. This is a variant of the Liar Paradox and has no clean resolution.',
  },

  // --- Gaming Paradoxes ---
  {
    id: 'completion-dlc',
    category: 'gaming',
    title: 'The Completion Paradox',
    question:
      'If you 100% a game but skip all the DLC, did you truly complete it? And if you then buy the DLC and 100% that too, but the developer releases more DLC, were you ever truly done?',
    explanation:
      'This plays on the Ship of Theseus: the "complete game" is a moving target. Completion is defined by the player, not the product. The paradox dissolves if you accept that "100%" is a snapshot, not a permanent state.',
  },
  {
    id: 'save-scum',
    category: 'gaming',
    title: 'The Save Scum Paradox',
    question:
      'You save before a difficult boss. You die, reload, and try again 50 times until you win. Did you beat the boss — or did you just find the one timeline where you got lucky?',
    explanation:
      'This questions whether persistence through reloading constitutes skill or brute-force luck. In practice, learning from each attempt means the 50th try is genuinely better than the 1st — but the "you" who won is not the same "you" who failed.',
  },
  {
    id: 'multiplayer-skill',
    category: 'gaming',
    title: 'The Multiplayer Skill Paradox',
    question:
      'In a competitive game, if everyone improves equally, no one gets better. Rankings stay the same, win rates stay at 50%, yet everyone is playing at a higher level. Did anyone actually improve?',
    explanation:
      'This is a relative-vs-absolute improvement paradox. Skill increased in absolute terms, but ranking is zero-sum. The system measures relative position, not absolute ability — so improvement is invisible within the closed system.',
  },
  {
    id: 'backlog',
    category: 'gaming',
    title: 'The Backlog Paradox',
    question:
      'The more games you buy, the less time you have to play each one. The less you play each one, the less you enjoy them. Yet buying more games feels like it will make you happier. Will it?',
    explanation:
      'This is the paradox of choice in gaming form. More options reduce satisfaction because each choice carries opportunity cost. The backlog itself becomes a source of stress rather than joy.',
  },
  {
    id: 'nostalgia',
    category: 'gaming',
    title: 'The Nostalgia Paradox',
    question:
      'You replay a childhood game and it feels worse than you remember. Was the game ever actually good, or were you just young? And if it made you happy then, does it matter if it is "objectively" good?',
    explanation:
      'This is the experience-vs-quality paradox. The game has not changed, but you have. The original experience was real and valid, even if the game does not meet your current standards. Quality is contextual, not fixed.',
  },
  {
    id: 'speedrun',
    category: 'gaming',
    title: 'The Speedrun Paradox',
    question:
      'The goal of a game is to experience it. A speedrunner finishes as fast as possible, skipping content. By "beating" the game optimally, are they experiencing it the least?',
    explanation:
      'Speedrunning is a different game played on top of the original. The "experience" for a speedrunner is mastery, not content consumption. The paradox dissolves when you recognize they are playing a meta-game, not the base game.',
  },
  {
    id: 'permadeath',
    category: 'gaming',
    title: 'The Permadeath Paradox',
    question:
      'In a permadeath game, your character’s death is permanent and meaningful. But you can just start a new character. If death has no lasting consequence for the player, is it truly permanent?',
    explanation:
      'The permanence is in-world, not meta. The character is gone, but the player continues. The paradox highlights the gap between player and avatar — the consequence is real within the game’s fiction, even if the player can simply try again.',
  },

  // --- Logic Puzzles ---
  {
    id: 'two-doors',
    category: 'logic',
    title: 'The Two Doors',
    question:
      'You face two doors: one leads to freedom, one to death. Two guards stand by — one always lies, one always tells the truth. You do not know which is which. You may ask one guard one question. What do you ask?',
    explanation:
      'Ask either guard: "If I asked the other guard which door leads to freedom, what would they say?" Then take the opposite door. The truth-teller will report the liar’s false answer, and the liar will invert the truth-teller’s correct answer. Either way, the indicated door is wrong.',
  },
  {
    id: 'three-lights',
    category: 'logic',
    title: 'The Three Switches',
    question:
      'You are in a room with three switches. Each controls one of three bulbs in another room. You can flip switches as much as you like, but you may enter the other room only once. How do you determine which switch controls which bulb?',
    explanation:
      'Turn on switch 1 for several minutes. Turn it off, then turn on switch 2. Enter the room: the lit bulb is switch 2, the warm unlit bulb is switch 1, and the cold unlit bulb is switch 3. You used heat as a second information channel.',
  },
  {
    id: 'bridge-crossing',
    category: 'logic',
    title: 'The Bridge Crossing',
    question:
      'Four people must cross a bridge in 17 minutes. They have one torch and can cross at most two at a time. Each person crosses at a different speed: 1, 2, 5, and 10 minutes. When two cross, they move at the slower person’s pace. How do they all cross in 17 minutes?',
    explanation:
      'Send the two fastest (1 and 2) first: 2 min. One returns with the torch: 1 min. Send the two slowest (5 and 10): 10 min. The 2-minute person returns: 2 min. Finally, 1 and 2 cross again: 2 min. Total: 2 + 1 + 10 + 2 + 2 = 17.',
  },
  {
    id: 'monty-hall',
    category: 'logic',
    title: 'The Monty Hall Problem',
    question:
      'You are on a game show. Three doors: one has a car, two have goats. You pick door 1. The host, who knows what is behind each door, opens door 3 to reveal a goat. He asks: "Do you want to switch to door 2?" Should you switch?',
    explanation:
      'Yes — switching doubles your chances. When you first pick, you have a 1/3 chance. The host’s reveal of a goat does not change your door’s probability. The remaining 2/3 probability is now concentrated on door 2. Switching wins 2/3 of the time.',
  },
  {
    id: 'blue-eyes',
    category: 'logic',
    title: 'The Blue-Eyed Islanders',
    question:
      'On an island, 100 people have blue eyes and 100 have brown. They can see each other but cannot communicate about eye color. There are no mirrors. If a person discovers their own eye color, they must leave at midnight. An outsider says: "At least one of you has blue eyes." What happens?',
    explanation:
      'On the 100th midnight, all 100 blue-eyed people leave. Each blue-eyed person sees 99 others and thinks: "If I am not blue, those 99 will leave on day 99." When they do not, each deduces they must also be blue. The outsider’s statement provides the common knowledge that starts the chain.',
  },
  {
    id: 'missing-dollar',
    category: 'logic',
    title: 'The Missing Dollar',
    question:
      'Three friends pay $10 each for a $30 hotel room. The clerk realizes the room is only $25 and gives $5 to the bellhop to return. The bellhop keeps $2 and gives $1 back to each friend. Each friend paid $9 ($27 total), plus the bellhop’s $2 = $29. Where is the missing dollar?',
    explanation:
      'There is no missing dollar. The $27 already includes the bellhop’s $2. The correct breakdown: $25 (room) + $2 (bellhop) = $27 paid by the friends, plus $3 returned = $30. The trick is adding the bellhop’s $2 to the $27 instead of subtracting it.',
  },

  // --- Thought Experiments ---
  {
    id: 'trolley',
    category: 'thought',
    title: 'The Trolley Problem',
    question:
      'A trolley is heading toward five people tied to the tracks. You can pull a lever to divert it to a side track, where it will kill one person instead. Should you pull the lever?',
    explanation:
      'Utilitarianism says yes (saving five lives is better than one). Deontological ethics says no — actively pulling the lever makes you responsible for the one death, whereas inaction means you did not kill anyone. There is no universally accepted answer.',
  },
  {
    id: 'chinese-room',
    category: 'thought',
    title: 'The Chinese Room',
    question:
      'A person who does not speak Chinese sits in a room with a rulebook. Chinese characters are passed in, and they use the rules to pass out appropriate Chinese responses. To outsiders, the room "speaks Chinese." Does the person inside understand Chinese?',
    explanation:
      'John Searle argued no — the person is just manipulating symbols without understanding. The thought experiment challenges the idea that passing a Turing test means genuine understanding, and questions whether computation alone can produce consciousness.',
  },
  {
    id: 'brain-vat',
    category: 'thought',
    title: 'Brain in a Vat',
    question:
      'If your brain were removed and placed in a vat, connected to a computer that simulates your entire reality perfectly, how would you know? Are you experiencing this moment, or is it a simulation?',
    explanation:
      'You cannot know from within the simulation. This is a modern version of Descartes’ evil demon hypothesis. It challenges the reliability of sensory experience and is related to simulation theory, though it is not empirically resolvable.',
  },
  {
    id: 'ship-identity',
    category: 'thought',
    title: 'The Teletransporter Paradox',
    question:
      'A teleporter scans you, destroys your body, and rebuilds a perfect copy at the destination. The copy has your memories, personality, and body. Is it you? And if the teleporter malfunctioned and the original was not destroyed, which one is "you"?',
    explanation:
      'If identity is psychological continuity, the copy is you. If it requires physical continuity, you died and the copy is a new person. The malfunction scenario (two copies) reveals that even psychological continuity does not guarantee uniqueness — "you" cannot be two people at once.',
  },
  {
    id: 'experience-machine',
    category: 'thought',
    title: 'The Experience Machine',
    question:
      'Imagine a machine that can simulate any experience perfectly — you would believe you are living your ideal life. You would not know you are in a machine. Would you plug in for life, knowing it is not "real"?',
    explanation:
      'Robert Nozick argued most people would not, revealing that we value authenticity and actually doing things, not just experiencing them. This challenges hedonism — the idea that pleasure is the only intrinsic good.',
  },
  {
    id: 'inverted-spectrum',
    category: 'thought',
    title: 'The Inverted Spectrum',
    question:
      'What if the color you see as "red" is what I experience as "blue"? We both call it red, we both agree on the name, but our inner experience is completely different. Could you ever know?',
    explanation:
      'This highlights the problem of qualia — subjective conscious experience. Since we can only compare behavior and language, not inner experience, we cannot know if our subjective colors match. It challenges physicalist explanations of consciousness.',
  },
  {
    id: 'library-babel',
    category: 'thought',
    title: 'The Library of Babel',
    question:
      'Imagine a library containing every possible 410-page book — every combination of letters, spaces, and punctuation. It contains every book ever written, every book that will ever be written, and every book that could exist. Is any information useful if it is buried in infinite noise?',
    explanation:
      'This is Jorge Luis Borges’ thought experiment. The library contains all knowledge, but also all falsehoods, and no way to distinguish them. It illustrates that information without selection or context is indistinguishable from randomness — meaning requires curation.',
  },
];

/**
 * Get the day-of-year (1-366) for deterministic daily rotation.
 */
const getDayOfYear = (date = new Date()) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

/**
 * Get today's paradox based on day-of-year rotation.
 * Deterministic — every user sees the same paradox on the same day.
 */
export const getTodayParadox = () => {
  const dayOfYear = getDayOfYear();
  const index = dayOfYear % PARADOXES.length;
  const paradox = PARADOXES[index];
  return {
    ...paradox,
    categoryLabel: CATEGORIES[paradox.category]?.label || paradox.category,
    categoryIcon: CATEGORIES[paradox.category]?.icon || '🤔',
    dayOfYear,
    totalParadoxes: PARADOXES.length,
  };
};

/**
 * Get the stored state for the daily paradox.
 * Returns { revealed: boolean, lastDateKey: string }.
 */
export const getParadoxState = () => {
  try {
    return StorageService.get(STORAGE_KEY, { revealed: false, lastDateKey: null });
  } catch {
    return { revealed: false, lastDateKey: null };
  }
};

/**
 * Get today's date key (YYYY-MM-DD) for tracking "has the user seen today's paradox".
 */
const getTodayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Check if the stored state is for today. If it is from a previous day,
 * reset the revealed state.
 */
export const getTodayParadoxState = () => {
  const todayKey = getTodayKey();
  const state = getParadoxState();
  if (state.lastDateKey !== todayKey) {
    return { revealed: false, lastDateKey: todayKey };
  }
  return state;
};

/**
 * Mark today's paradox explanation as revealed.
 */
export const markParadoxRevealed = () => {
  const todayKey = getTodayKey();
  StorageService.set(STORAGE_KEY, { revealed: true, lastDateKey: todayKey });
};

/**
 * Mark today's paradox as not revealed (collapse the explanation).
 */
export const markParadoxHidden = () => {
  const todayKey = getTodayKey();
  StorageService.set(STORAGE_KEY, { revealed: false, lastDateKey: todayKey });
};

/**
 * Get all paradox categories for display.
 */
export const getCategories = () => CATEGORIES;

/**
 * Get the total number of paradoxes in the library.
 */
export const getTotalParadoxes = () => PARADOXES.length;
