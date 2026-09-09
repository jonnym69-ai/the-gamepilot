/**
 * Library filter state for the Home and Library pages.
 *
 * These three filters (mood, time, genre) are purely UI state with no
 * side effects, so they can live in a tiny standalone hook.
 */

import { useState } from 'react';

export default function useLibraryFilters() {
  const [filterMood, setFilterMood] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [filterGenre, setFilterGenre] = useState('');

  return { filterMood, setFilterMood, filterTime, setFilterTime, filterGenre, setFilterGenre };
}
