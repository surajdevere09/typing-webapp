import React, { useRef, useEffect } from 'react';

interface TypingAreaProps {
  fullText: string;
  userInput: string;
  isFocused: boolean;
  onBlur: () => void;
  onFocus: () => void;
}

const TypingArea: React.FC<TypingAreaProps> = ({ fullText, userInput, isFocused, onBlur, onFocus }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  // Auto-scroll to cursor
  useEffect(() => {
    if (cursorRef.current && containerRef.current) {
      const cursorTop = cursorRef.current.offsetTop;
      const containerHeight = containerRef.current.clientHeight;
      const scrollTop = containerRef.current.scrollTop;

      if (cursorTop > scrollTop + containerHeight - 60) {
        containerRef.current.scrollTo({ top: cursorTop - containerHeight / 2, behavior: 'smooth' });
      }
    }
  }, [userInput]);

  return (
    <div 
      ref={containerRef}
      className={`
        relative w-full max-w-4xl h-64 overflow-y-auto p-8 rounded-2xl 
        font-mono text-2xl leading-relaxed tracking-wide shadow-2xl transition-all duration-300
        ${isFocused 
          ? 'bg-white dark:bg-dark-surface ring-2 ring-neon-purple' 
          : 'bg-gray-100 dark:bg-slate-900 opacity-70 blur-[1px]'}
      `}
      onClick={onFocus}
    >
      {!isFocused && (
        <div className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer">
          <span className="text-xl font-bold text-slate-500">Click to focus</span>
        </div>
      )}

      <div className="whitespace-pre-wrap break-words text-slate-400 dark:text-slate-600">
        {fullText.split('').map((char, index) => {
          let colorClass = '';
          let isCurrent = index === userInput.length;
          let isCursor = isCurrent && isFocused;

          if (index < userInput.length) {
            const userChar = userInput[index];
            colorClass = userChar === char 
              ? 'text-slate-800 dark:text-slate-100' 
              : 'text-red-500 bg-red-100 dark:bg-red-900/30';
          }

          return (
            <span 
              key={index} 
              ref={isCurrent ? cursorRef : null}
              className={`relative ${colorClass}`}
            >
              {isCursor && (
                <span className="absolute -left-[1px] top-0 bottom-0 w-[2px] bg-neon-pink typing-cursor animate-pulse"></span>
              )}
              {char}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default TypingArea;