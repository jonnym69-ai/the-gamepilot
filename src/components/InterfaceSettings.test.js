import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InterfaceSettings from './InterfaceSettings';
import InterfacePreferencesService from '../services/InterfacePreferencesService';

describe('InterfaceSettings accent picker', () => {
  beforeEach(() => {
    localStorage.clear();
    InterfacePreferencesService.resetAll();
    InterfacePreferencesService.set('recentAccents', []);
  });

  test('renders all accent preset swatches plus a custom color input', () => {
    render(<InterfaceSettings />);
    [
      'Follow theme',
      'Orange',
      'Emerald',
      'Violet',
      'Sky',
      'Rose',
      'Amber',
      'Crimson',
      'Lime',
      'Teal',
      'Indigo',
      'Fuchsia',
      'Gold',
    ].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Custom accent color')).toBeInTheDocument();
  });

  test('clicking a preset sets accentOverride', () => {
    render(<InterfaceSettings />);
    fireEvent.click(screen.getByRole('button', { name: 'Teal' }));
    expect(InterfacePreferencesService.get('accentOverride')).toBe('#14b8a6');
    fireEvent.click(screen.getByRole('button', { name: 'Follow theme' }));
    expect(InterfacePreferencesService.get('accentOverride')).toBe(null);
  });

  test('custom color input sets accentOverride and records it in recents', () => {
    render(<InterfaceSettings />);
    fireEvent.change(screen.getByLabelText('Custom accent color'), {
      target: { value: '#123abc' },
    });
    expect(InterfacePreferencesService.get('accentOverride')).toBe('#123abc');
    expect(InterfacePreferencesService.get('recentAccents')).toContain('#123abc');
  });
});
