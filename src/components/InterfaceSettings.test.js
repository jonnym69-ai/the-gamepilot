import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

  test('secondary accent section only appears once a primary accent is picked', () => {
    render(<InterfaceSettings />);
    expect(screen.queryByText('Secondary accent')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Violet' }));
    expect(screen.getByText('Secondary accent')).toBeInTheDocument();
    expect(screen.getByLabelText('Custom secondary accent color')).toBeInTheDocument();
  });

  test('secondary presets set accentSecondaryOverride and Auto clears it', () => {
    InterfacePreferencesService.set('accentOverride', '#8b5cf6');
    render(<InterfaceSettings />);
    const secondary = within(screen.getByRole('group', { name: 'Secondary accent' }));

    fireEvent.click(secondary.getByRole('button', { name: 'Sky' }));
    expect(InterfacePreferencesService.get('accentSecondaryOverride')).toBe('#38bdf8');

    fireEvent.click(secondary.getByRole('button', { name: 'Auto' }));
    expect(InterfacePreferencesService.get('accentSecondaryOverride')).toBe(null);
  });

  test('quick pairs set primary and secondary together', () => {
    InterfacePreferencesService.set('accentOverride', '#8b5cf6');
    render(<InterfaceSettings />);

    fireEvent.click(screen.getByRole('button', { name: 'Vaporwave' }));
    expect(InterfacePreferencesService.get('accentOverride')).toBe('#8b5cf6');
    expect(InterfacePreferencesService.get('accentSecondaryOverride')).toBe('#d946ef');

    fireEvent.click(screen.getByRole('button', { name: 'Ocean' }));
    expect(InterfacePreferencesService.get('accentOverride')).toBe('#38bdf8');
    expect(InterfacePreferencesService.get('accentSecondaryOverride')).toBe('#6366f1');
  });

  test('accent reach toggles appear with an accent and write their prefs', () => {
    InterfacePreferencesService.set('accentOverride', '#8b5cf6');
    render(<InterfaceSettings />);
    const reach = within(screen.getByRole('group', { name: 'Accent reach' }));

    fireEvent.click(reach.getByRole('checkbox', { name: /tinted borders/i }));
    expect(InterfacePreferencesService.get('accentTintBorders')).toBe(true);

    fireEvent.click(reach.getByRole('checkbox', { name: /tinted headers/i }));
    expect(InterfacePreferencesService.get('accentTintHeaders')).toBe(true);

    fireEvent.click(reach.getByRole('checkbox', { name: /tinted text/i }));
    expect(InterfacePreferencesService.get('accentTintText')).toBe(true);
  });
});
