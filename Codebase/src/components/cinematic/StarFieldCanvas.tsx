import { useEffect, useRef } from 'react';

interface Props {
  intensity: number;
  speedMult: number;
  accentColor: string;
}

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  opacity: number;
  twinkle: number;
}

export function StarFieldCanvas({ intensity, speedMult, accentColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const count = Math.floor(200 * (intensity / 100));
    let stars: Star[] = [];

    function initStars() {
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas!.width,
        y: Math.random() * canvas!.height,
        z: Math.random(),
        size: 0.5 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.7,
        twinkle: Math.random() * Math.PI * 2,
      }));
    }

    resize();
    window.addEventListener('resize', resize);

    // Wormhole glow params
    const cx = canvas.width * 0.72;
    const cy = canvas.height * 0.45;

    let animId: number;
    let t = 0;

    const draw = () => {
      animId = requestAnimationFrame(draw);
      t += 0.003 * speedMult;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Wormhole ring glow
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 140);
      grad.addColorStop(0, `${accentColor}33`);
      grad.addColorStop(0.4, `${accentColor}18`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 140, 0, Math.PI * 2);
      ctx.fill();

      // Stars
      stars.forEach(star => {
        star.twinkle += 0.02 * speedMult;
        const twinkleAlpha = star.opacity * (0.6 + 0.4 * Math.sin(star.twinkle));
        ctx.globalAlpha = twinkleAlpha;
        ctx.fillStyle = star.z > 0.8 ? '#ffffff' : accentColor;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * star.z, 0, Math.PI * 2);
        ctx.fill();

        // Slow drift
        star.y += 0.05 * star.z * speedMult;
        if (star.y > canvas.height) { star.y = 0; star.x = Math.random() * canvas.width; }
      });

      // Shooting stars occasionally
      if (Math.random() < 0.003 * intensity / 100) {
        const sx = Math.random() * canvas.width;
        const sy = Math.random() * canvas.height * 0.5;
        const len = 80 + Math.random() * 120;
        const grad2 = ctx.createLinearGradient(sx, sy, sx + len, sy + len * 0.3);
        grad2.addColorStop(0, 'white');
        grad2.addColorStop(1, 'transparent');
        ctx.strokeStyle = grad2;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + len, sy + len * 0.3);
        ctx.stroke();
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
      style={{ opacity: 0.9 }}
    />
  );
}


