import { type CinematicTheme, type CinematicCustomization } from '@/lib/cinematicTheme';
import { MatrixRainCanvas } from './MatrixRainCanvas';
import { StarFieldCanvas } from './StarFieldCanvas';
import { TronGridCanvas } from './TronGridCanvas';
import { DustParticlesCanvas } from './DustParticlesCanvas';
import { GeometricSpinCanvas } from './GeometricSpinCanvas';

interface Props {
  theme: CinematicTheme;
  customization: CinematicCustomization;
}

function speedToMult(speed: string): number {
  if (speed === 'slow') return 0.5;
  if (speed === 'fast') return 2.0;
  return 1.0;
}

export function CinematicBackground({ theme, customization }: Props) {
  const mult = speedToMult(customization.animationSpeed);
  const accent = customization.accentColor || theme.previewColors[0];
  const intensity = customization.bgIntensity;

  const props = { intensity, speedMult: mult, accentColor: accent };

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
      {theme.animationType === 'matrix-rain' && <MatrixRainCanvas {...props} />}
      {theme.animationType === 'star-field' && <StarFieldCanvas {...props} />}
      {theme.animationType === 'tron-grid' && <TronGridCanvas {...props} />}
      {theme.animationType === 'dust-particles' && <DustParticlesCanvas {...props} />}
      {theme.animationType === 'geometric-spin' && <GeometricSpinCanvas {...props} />}
    </div>
  );
}


