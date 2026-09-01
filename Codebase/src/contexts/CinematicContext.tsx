import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  type CinematicTheme,
  type CinematicCustomization,
  cinematicThemes,
  applyCinematicTheme,
  removeCinematicTheme,
  saveCinematicState,
  loadCinematicState,
  clearCinematicState,
} from '@/lib/cinematicTheme';
import { loadTheme, applyTheme } from '@/lib/theme';

interface CinematicContextValue {
  activeTheme: CinematicTheme | null;
  customization: CinematicCustomization | null;
  isCinematic: boolean;
  activateCinematic: (theme: CinematicTheme, custom?: CinematicCustomization) => void;
  deactivateCinematic: () => void;
  updateCustomization: (partial: Partial<CinematicCustomization>) => void;
}

const CinematicContext = createContext<CinematicContextValue | null>(null);

export function CinematicProvider({ children }: { children: React.ReactNode }) {
  const [activeTheme, setActiveTheme] = useState<CinematicTheme | null>(null);
  const [customization, setCustomization] = useState<CinematicCustomization | null>(null);

  // Restore on mount
  useEffect(() => {
    const saved = loadCinematicState();
    if (saved) {
      const theme = cinematicThemes.find(t => t.id === saved.themeId);
      if (theme) {
        setActiveTheme(theme);
        setCustomization(saved.customization);
        applyCinematicTheme(theme, saved.customization);
      }
    }
  }, []);

  const activateCinematic = useCallback((theme: CinematicTheme, custom?: CinematicCustomization) => {
    const c = custom || theme.defaultCustomization;
    setActiveTheme(theme);
    setCustomization(c);
    applyCinematicTheme(theme, c);
    saveCinematicState({ themeId: theme.id, customization: c });
  }, []);

  const deactivateCinematic = useCallback(() => {
    setActiveTheme(null);
    setCustomization(null);
    removeCinematicTheme();
    clearCinematicState();
    // Restore basic theme
    const saved = loadTheme();
    if (saved) applyTheme(saved);
  }, []);

  const updateCustomization = useCallback((partial: Partial<CinematicCustomization>) => {
    if (!activeTheme || !customization) return;
    const updated = { ...customization, ...partial };
    setCustomization(updated);
    applyCinematicTheme(activeTheme, updated);
    saveCinematicState({ themeId: activeTheme.id, customization: updated });
  }, [activeTheme, customization]);

  return (
    <CinematicContext.Provider value={{
      activeTheme,
      customization,
      isCinematic: !!activeTheme,
      activateCinematic,
      deactivateCinematic,
      updateCustomization,
    }}>
      {children}
    </CinematicContext.Provider>
  );
}

export function useCinematic() {
  const ctx = useContext(CinematicContext);
  if (!ctx) throw new Error('useCinematic must be used within CinematicProvider');
  return ctx;
}


