export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  success: string;
  warning: string;
  info: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  isPreset: boolean;
}

export const presetThemes: Theme[] = [
  {
    id: 'default',
    name: 'Modern Purple',
    description: 'Vibrant blue-purple with warm accents',
    isPreset: true,
    colors: {
      primary: '250 85% 60%',
      primaryForeground: '0 0% 100%',
      accent: '280 70% 60%',
      accentForeground: '0 0% 100%',
      success: '142 76% 45%',
      warning: '38 92% 55%',
      info: '199 89% 52%',
    },
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'Calm and focused deep ocean tones',
    isPreset: true,
    colors: {
      primary: '210 90% 55%',
      primaryForeground: '0 0% 100%',
      accent: '195 85% 50%',
      accentForeground: '0 0% 100%',
      success: '160 75% 42%',
      warning: '40 95% 52%',
      info: '205 90% 55%',
    },
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Natural and refreshing earth tones',
    isPreset: true,
    colors: {
      primary: '145 70% 45%',
      primaryForeground: '0 0% 100%',
      accent: '85 60% 50%',
      accentForeground: '0 0% 100%',
      success: '140 75% 40%',
      warning: '45 95% 50%',
      info: '180 70% 45%',
    },
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    description: 'Warm and energetic sunset colors',
    isPreset: true,
    colors: {
      primary: '25 95% 55%',
      primaryForeground: '0 0% 100%',
      accent: '340 85% 60%',
      accentForeground: '0 0% 100%',
      success: '140 70% 45%',
      warning: '35 95% 55%',
      info: '200 85% 50%',
    },
  },
];

export function applyTheme(theme: Theme, _mode: 'light' | 'dark' = 'light') {
  const root = document.documentElement;
  
  // Apply primary colors
  root.style.setProperty('--primary', theme.colors.primary);
  root.style.setProperty('--primary-foreground', theme.colors.primaryForeground);
  root.style.setProperty('--accent', theme.colors.accent);
  root.style.setProperty('--accent-foreground', theme.colors.accentForeground);
  
  // Apply status colors
  root.style.setProperty('--success', theme.colors.success);
  root.style.setProperty('--warning', theme.colors.warning);
  root.style.setProperty('--info', theme.colors.info);
  
  // Apply chart colors
  root.style.setProperty('--chart-1', theme.colors.primary);
  root.style.setProperty('--chart-2', theme.colors.accent);
  root.style.setProperty('--chart-3', theme.colors.success);
  root.style.setProperty('--chart-4', theme.colors.warning);
  root.style.setProperty('--chart-5', theme.colors.info);
  
  // Apply sidebar colors
  root.style.setProperty('--sidebar-primary', theme.colors.primary);
  root.style.setProperty('--sidebar-ring', theme.colors.primary);
  root.style.setProperty('--ring', theme.colors.primary);
  
  // Apply AI accent
  root.style.setProperty('--ai-accent', theme.colors.accent);
}

export function saveTheme(theme: Theme) {
  localStorage.setItem('acadflow-theme', JSON.stringify(theme));
}

export function loadTheme(): Theme | null {
  const saved = localStorage.getItem('acadflow-theme');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

export function createCustomTheme(name: string, colors: ThemeColors): Theme {
  return {
    id: `custom-${Date.now()}`,
    name,
    description: 'Custom theme',
    isPreset: false,
    colors,
  };
}

export function hslToHex(hsl: string): string {
  const [h, s, l] = hsl.split(' ').map(v => parseFloat(v));
  const sDecimal = s / 100;
  const lDecimal = l / 100;

  const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lDecimal - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

export function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}


