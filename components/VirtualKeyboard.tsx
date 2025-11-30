import React from 'react';
import { KeyStats } from '../types';

interface VirtualKeyboardProps {
  activeKey: string | null;
  keyStats: Record<string, KeyStats>;
}

const ROWS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
  ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['CapsLock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
  ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
  [' ']
];

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ activeKey, keyStats }) => {
  
  const getKeyColor = (keyLabel: string) => {
    const lowerKey = keyLabel.toLowerCase();
    const stats = keyStats[lowerKey];
    
    // Base styles
    let base = "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 border-b-4 border-slate-300 dark:border-slate-900";
    
    // Active Key Highlighting
    if (activeKey && keyLabel.toLowerCase() === activeKey.toLowerCase()) {
      return "bg-neon-blue text-black border-b-4 border-blue-700 scale-95 shadow-[0_0_15px_rgba(0,243,255,0.7)]";
    }

    // Heatmap Logic (Red for high errors)
    if (stats && stats.total > 0) {
      const errorRate = stats.errors / stats.total;
      if (errorRate > 0.2) return "bg-red-400 dark:bg-red-900 border-red-700";
      if (errorRate > 0.1) return "bg-orange-300 dark:bg-orange-800 border-orange-600";
    }

    return base;
  };

  const getKeyWidth = (key: string) => {
    switch (key) {
      case 'Backspace': return 'w-24';
      case 'Tab': return 'w-20';
      case 'CapsLock': return 'w-24';
      case 'Enter': return 'w-24';
      case 'Shift': return 'w-28';
      case ' ': return 'w-96';
      default: return 'w-10 sm:w-12';
    }
  };

  return (
    <div className="hidden lg:flex flex-col gap-2 p-6 bg-slate-200 dark:bg-slate-800 rounded-xl shadow-inner select-none transition-colors duration-300">
      {ROWS.map((row, rIndex) => (
        <div key={rIndex} className="flex justify-center gap-2">
          {row.map((keyLabel, kIndex) => (
            <div
              key={`${rIndex}-${kIndex}`}
              className={`
                ${getKeyWidth(keyLabel)} h-12 flex items-center justify-center rounded-lg font-mono text-sm font-bold shadow-sm transition-all duration-100
                ${getKeyColor(keyLabel)}
              `}
            >
              {keyLabel === ' ' ? '' : keyLabel}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default VirtualKeyboard;