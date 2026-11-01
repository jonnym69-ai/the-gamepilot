import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EditGameModal from './EditGameModal';
import { GameCurationService } from '../services/GameCurationService';

const baseGame = {
  name: 'The Witcher 3',
  appid: 292030,
  genres: ['RPG'],
  releaseYear: 2015,
  developer: 'CD Projekt Red',
  publisher: 'CD Projekt',
  isHidden: false,
};

const renderModal = (props = {}) =>
  render(
    <EditGameModal
      game={props.game || baseGame}
      isOpen
      onClose={props.onClose || jest.fn()}
      onSave={props.onSave || jest.fn()}
      onUpdateCoverArt={props.onUpdateCoverArt || jest.fn()}
      onToggleHidden={props.onToggleHidden || jest.fn()}
    />
  );

beforeEach(() => {
  localStorage.clear();
});

test('renders the current effective values', () => {
  renderModal();

  expect(screen.getByPlaceholderText('The Witcher 3')).toBeInTheDocument(); // sort name
  expect(screen.getByText('RPG')).toBeInTheDocument(); // genre chip
  expect(screen.getByDisplayValue('2015')).toBeInTheDocument();
  expect(screen.getByDisplayValue('CD Projekt Red')).toBeInTheDocument();
  expect(screen.getByDisplayValue('CD Projekt')).toBeInTheDocument();
});

test('adds and removes genre chips', () => {
  renderModal();

  const genreInput = screen.getByRole('combobox', { name: 'Genres' });
  expect(genreInput).toBeInTheDocument();

  fireEvent.change(genreInput, { target: { value: 'Action' } });
  fireEvent.keyDown(genreInput, { key: 'Enter' });
  expect(screen.getByText('Action')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Remove Action' }));
  expect(screen.queryByText('Action')).not.toBeInTheDocument();
});

test('save sends a normalized patch of changed fields only', () => {
  const onSave = jest.fn();
  const onUpdateCoverArt = jest.fn();
  const onToggleHidden = jest.fn();
  const onClose = jest.fn();
  renderModal({ onSave, onUpdateCoverArt, onToggleHidden, onClose });

  fireEvent.change(screen.getByDisplayValue('CD Projekt Red'), { target: { value: 'CDPR' } });
  fireEvent.change(screen.getByPlaceholderText('Paste image URL…'), {
    target: { value: 'https://img.example/cover.jpg' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /Save/ }));

  expect(onSave).toHaveBeenCalledWith('The Witcher 3', { developer: 'CDPR' });
  expect(onUpdateCoverArt).toHaveBeenCalledWith('The Witcher 3', 'https://img.example/cover.jpg');
  expect(onToggleHidden).toHaveBeenCalledWith('The Witcher 3');
  expect(onClose).toHaveBeenCalled();
});

test('unchanged save clears nothing but still commits side channels only when needed', () => {
  const onSave = jest.fn();
  const onUpdateCoverArt = jest.fn();
  const onToggleHidden = jest.fn();
  renderModal({ onSave, onUpdateCoverArt, onToggleHidden });

  fireEvent.click(screen.getByRole('button', { name: /Save/ }));

  expect(onSave).toHaveBeenCalledWith('The Witcher 3', null);
  expect(onUpdateCoverArt).not.toHaveBeenCalled();
  expect(onToggleHidden).not.toHaveBeenCalled();
});

test('reset clears the metadata override and cover art', () => {
  const onSave = jest.fn();
  const onUpdateCoverArt = jest.fn();
  GameCurationService.setMetadataOverride('The Witcher 3', { genres: ['Adventure'] });
  const game = { ...baseGame, coverArtOverride: 'https://img.example/old.jpg' };
  renderModal({ onSave, onUpdateCoverArt, game });

  fireEvent.click(screen.getByRole('button', { name: /Reset to scanned/ }));

  expect(onSave).toHaveBeenCalledWith('The Witcher 3', null);
  expect(onUpdateCoverArt).toHaveBeenCalledWith('The Witcher 3', '');
});

test('escape and backdrop close the modal', () => {
  const onClose = jest.fn();
  renderModal({ onClose });

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByTestId('egm-overlay'));
  expect(onClose).toHaveBeenCalledTimes(2);
});
