import { useEffect, useRef } from 'react';

interface Props {
  intensity: number;
  speedMult: number;
  accentColor: string;
}

interface Shape {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  sides: number;
  opacity: number;
  depth: number;
}

export function GeometricSpinCanvas({ intensity, speedMult, accentColor }: Props) {
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

    const count = Math.floor(15 * (intensity / 100));
    const shapes: Shape[] = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: 20 + Math.random() * 80,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.005 * speedMult,
      sides: [3, 4, 5, 6, 8][Math.floor(Math.random() * 5)],
      opacity: 0.04 + Math.random() * 0.12,
      depth: Math.random(),
    }));

    let animId: number;

    function drawPolygon(x: number, y: number, sides: number, size: number, rotation: number) {
      ctx!.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = rotation + (i * 2 * Math.PI) / sides;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        if (i === 0) ctx!.moveTo(px, py);
        else ctx!.lineTo(px, py);
      }
      ctx!.closePath();
    }

    const draw = () => {
      animId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      shapes.forEach(s => {
        s.rotation += s.rotSpeed * speedMult;

        // Slow drift
        s.x += 0.08 * s.depth * speedMult;
        s.y += 0.04 * s.depth * speedMult;
        if (s.x > canvas.width + s.size) s.x = -s.size;
        if (s.y > canvas.height + s.size) s.y = -s.size;

        ctx.globalAlpha = s.opacity;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1;
        drawPolygon(s.x, s.y, s.sides, s.size, s.rotation);
        ctx.stroke();

        // Inner nested polygon
        ctx.globalAlpha = s.opacity * 0.5;
        drawPolygon(s.x, s.y, s.sides, s.size * 0.6, s.rotation + Math.PI / s.sides);
        ctx.stroke();
      });

      // Layered glow at vanishing point
      const gx = canvas.width * 0.5;
      const gy = canvas.height * 0.5;
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, 300);
      glow.addColorStop(0, `${accentColor}12`);
      glow.addColorStop(1, 'transparent');
      ctx.globalAlpha = 1;
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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


