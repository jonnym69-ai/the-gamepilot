import { displayGameTitle } from './gameTitle';

describe('displayGameTitle', () => {
  it('restores a trailing sort article', () => {
    expect(displayGameTitle('Witcher 3, The')).toBe('The Witcher 3');
    expect(displayGameTitle('Sims, The')).toBe('The Sims');
    expect(displayGameTitle('Warriors, The')).toBe('The Warriors');
  });

  it('restores a moved article and keeps the subtitle', () => {
    expect(displayGameTitle('Matrix, The Path of Neo')).toBe('The Matrix: Path of Neo');
    expect(displayGameTitle('Lord of the Rings, The The Two Towers')).toBe('The Lord of the Rings: The Two Towers');
  });

  it('accepts separator variants between article and subtitle', () => {
    expect(displayGameTitle('Matrix, The - Path of Neo')).toBe('The Matrix: Path of Neo');
    expect(displayGameTitle('Matrix, The: Path of Neo')).toBe('The Matrix: Path of Neo');
  });

  it('does not double the article when the base already leads with it', () => {
    expect(displayGameTitle('The Lord of the Rings, The Two Towers')).toBe('The Lord of the Rings: The Two Towers');
  });

  it('leaves normal titles and non-article commas untouched', () => {
    expect(displayGameTitle('Project Zomboid')).toBe('Project Zomboid');
    expect(displayGameTitle('Scarface The World Is Yours')).toBe('Scarface The World Is Yours');
    expect(displayGameTitle('Lock, Stock & Two Smoking Barrels')).toBe('Lock, Stock & Two Smoking Barrels');
    expect(displayGameTitle('Them, There')).toBe('Them, There');
  });

  it('handles empty input', () => {
    expect(displayGameTitle('')).toBe('');
    expect(displayGameTitle(null)).toBe('');
    expect(displayGameTitle(undefined)).toBe('');
  });
});
