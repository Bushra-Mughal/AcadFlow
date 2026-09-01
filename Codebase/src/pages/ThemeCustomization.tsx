import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Check, Palette, Clapperboard, Zap, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import {
  presetThemes,
  applyTheme,
  saveTheme,
  loadTheme,
  createCustomTheme,
  hslToHex,
  hexToHsl,
  type Theme,
  type ThemeColors,
} from '@/lib/theme';
import {
  cinematicThemes,
  type CinematicTheme,
  type AnimationSpeed,
  type FontStyle,
} from '@/lib/cinematicTheme';
import { useCinematic } from '@/contexts/CinematicContext';

// â”€â”€ Basic Tab (unchanged existing logic) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BasicTab() {
  const [currentTheme, setCurrentTheme] = useState<Theme>(presetThemes[0]);
  const [customColors, setCustomColors] = useState<ThemeColors>(presetThemes[0].colors);
  const [customName, setCustomName] = useState('My Custom Theme');
  const { deactivateCinematic, isCinematic } = useCinematic();

  useEffect(() => {
    const saved = loadTheme();
    if (saved) {
      setCurrentTheme(saved);
      if (!saved.isPreset) { setCustomColors(saved.colors); setCustomName(saved.name); }
    }
  }, []);

  function handlePresetSelect(theme: Theme) {
    if (isCinematic) deactivateCinematic();
    setCurrentTheme(theme);
    applyTheme(theme);
    saveTheme(theme);
    toast.success(`Applied "${theme.name}"`);
  }

  function handleCustomColorChange(key: keyof ThemeColors, hex: string) {
    setCustomColors(prev => ({ ...prev, [key]: hexToHsl(hex) }));
  }

  function handleApplyCustomTheme() {
    if (isCinematic) deactivateCinematic();
    const theme = createCustomTheme(customName, customColors);
    setCurrentTheme(theme);
    applyTheme(theme);
    saveTheme(theme);
    toast.success('Custom theme applied');
  }

  function handleReset() {
    if (isCinematic) deactivateCinematic();
    const t = presetThemes[0];
    setCurrentTheme(t);
    applyTheme(t);
    saveTheme(t);
    toast.success('Reset to default');
  }

  return (
    <div className="space-y-8">
      {/* Preset swatches */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Preset Themes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">One-click color palettes</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {presetThemes.map(theme => (
            <button
              key={theme.id}
              onClick={() => handlePresetSelect(theme)}
              className={`relative rounded-xl border p-4 text-left transition-all hover:border-primary/50 ${
                currentTheme.id === theme.id && !isCinematic
                  ? 'border-primary ring-1 ring-primary'
                  : 'border-border/60'
              }`}
            >
              {currentTheme.id === theme.id && !isCinematic && (
                <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              <p className="text-sm font-medium">{theme.name}</p>
              <p className="text-xs text-muted-foreground mb-3">{theme.description}</p>
              <div className="flex gap-1.5">
                {(['primary', 'accent', 'success', 'warning', 'info'] as (keyof ThemeColors)[]).map(k => (
                  <div key={k} className="h-6 flex-1 rounded" style={{ backgroundColor: `hsl(${theme.colors[k]})` }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      <Separator />

      {/* Custom color builder */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Custom Theme</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Build your own color palette</p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="theme-name" className="text-xs">Theme Name</Label>
            <Input id="theme-name" value={customName} onChange={e => setCustomName(e.target.value)} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {([
              { key: 'primary', label: 'Primary' },
              { key: 'accent', label: 'Accent' },
              { key: 'success', label: 'Success' },
              { key: 'warning', label: 'Warning' },
              { key: 'info', label: 'Info' },
            ] as { key: keyof ThemeColors; label: string }[]).map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={hslToHex(customColors[key])}
                    onChange={e => handleCustomColorChange(key, e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                  <Input value={customColors[key]} readOnly className="flex-1 text-xs font-mono" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleApplyCustomTheme} className="flex-1">Apply Custom Theme</Button>
            <Button variant="outline" onClick={handleReset} size="icon">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

// â”€â”€ Cinematic Theme Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CinematicCard({
  theme,
  isActive,
  onActivate,
}: {
  theme: CinematicTheme;
  isActive: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      onClick={onActivate}
      className={`relative w-full rounded-xl border text-left overflow-hidden transition-all hover:border-primary/60 group ${
        isActive ? 'border-primary ring-1 ring-primary' : 'border-border/60'
      }`}
    >
      {/* Preview strip */}
      <div
        className="h-16 w-full relative"
        style={{ background: `hsl(${theme.palette.background})` }}
      >
        {/* Animated color swatches */}
        <div className="absolute inset-x-0 bottom-0 flex h-8">
          {theme.previewColors.map((c, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: c, opacity: 0.9 }} />
          ))}
        </div>
        {/* Glow dot */}
        <div
          className="absolute top-3 right-3 h-3 w-3 rounded-full"
          style={{ backgroundColor: theme.previewColors[0], boxShadow: `0 0 8px ${theme.previewColors[0]}` }}
        />
        {isActive && (
          <div className="absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3 space-y-1" style={{ background: `hsl(${theme.palette.card})` }}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium" style={{ color: `hsl(${theme.palette.cardForeground})` }}>
            {theme.name}
          </p>
          <Badge variant="outline" className="text-xs shrink-0" style={{ color: theme.previewColors[0], borderColor: theme.previewColors[0] + '60' }}>
            {theme.year}
          </Badge>
        </div>
        <p className="text-xs line-clamp-1" style={{ color: `hsl(${theme.palette.mutedForeground})`, fontStyle: 'italic' }}>
          "{theme.tagline}"
        </p>
      </div>
    </button>
  );
}

// â”€â”€ Customization Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CustomizationPanel({ theme }: { theme: CinematicTheme }) {
  const { customization, updateCustomization } = useCinematic();
  if (!customization) return null;

  return (
    <div className="rounded-xl border border-border/60 p-4 space-y-5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        Customize â€” {theme.name}
      </p>

      {/* Accent color */}
      <div className="space-y-1.5">
        <Label className="text-xs">Accent Color</Label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={customization.accentColor}
            onChange={e => updateCustomization({ accentColor: e.target.value })}
            className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
          />
          <span className="text-xs font-mono text-muted-foreground">{customization.accentColor}</span>
        </div>
      </div>

      {/* Background intensity */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label className="text-xs">Background Intensity</Label>
          <span className="text-xs text-muted-foreground tabular-nums">{customization.bgIntensity}%</span>
        </div>
        <Slider
          value={[customization.bgIntensity]}
          onValueChange={([v]) => updateCustomization({ bgIntensity: v })}
          min={10}
          max={100}
          step={5}
          className="w-full"
        />
      </div>

      {/* Animation speed */}
      <div className="space-y-1.5">
        <Label className="text-xs">Animation Speed</Label>
        <Select
          value={customization.animationSpeed}
          onValueChange={(v) => updateCustomization({ animationSpeed: v as AnimationSpeed })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="slow">Slow</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="fast">Fast</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Font style */}
      <div className="space-y-1.5">
        <Label className="text-xs">Font Style Override</Label>
        <Select
          value={customization.fontStyle}
          onValueChange={(v) => updateCustomization({ fontStyle: v as FontStyle })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Theme Default</SelectItem>
            <SelectItem value="mono">Monospace</SelectItem>
            <SelectItem value="serif">Serif</SelectItem>
            <SelectItem value="wide">Wide / Sans</SelectItem>
            <SelectItem value="sharp">Sharp / Narrow</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={() => updateCustomization(theme.defaultCustomization)}
      >
        <RotateCcw className="h-3 w-3 mr-1.5" />
        Reset to theme defaults
      </Button>
    </div>
  );
}

// â”€â”€ Cinematic Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CinematicTab() {
  const { activeTheme, isCinematic, activateCinematic, deactivateCinematic } = useCinematic();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleActivate(theme: CinematicTheme) {
    if (activeTheme?.id === theme.id) {
      deactivateCinematic();
      setExpandedId(null);
      toast.success('Returned to Basic theme');
    } else {
      activateCinematic(theme);
      setExpandedId(theme.id);
      toast.success(`"${theme.name}" activated`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 flex items-start gap-3">
        <Zap className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <div>
          <p className="text-sm font-medium">Cinematic Themes</p>
          <p className="text-xs text-muted-foreground mt-0.5 text-pretty leading-relaxed">
            Movie-inspired immersive experiences. Each theme transforms the entire UI â€”
            colors, fonts, button shapes â€” and adds a living animated background.
          </p>
        </div>
      </div>

      {/* Theme cards grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {cinematicThemes.map(theme => (
          <div key={theme.id} className="space-y-2">
            <CinematicCard
              theme={theme}
              isActive={isCinematic && activeTheme?.id === theme.id}
              onActivate={() => handleActivate(theme)}
            />
            {/* Expand/collapse customization for active */}
            {isCinematic && activeTheme?.id === theme.id && (
              <button
                className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                onClick={() => setExpandedId(expandedId === theme.id ? null : theme.id)}
              >
                {expandedId === theme.id ? (
                  <><ChevronUp className="h-3 w-3" /> Hide customization</>
                ) : (
                  <><ChevronDown className="h-3 w-3" /> Customize</>
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Customization panel for active theme */}
      {isCinematic && activeTheme && expandedId === activeTheme.id && (
        <CustomizationPanel theme={activeTheme} />
      )}

      {/* Deactivate strip */}
      {isCinematic && (
        <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
          <div>
            <p className="text-sm font-medium">{activeTheme?.name} is active</p>
            <p className="text-xs text-muted-foreground">Return to your Basic theme settings</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { deactivateCinematic(); toast.success('Returned to Basic theme'); }}>
            Exit cinematic
          </Button>
        </div>
      )}
    </div>
  );
}

// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ThemeCustomization() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-balance">Theme</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Personalize your workspace â€” from subtle color tweaks to full cinematic immersion.
        </p>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="basic" className="gap-2">
            <Palette className="h-4 w-4" />
            Basic
          </TabsTrigger>
          <TabsTrigger value="cinematic" className="gap-2">
            <Clapperboard className="h-4 w-4" />
            Cinematic
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <BasicTab />
        </TabsContent>
        <TabsContent value="cinematic">
          <CinematicTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}



