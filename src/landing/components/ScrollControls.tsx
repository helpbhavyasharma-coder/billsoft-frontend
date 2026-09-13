import React, { useState, useEffect } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { scrollToTarget } from '../lib/smoothScroll';

export const ScrollControls: React.FC = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { scrollYProgress, scrollY } = useScroll();

  // Spring-smoothed scroll progress
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    return scrollY.on('change', (latest) => {
      setShowScrollTop(latest > 320);
    });
  }, [scrollY]);

  const handleScrollToTop = () => {
    scrollToTarget(0, 0);
  };

  return (
    <>
      {/* Top Scroll Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 h-[2.5px] z-60 bg-transparent pointer-events-none">
        <motion.div
          style={{ scaleX }}
          className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-400 dark:from-emerald-500 dark:via-emerald-400 dark:to-teal-300 origin-left"
        />
      </div>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleScrollToTop}
          className="fixed bottom-5 right-5 z-40 p-2.5 rounded-full bg-slate-900/90 dark:bg-slate-800/90 text-white hover:bg-emerald-600 dark:hover:bg-emerald-600 shadow-lg border border-slate-700/80 backdrop-blur-xs transition-colors cursor-pointer flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <ArrowUp className="w-4 h-4" />
        </motion.button>
      )}
    </>
  );
};
