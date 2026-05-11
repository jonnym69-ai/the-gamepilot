import { useEffect, useState } from 'react';
import InterfacePreferencesService from '../services/InterfacePreferencesService';

export default function useInterfacePreferences() {
  const [prefs, setPrefs] = useState(() => InterfacePreferencesService.getAll());

  useEffect(() => {
    const unsubscribe = InterfacePreferencesService.subscribe((next) => {
      setPrefs(next);
    });
    return unsubscribe;
  }, []);

  return prefs;
}
