import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import RecommendationPreferenceControl from './RecommendationPreferenceControl';
import RecommendationPreferenceService from '../services/RecommendationPreferenceService';
import StorageService from '../services/StorageService';

beforeEach(() => localStorage.clear());

test('selecting a reason pauses recommendations and shows recovery text', () => {
  render(<RecommendationPreferenceControl game={{ name: 'Hades' }} />);
  const select = screen.getByLabelText('Recommendation preference for Hades');
  expect(select).toHaveValue('');
  fireEvent.change(select, { target: { value: 'technical' } });
  expect(RecommendationPreferenceService.isSetAside('Hades')).toBe(true);
  expect(screen.getByText(/Paused in recommendations until you choose Recommend normally/)).toBeInTheDocument();
  expect(screen.getByText(/You can still launch this game/)).toBeInTheDocument();
});

test('refresher adds the session notes hint', () => {
  render(<RecommendationPreferenceControl game={{ name: 'Hades' }} />);
  fireEvent.change(screen.getByLabelText('Recommendation preference for Hades'), {
    target: { value: 'refresher' },
  });
  expect(screen.getByText(/session notes and Guides in game details can help you return/)).toBeInTheDocument();
});

test('choosing Recommend normally clears the set-aside', () => {
  RecommendationPreferenceService.setPreference('Hades', 'waiting-friends');
  render(<RecommendationPreferenceControl game={{ name: 'Hades' }} />);
  const select = screen.getByLabelText('Recommendation preference for Hades');
  expect(select).toHaveValue('waiting-friends');
  fireEvent.change(select, { target: { value: '' } });
  expect(RecommendationPreferenceService.isSetAside('Hades')).toBe(false);
  expect(screen.queryByText(/Paused in recommendations/)).not.toBeInTheDocument();
});

test('a failed save surfaces an alert and leaves the select unchanged', () => {
  jest.spyOn(StorageService, 'set').mockReturnValue(false);
  render(<RecommendationPreferenceControl game={{ name: 'Hades' }} />);
  const select = screen.getByLabelText('Recommendation preference for Hades');
  fireEvent.change(select, { target: { value: 'technical' } });
  expect(screen.getByRole('alert')).toHaveTextContent(/Couldn.t save that preference/);
  expect(select).toHaveValue('');
  jest.restoreAllMocks();
});
