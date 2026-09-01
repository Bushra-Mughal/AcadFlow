import { useEffect, useRef } from 'react';

interface Props {
  intensity: number;
  speedMult: number;
  accentColor: string;
}

export function TronGridCanvas({ intensity, speedMult, accentColor }: Props) {
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

    const cell = 60;
    const alpha = 0.08 + (intensity / 100) * 0.22;

    // Pulses
    interface Pulse {
      col: number;
      row: number;
      progress: number;
      horizontal: boolean;
    }

    const pulses: Pulse[] = [];
    let t = 0;
    let animId: number;

    function spawnPulse() {
      const cols = Math.ceil(canvas!.width / cell);
      const rows = Math.ceil(canvas!.height / cell);
      pulses.push({
        col: Math.floor(Math.random() * cols),
        row: Math.floor(Math.random() * rows),
        progress: 0,
        horizontal: Math.random() > 0.5,
      });
    }

    const draw = () => {
      animId = requestAnimationFrame(draw);
      t += 0.01 * speedMult;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cols = Math.ceil(canvas!.width / cell);
      const rows = Math.ceil(canvas!.height / cell);

      // Perspective grid
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 0.5;

      // Horizontal lines with perspective
      for (let r = 0; r <= rows; r++) {
        const y = r * cell;
        const depthAlpha = alpha * (0.3 + 0.7 * (r / rows));
        ctx.globalAlpha = depthAlpha;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Vertical lines
      for (let c = 0; c <= cols; c++) {
        const x = c * cell;
        ctx.globalAlpha = alpha * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Grid nodes glow
      ctx.globalAlpha = alpha * 1.5;
      ctx.fillStyle = accentColor;
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          if ((r + c) % 4 === 0) {
            ctx.beginPath();
            ctx.arc(c * cell, r * cell, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Spawn pulses
      if (Math.random() < 0.04 * speedMult && pulses.length < 12) spawnPulse();

      // Draw pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.progress += 0.04 * speedMult;
        if (p.progress > 1) { pulses.splice(i, 1); continue; }

        const pulseAlpha = (1 - p.progress) * 0.9;
        ctx.globalAlpha = pulseAlpha;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        if (p.horizontal) {
          const y = p.row * cell;
          const x0 = p.col * cell;
          const len = p.progress * canvas.width * 0.4;
          ctx.beginPath();
          ctx.moveTo(x0, y);
          ctx.lineTo(x0 + len, y);
          ctx.stroke();
        } else {
          const x = p.col * cell;
          const y0 = p.row * cell;
          const len = p.progress * canvas.height * 0.4;
          ctx.beginPath();
          ctx.moveTo(x, y0);
          ctx.lineTo(x, y0 + len);
          ctx.stroke();
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
      style={{ opacity: 0.85 }}
    />
  );
}


