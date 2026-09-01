import { useEffect, useRef } from 'react';

interface Props {
  intensity: number;
  speedMult: number;
  accentColor: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export function DustParticlesCanvas({ intensity, speedMult, accentColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const maxParticles = Math.floor(120 * (intensity / 100));
    const particles: Particle[] = [];

    function spawnParticle(): Particle {
      return {
        x: Math.random() * canvas!.width,
        y: canvas!.height + 10,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(0.3 + Math.random() * 1.2) * speedMult,
        size: 1 + Math.random() * 3,
        opacity: 0.1 + Math.random() * 0.5,
        life: 0,
        maxLife: 200 + Math.random() * 300,
      };
    }

    // Seed some particles
    for (let i = 0; i < maxParticles / 2; i++) {
      const p = spawnParticle();
      p.y = Math.random() * canvas.height;
      particles.push(p);
    }

    let animId: number;

    const draw = () => {
      animId = requestAnimationFrame(draw);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Ambient haze gradient
      const hazGrad = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
      hazGrad.addColorStop(0, 'transparent');
      hazGrad.addColorStop(1, `${accentColor}08`);
      ctx.fillStyle = hazGrad;
      ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);

      // Spawn
      if (particles.length < maxParticles && Math.random() < 0.3) {
        particles.push(spawnParticle());
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        // Turbulence
        p.vx += (Math.random() - 0.5) * 0.05;
        p.vx *= 0.99;

        const lifeRatio = p.life / p.maxLife;
        const fadeAlpha = lifeRatio < 0.1
          ? lifeRatio * 10 * p.opacity
          : lifeRatio > 0.8
            ? (1 - lifeRatio) * 5 * p.opacity
            : p.opacity;

        if (p.life > p.maxLife || p.y < -10) {
          particles.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = Math.max(0, fadeAlpha);
        ctx.fillStyle = Math.random() > 0.8 ? '#ffffff' : accentColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Glow on large particles
        if (p.size > 2.5) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
          g.addColorStop(0, `${accentColor}30`);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [intensity, speedMult, accentColor]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.8 }}
    />
  );
}


