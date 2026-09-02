import { useEffect, useRef } from 'react';

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  alpha: number;
  alphaDir: number;
}

/**
 * Minimal animated background for auth pages.
 * Soft, slowly drifting gradient orbs - no harsh colors, no distracting motion.
 * Adapts to light / dark mode via opacity only (no hardcoded colors).
 */
export function LoginBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    const orbs: Orb[] = [];

    function resize() {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    function initOrbs() {
      orbs.length = 0;
      const count = Math.min(6, Math.floor((width * height) / 120000) + 4);
      for (let i = 0; i < count; i++) {
        orbs.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          radius: 180 + Math.random() * 260,
          // Indigo / violet / cyan palette matching app theme
          hue: [245, 260, 275, 190, 220][i % 5],
          alpha: 0.04 + Math.random() * 0.06,
          alphaDir: Math.random() > 0.5 ? 1 : -1,
        });
      }
    }

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, width, height);

      for (const orb of orbs) {
        // Drift
        orb.x += orb.vx;
        orb.y += orb.vy;

        // Soft bounce at edges
        if (orb.x < -orb.radius) orb.x = width + orb.radius;
        if (orb.x > width + orb.radius) orb.x = -orb.radius;
        if (orb.y < -orb.radius) orb.y = height + orb.radius;
        if (orb.y > height + orb.radius) orb.y = -orb.radius;

        // Breathe alpha
        orb.alpha += orb.alphaDir * 0.0003;
        if (orb.alpha > 0.10) orb.alphaDir = -1;
        if (orb.alpha < 0.02) orb.alphaDir = 1;

        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        grad.addColorStop(0, `hsla(${orb.hue}, 70%, 60%, ${orb.alpha})`);
        grad.addColorStop(1, `hsla(${orb.hue}, 70%, 60%, 0)`);

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    initOrbs();
    draw();

    const ro = new ResizeObserver(() => {
      resize();
      initOrbs();
    });
    ro.observe(document.documentElement);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}


