import React, { useEffect, useState, useRef } from 'react';

interface AnimatedCurrencyProps {
  value: number;
  className?: string;
  maximumFractionDigits?: number;
}

const easeOutQuart = (x: number): number => {
  return 1 - Math.pow(1 - x, 4);
};

export const AnimatedCurrency: React.FC<AnimatedCurrencyProps> = ({ 
  value, 
  className = "",
  maximumFractionDigits = 2
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const startTime = useRef<number | null>(null);
  const startValue = useRef<number>(value);
  const animationFrame = useRef<number | null>(null);

  useEffect(() => {
    // If the difference is tiny, just snap to it to avoid unnecessary animation
    if (Math.abs(value - displayValue) < 0.01) {
      setDisplayValue(value);
      return;
    }

    startValue.current = displayValue;
    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = timestamp - startTime.current;
      const duration = 800; // 0.8 seconds

      if (progress < duration) {
        const timeRatio = progress / duration;
        const ease = easeOutQuart(timeRatio);
        
        const current = startValue.current + (value - startValue.current) * ease;
        setDisplayValue(current);
        animationFrame.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [value]);

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits
  }).format(displayValue);

  return <span className={className}>{formatted}</span>;
};
