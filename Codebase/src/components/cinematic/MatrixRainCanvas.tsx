import { useEffect, useRef } from 'react';

interface Props {
  intensity: number;      // 0-100
  speedMult: number;      // 0.5 / 1.0 / 2.0
  accentColor: string;    // hex
}

export function MatrixRainCanvas({ intensity, speedMult, accentColor }: Props) {
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

    const fontSize = 14;
    const cols = Math.floor(window.innerWidth / fontSize);
    const drops: number[] = Array(cols).fill(1);
    const chars = 'ã‚¢ã‚¤ã‚¦ã‚¨ã‚ªã‚«ã‚­ã‚¯ã‚±ã‚³ã‚µã‚·ã‚¹ã‚»ã‚½ã‚¿ãƒãƒ„ãƒ†ãƒˆãƒŠãƒ‹ãƒŒãƒãƒŽ0123456789ABCDEFGHIJKLMNOP<>{}[]|/\\'.split('');

    const density = Math.max(0.1, intensity / 100);
    const interval = Math.max(16, 60 / speedMult);

    let animId: number;
    let lastTime = 0;

    const draw = (time: number) => {
      animId = requestAnimationFrame(draw);
      if (time - lastTime < interval) return;
      lastTime = time;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = accentColor;
      ctx.font = `${fontSize}px "Courier New", monospace`;

      for (let i = 0; i < drops.length; i++) {
        if (Math.random() > density) continue;
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.globalAlpha = 0.1 + Math.random() * 0.7;
        ctx.fillStyle = i % 8 === 0 ? '#ffffff' : accentColor;
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
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


