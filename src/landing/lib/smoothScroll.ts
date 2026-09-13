import Lenis from 'lenis';

let lenisInstance: Lenis | null = null;

export function initSmoothScroll(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Clean up any existing instance
  if (lenisInstance) {
    lenisInstance.destroy();
    lenisInstance = null;
  }

  const lenis = new Lenis({
    duration: 1.25, // Silky smooth deceleration time
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential out ease
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.5,
    infinite: false,
  });

  lenisInstance = lenis;

  // Make lenis globally accessible if needed
  (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

  let rafId: number;
  function raf(time: number) {
    lenis.raf(time);
    rafId = requestAnimationFrame(raf);
  }

  rafId = requestAnimationFrame(raf);

  return () => {
    cancelAnimationFrame(rafId);
    lenis.destroy();
    if (lenisInstance === lenis) {
      lenisInstance = null;
    }
  };
}

export function getLenis(): Lenis | null {
  return lenisInstance;
}

export function scrollToTarget(target: string | HTMLElement | number, offset = -60): void {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, {
      offset,
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    });
  } else if (typeof window !== 'undefined') {
    if (typeof target === 'string') {
      const el = document.querySelector(target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: 'smooth' });
    } else if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
