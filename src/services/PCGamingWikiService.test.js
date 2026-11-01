import PCGamingWikiService from './PCGamingWikiService';

const lookupFor = (wikitext) => async (name) => {
  window.electronAPI = {
    pcgwLookup: jest.fn().mockResolvedValue({ ok: true, pageTitle: name, pageUrl: 'https://pcgw/x', wikitext }),
  };
  return PCGamingWikiService.lookup({ name: `Unique ${name}` });
};

const inputBlock = (rows) => `{{Input\n${rows}\n}}`;

beforeEach(() => {
  localStorage.clear();
  delete window.electronAPI;
});

test('unknown controller values report as unknown, not a negative', async () => {
  const entry = await lookupFor(
    inputBlock('| full controller support = unknown\n| xinput-compatible controllers = true')
  )('UnknownPad');
  expect(entry.controller.fullController).toBe('unknown');
  expect(entry.controller.xinput).toBe('yes');
});

test('explicit no and limited map to their own values', async () => {
  const entry = await lookupFor(inputBlock('| full controller support = false\n| controller remapping = limited'))(
    'NoPad'
  );
  expect(entry.controller.fullController).toBe('no');
  expect(entry.controller.controllerRemap).toBe('limited');
});

test('remap-only data still produces a controller summary', async () => {
  const entry = await lookupFor(inputBlock('| controller remapping = true'))('RemapOnly');
  expect(entry.controller).not.toBeNull();
  expect(entry.controller.controllerRemap).toBe('yes');
  expect(entry.controller.fullController).toBeNull();
});

test('no controller rows at all yields no controller summary', async () => {
  const entry = await lookupFor('{{Game data/saves|Windows|C:\\Saves}}')('EmptyPad');
  expect(entry.controller).toBeNull();
});
