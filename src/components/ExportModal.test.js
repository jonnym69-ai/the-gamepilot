import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import html2canvas from 'html2canvas';
import ExportModal from './ExportModal';

jest.mock('html2canvas', () => jest.fn());

afterEach(() => jest.restoreAllMocks());

test('showcase exports only the library and treats game text as text', async () => {
  const close = jest.fn();
  const library = [{ name: '<b>Not markup</b>', platform: '<i>Steam</i>', time_played: 120 }];
  URL.createObjectURL = jest.fn(() => 'blob:test');
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  html2canvas.mockImplementation(async (element, options) => {
    expect(within(element).getByRole('heading', { level: 3 })).toContainHTML('<h3>&lt;b&gt;Not markup&lt;/b&gt;</h3>');
    expect(options.allowTaint).toBe(false);
    return { toBlob: (callback) => callback(new Blob(['image'], { type: 'image/png' })) };
  });
  render(<ExportModal isOpen library={library} onClose={close} />);
  expect(screen.getByRole('button', { name: 'Stats', exact: true })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Profile', exact: true })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Export Library' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(URL.createObjectURL).toHaveBeenCalled();
});
