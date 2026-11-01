import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemePicker from './ThemePicker';

const THEMES = {
  dark: { id: 'dark', name: 'Dark', preview: 'linear-gradient(135deg, #111, #222)' },
  ember: { id: 'ember', name: 'Ember', preview: 'linear-gradient(135deg, #ff8c1a, #120b08)' },
  aurora: { id: 'aurora', name: 'Aurora', preview: 'linear-gradient(135deg, #14b8a6, #6366f1)' },
};

describe('ThemePicker', () => {
  test('renders a tile per theme and calls onSelect with the theme id', () => {
    const onSelect = jest.fn();
    render(<ThemePicker themes={THEMES} currentTheme="dark" onSelect={onSelect} />);

    const aurora = screen.getByRole('button', { name: /Aurora/ });
    expect(screen.getByRole('button', { name: /Dark/ })).toBeInTheDocument();
    expect(aurora).toBeInTheDocument();

    fireEvent.click(aurora);
    expect(onSelect).toHaveBeenCalledWith('aurora');
  });

  test('marks the current theme pressed and filters tiles by search query', () => {
    render(<ThemePicker themes={THEMES} currentTheme="ember" onSelect={jest.fn()} />);

    expect(screen.getByRole('button', { name: /Ember/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Dark/ })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.change(screen.getByLabelText('Search themes'), { target: { value: 'aur' } });
    expect(screen.getByRole('button', { name: /Aurora/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ember/ })).not.toBeInTheDocument();
  });
});
