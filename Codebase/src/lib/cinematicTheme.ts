// â”€â”€â”€ Cinematic Theme Engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 5 movie-inspired immersive themes with full CSS variable overrides,
// button shape, font, and animation background configuration.

export type AnimationSpeed = 'slow' | 'medium' | 'fast';
export type FontStyle = 'default' | 'mono' | 'serif' | 'wide' | 'sharp';
export type BackgroundAnimation =
  | 'matrix-rain'
  | 'star-field'
  | 'tron-grid'
  | 'dust-particles'
  | 'geometric-spin';

export interface CinematicCustomization {
  accentColor: string;          // hex
  bgIntensity: number;          // 0-100
  animationSpeed: AnimationSpeed;
  fontStyle: FontStyle;
}

export interface CinematicTheme {
  id: string;
  name: string;
  tagline: string;
  year: string;
  palette: {
    background: string;         // CSS HSL values (no hsl() wrapper)
    foreground: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    border: string;
    ring: string;
    sidebar: string;
    sidebarForeground: string;
  };
  buttonRadius: string;         // e.g. '0px', '9999px', '4px'
  fontFamily: string;           // CSS font-family stack
  animationType: BackgroundAnimation;
  glowColor: string;            // rgba or hex for canvas glow
  previewColors: string[];      // 3 hex colors for preview swatch
  defaultCustomization: CinematicCustomization;
}

// â”€â”€â”€ Theme Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const cinematicThemes: CinematicTheme[] = [
  // 1. THE MATRIX
  {
    id: 'matrix',
    name: 'The Matrix',
    tagline: 'There is no spoon.',
    year: '1999',
    palette: {
      background: '120 100% 2%',
      foreground: '120 80% 82%',
      card: '120 80% 4%',
      cardForeground: '120 80% 82%',
      primary: '120 100% 40%',
      primaryForeground: '120 100% 2%',
      secondary: '120 60% 15%',
      secondaryForeground: '120 80% 82%',
      muted: '120 50% 8%',
      mutedForeground: '120 40% 50%',
      accent: '120 100% 55%',
      accentForeground: '120 100% 2%',
      border: '120 60% 18%',
      ring: '120 100% 40%',
      sidebar: '120 80% 3%',
      sidebarForeground: '120 80% 82%',
    },
    buttonRadius: '0px',
    fontFamily: '"Courier New", "Lucida Console", monospace',
    animationType: 'matrix-rain',
    glowColor: 'rgba(0, 255, 65, 0.8)',
    previewColors: ['#00ff41', '#003b00', '#001a00'],
    defaultCustomization: {
      accentColor: '#00ff41',
      bgIntensity: 70,
      animationSpeed: 'medium',
      fontStyle: 'mono',
    },
  },

  // 2. INTERSTELLAR
  {
    id: 'interstellar',
    name: 'Interstellar',
    tagline: 'Mankind was born on Earth. It was never meant to die here.',
    year: '2014',
    palette: {
      background: '220 35% 6%',
      foreground: '42 60% 88%',
      card: '220 35% 9%',
      cardForeground: '42 60% 88%',
      primary: '42 85% 58%',
      primaryForeground: '220 35% 6%',
      secondary: '220 25% 18%',
      secondaryForeground: '42 60% 88%',
      muted: '220 25% 12%',
      mutedForeground: '220 15% 55%',
      accent: '42 100% 68%',
      accentForeground: '220 35% 6%',
      border: '220 20% 20%',
      ring: '42 85% 58%',
      sidebar: '220 40% 5%',
      sidebarForeground: '42 60% 88%',
    },
    buttonRadius: '6px',
    fontFamily: '"Georgia", "Cambria", serif',
    animationType: 'star-field',
    glowColor: 'rgba(212, 175, 55, 0.6)',
    previewColors: ['#d4af37', '#1a2035', '#0a0e1a'],
    defaultCustomization: {
      accentColor: '#d4af37',
      bgIntensity: 60,
      animationSpeed: 'slow',
      fontStyle: 'serif',
    },
  },

  // 3. TRON LEGACY
  {
    id: 'tron',
    name: 'Tron: Legacy',
    tagline: 'The game has changed.',
    year: '2010',
    palette: {
      background: '200 100% 3%',
      foreground: '192 100% 85%',
      card: '200 100% 5%',
      cardForeground: '192 100% 85%',
      primary: '192 100% 50%',
      primaryForeground: '200 100% 3%',
      secondary: '192 60% 12%',
      secondaryForeground: '192 100% 85%',
      muted: '200 60% 8%',
      mutedForeground: '192 40% 48%',
      accent: '192 100% 65%',
      accentForeground: '200 100% 3%',
      border: '192 80% 25%',
      ring: '192 100% 50%',
      sidebar: '200 100% 2%',
      sidebarForeground: '192 100% 85%',
    },
    buttonRadius: '0px',
    fontFamily: '"Arial Narrow", "Arial", sans-serif',
    animationType: 'tron-grid',
    glowColor: 'rgba(0, 240, 255, 0.7)',
    previewColors: ['#00f0ff', '#002a30', '#000d10'],
    defaultCustomization: {
      accentColor: '#00f0ff',
      bgIntensity: 65,
      animationSpeed: 'medium',
      fontStyle: 'sharp',
    },
  },

  // 4. BLADE RUNNER 2049
  {
    id: 'blade-runner',
    name: 'Blade Runner 2049',
    tagline: 'The key to the future is finally unearthed.',
    year: '2017',
    palette: {
      background: '20 30% 5%',
      foreground: '35 25% 80%',
      card: '20 25% 8%',
      cardForeground: '35 25% 80%',
      primary: '25 90% 55%',
      primaryForeground: '20 30% 5%',
      secondary: '185 40% 22%',
      secondaryForeground: '35 25% 80%',
      muted: '20 20% 11%',
      mutedForeground: '30 15% 48%',
      accent: '185 65% 45%',
      accentForeground: '20 30% 5%',
      border: '25 30% 22%',
      ring: '25 90% 55%',
      sidebar: '20 35% 4%',
      sidebarForeground: '35 25% 80%',
    },
    buttonRadius: '2px',
    fontFamily: '"Times New Roman", "Georgia", serif',
    animationType: 'dust-particles',
    glowColor: 'rgba(255, 140, 50, 0.5)',
    previewColors: ['#ff8c32', '#1a3035', '#0d0a05'],
    defaultCustomization: {
      accentColor: '#ff8c32',
      bgIntensity: 55,
      animationSpeed: 'slow',
      fontStyle: 'serif',
    },
  },

  // 5. INCEPTION
  {
    id: 'inception',
    name: 'Inception',
    tagline: 'Your mind is the scene of the crime.',
    year: '2010',
    palette: {
      background: '220 40% 6%',
      foreground: '215 30% 88%',
      card: '220 35% 9%',
      cardForeground: '215 30% 88%',
      primary: '215 70% 55%',
      primaryForeground: '220 40% 6%',
      secondary: '220 30% 18%',
      secondaryForeground: '215 30% 88%',
      muted: '220 25% 12%',
      mutedForeground: '215 15% 52%',
      accent: '200 60% 60%',
      accentForeground: '220 40% 6%',
      border: '215 25% 22%',
      ring: '215 70% 55%',
      sidebar: '220 45% 4%',
      sidebarForeground: '215 30% 88%',
    },
    buttonRadius: '8px',
    fontFamily: '"Trebuchet MS", "Gill Sans", sans-serif',
    animationType: 'geometric-spin',
    glowColor: 'rgba(80, 160, 255, 0.5)',
    previewColors: ['#5ba3ff', '#0d1a2e', '#060e1a'],
    defaultCustomization: {
      accentColor: '#5ba3ff',
      bgIntensity: 50,
      animationSpeed: 'slow',
      fontStyle: 'wide',
    },
  },
];

// â”€â”€â”€ CSS Variable Injection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function applyCinematicTheme(
  theme: CinematicTheme,
  customization: CinematicCustomization
) {
  const root = document.documentElement;

  // Mark cinematic mode
  root.setAttribute('data-cinematic', theme.id);

  const p = theme.palette;
  root.style.setProperty('--background', p.background);
  root.style.setProperty('--foreground', p.foreground);
  root.style.setProperty('--card', p.card);
  root.style.setProperty('--card-foreground', p.cardForeground);
  root.style.setProperty('--popover', p.card);
  root.style.setProperty('--popover-foreground', p.cardForeground);
  root.style.setProperty('--primary', p.primary);
  root.style.setProperty('--primary-foreground', p.primaryForeground);
  root.style.setProperty('--secondary', p.secondary);
  root.style.setProperty('--secondary-foreground', p.secondaryForeground);
  root.style.setProperty('--muted', p.muted);
  root.style.setProperty('--muted-foreground', p.mutedForeground);
  root.style.setProperty('--accent', p.accent);
  root.style.setProperty('--accent-foreground', p.accentForeground);
  root.style.setProperty('--border', p.border);
  root.style.setProperty('--input', p.border);
  root.style.setProperty('--ring', p.ring);
  root.style.setProperty('--sidebar-background', p.sidebar);
  root.style.setProperty('--sidebar-foreground', p.sidebarForeground);
  root.style.setProperty('--sidebar-primary', p.primary);
  root.style.setProperty('--sidebar-primary-foreground', p.primaryForeground);
  root.style.setProperty('--sidebar-border', p.border);
  root.style.setProperty('--sidebar-ring', p.ring);

  // Apply accent color override from customization
  if (customization.accentColor) {
    const hsl = hexToHslValues(customization.accentColor);
    if (hsl) {
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--ring', hsl);
      root.style.setProperty('--sidebar-primary', hsl);
    }
  }

  // Button radius
  root.style.setProperty('--radius', theme.buttonRadius);

  // Font family
  const fontStack = getFontStack(customization.fontStyle, theme.fontFamily);
  root.style.setProperty('--cinematic-font', fontStack);
  document.body.style.fontFamily = fontStack;

  // Intensity & speed as CSS custom props for canvas to read
  root.style.setProperty('--cinematic-intensity', String(customization.bgIntensity / 100));
  root.style.setProperty('--cinematic-speed', speedMultiplier(customization.animationSpeed));

  // Chart colors aligned with theme
  root.style.setProperty('--chart-1', p.primary);
  root.style.setProperty('--chart-2', p.accent);
  root.style.setProperty('--chart-3', p.secondary);
  root.style.setProperty('--chart-4', p.muted);
  root.style.setProperty('--chart-5', p.border);
}

export function removeCinematicTheme() {
  const root = document.documentElement;
  root.removeAttribute('data-cinematic');
  document.body.style.fontFamily = '';

  // Remove all inline overrides injected by applyCinematicTheme
  const props = [
    '--background', '--foreground', '--card', '--card-foreground',
    '--popover', '--popover-foreground', '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
    '--accent', '--accent-foreground', '--border', '--input', '--ring',
    '--radius', '--cinematic-font', '--cinematic-intensity', '--cinematic-speed',
    '--sidebar-background', '--sidebar-foreground', '--sidebar-primary',
    '--sidebar-primary-foreground', '--sidebar-border', '--sidebar-ring',
    '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
  ];
  props.forEach(p => root.style.removeProperty(p));
}

// â”€â”€â”€ Persistence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CINEMATIC_KEY = 'acadflow-cinematic-theme';

export interface CinematicState {
  themeId: string;
  customization: CinematicCustomization;
}

export function saveCinematicState(state: CinematicState) {
  localStorage.setItem(CINEMATIC_KEY, JSON.stringify(state));
}

export function loadCinematicState(): CinematicState | null {
  try {
    const raw = localStorage.getItem(CINEMATIC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCinematicState() {
  localStorage.removeItem(CINEMATIC_KEY);
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function hexToHslValues(hex: string): string | null {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function getFontStack(style: FontStyle, themeDefault: string): string {
  switch (style) {
    case 'mono': return '"Courier New", "Lucida Console", monospace';
    case 'serif': return '"Georgia", "Times New Roman", serif';
    case 'wide': return '"Trebuchet MS", "Arial", sans-serif';
    case 'sharp': return '"Arial Narrow", "Arial", sans-serif';
    default: return themeDefault;
  }
}

function speedMultiplier(speed: AnimationSpeed): string {
  switch (speed) {
    case 'slow': return '0.5';
    case 'fast': return '2.0';
    default: return '1.0';
  }
}


