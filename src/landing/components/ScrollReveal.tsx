import React from 'react';
import { motion } from 'motion/react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  direction = 'up'
}) => {
  const getInitialOffset = () => {
    switch (direction) {
      case 'up':
        return { y: 24, x: 0 };
      case 'down':
        return { y: -24, x: 0 };
      case 'left':
        return { x: 24, y: 0 };
      case 'right':
        return { x: -24, y: 0 };
      case 'none':
      default:
        return { x: 0, y: 0 };
    }
  };

  const offset = getInitialOffset();

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.55,
        delay,
        ease: [0.22, 1, 0.36, 1] // Custom cubic-bezier for ultra-smooth fluid motion
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
