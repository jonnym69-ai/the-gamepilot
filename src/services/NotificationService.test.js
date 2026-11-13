import NotificationService from './NotificationService';
import SteamFriendsService from './SteamFriendsService';

const notify = jest.fn();
const configureFriendsWatch = jest.fn();

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  window.electronAPI = { notify, configureFriendsWatch };
});

describe('NotificationService', () => {
  test('prefs are off by default and persist per kind', () => {
    expect(NotificationService.getPrefs()).toEqual({ friends: false, deals: false });
    NotificationService.setPref('deals', true);
    expect(NotificationService.getPrefs().deals).toBe(true);
    expect(NotificationService.getPrefs().friends).toBe(false);
  });

  test('deal alerts toast once per key, not on repeat checks', () => {
    NotificationService.setPref('deals', true);
    const summary = {
      drops: [{ key: 'game-1', title: 'Zomboid', currentPrice: { price: 9.99 } }],
      deals: [{ key: 'game-2', title: 'Hades', currentPrice: { price: 4.99 } }],
    };
    NotificationService.onPriceAlertSummary(summary);
    expect(notify).toHaveBeenCalledTimes(2);
    NotificationService.onPriceAlertSummary(summary);
    expect(notify).toHaveBeenCalledTimes(2); // same keys — no re-toast
  });

  test('deal alerts stay silent when disabled', () => {
    NotificationService.onPriceAlertSummary({ drops: [{ key: 'x', title: 'X' }], deals: [] });
    expect(notify).not.toHaveBeenCalled();
  });

  test('friends watch registers only when both prefs and presence allow', async () => {
    await NotificationService.syncFriendsWatch([{ name: 'Hades' }]);
    expect(configureFriendsWatch).toHaveBeenLastCalledWith({ enabled: false, steamId: '', ownedNames: [] });

    NotificationService.setPref('friends', true);
    SteamFriendsService.setEnabled(true);
    SteamFriendsService.setSteamId('76561198000000000');
    await NotificationService.syncFriendsWatch([{ name: 'Hades' }]);
    expect(configureFriendsWatch).toHaveBeenLastCalledWith({
      enabled: true,
      steamId: '76561198000000000',
      ownedNames: ['Hades'],
    });
  });
});
