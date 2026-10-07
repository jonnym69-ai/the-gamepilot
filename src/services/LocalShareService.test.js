import { LocalShareService } from './LocalShareService';
import { openExternalUrl } from './ElectronBridge';
import { StatsAggregationService } from './StatsAggregationService';
import { buildLibraryShareData } from '../components/LibraryShareCard';

jest.mock('./ElectronBridge', () => ({ openExternalUrl: jest.fn() }));
jest.mock('./StatsAggregationService', () => ({
  StatsAggregationService: { getDashboardData: jest.fn() },
}));
jest.mock('./GamingPersonaService', () => ({ __esModule: true, default: { getPersona: () => null } }));
jest.mock('./CurrentEraService', () => ({ __esModule: true, default: { getEraTagline: () => '' } }));

beforeEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
  openExternalUrl.mockReset();
  StatsAggregationService.getDashboardData.mockReturnValue({ periods: {} });
});

test.each(['weekly', 'monthly'])('empty %s recap never substitutes lifetime hours', (period) => {
  const library = [{ name: 'Old favourite', platform: 'Steam', time_played: 6000, launch_count: 30 }];
  const data = buildLibraryShareData(library, 'Pilot', period);
  expect(data.totalMinutes).toBe(0);
  expect(data.mostPlayed).toEqual([]);
  const caption = LocalShareService.buildLibraryShareText(library, 'Pilot', period);
  expect(caption).not.toContain('100h');
  expect(caption).not.toContain('Old favourite');
});

test('a rejected external URL is not reported as opened', async () => {
  openExternalUrl.mockResolvedValue(false);
  expect((await LocalShareService.openShareIntent('x', 'My recap')).success).toBe(false);
});

test.each(['shareToDiscord', 'shareToMessenger'])('%s does not open after a failed caption copy', async (method) => {
  jest.spyOn(LocalShareService, 'copyTextToClipboard').mockResolvedValue(false);
  expect((await LocalShareService[method]({ text: 'My recap' })).success).toBe(false);
  expect(openExternalUrl).not.toHaveBeenCalled();
});

test('image copy requires ClipboardItem as well as clipboard.write', () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write: jest.fn() } });
  expect(LocalShareService.canCopyImage()).toBe(false);
});
