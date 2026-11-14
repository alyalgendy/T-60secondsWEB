import { useEffect, useRef, useState } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  layer: number;
}

function createStars(): Star[] {
  return Array.from({ length: 150 }, (_, index) => {
    const seed = index + 1;
    const randomX = Math.abs(Math.sin(seed * 127.1) * 43758.5453) % 1;
    const randomY = Math.abs(Math.sin(seed * 311.7) * 24634.6345) % 1;
    const layer = index % 3;
    return {
      x: randomX,
      y: randomY,
      radius: 0.45 + layer * 0.38 + randomX * 0.4,
      alpha: 0.32 + randomY * 0.62,
      layer,
    };
  });
}

const STARS = createStars();

export default function StarfieldCanvas({
  className,
}: {
  className: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const draw = (timestamp: number) => {
      context.clearRect(0, 0, width, height);
      for (const star of STARS) {
        const depth = star.layer + 1;
        const drift = reducedMotion ? 0 : timestamp * depth * 0.003;
        const y = (star.y * height + drift) % height;
        const x =
          star.x * width +
          (reducedMotion ? 0 : Math.sin(timestamp * 0.00015 + star.y) * depth * 4);
        context.beginPath();
        context.arc(x, y, star.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(218, 241, 255, ${star.alpha})`;
        context.fill();
      }
      if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    };

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw(0);
    };

    resize();
    window.addEventListener('resize', resize);
    if (!reducedMotion) frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
