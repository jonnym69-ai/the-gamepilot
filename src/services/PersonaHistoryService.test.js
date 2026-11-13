import PersonaHistoryService from './PersonaHistoryService';

beforeEach(() => {
  localStorage.clear();
});

describe('PersonaHistoryService yearbook', () => {
  test('archiveYear writes a settled year once and stays idempotent', () => {
    PersonaHistoryService.archiveYear(2024, { id: 'explorer', label: 'The Explorer', themeId: 'void' });
    PersonaHistoryService.archiveYear(2024, { id: 'other', label: 'Someone Else', themeId: 'ember' });

    const book = PersonaHistoryService.getYearbook();
    expect(book).toHaveLength(1);
    expect(book[0]).toMatchObject({ year: 2024, id: 'explorer', label: 'The Explorer', themeId: 'void' });
  });

  test('archiveYear ignores entries without a persona id', () => {
    PersonaHistoryService.archiveYear(2024, { label: 'No Id' });
    PersonaHistoryService.archiveYear('not-a-year', { id: 'x', label: 'X' });

    expect(PersonaHistoryService.getYearbook()).toEqual([]);
  });

  test('getYearbook returns entries sorted newest year first', () => {
    PersonaHistoryService.archiveYear(2022, { id: 'p1', label: 'First' });
    PersonaHistoryService.archiveYear(2024, { id: 'p3', label: 'Third' });
    PersonaHistoryService.archiveYear(2023, { id: 'p2', label: 'Second' });

    expect(PersonaHistoryService.getYearbook().map((entry) => entry.year)).toEqual([2024, 2023, 2022]);
  });
});
