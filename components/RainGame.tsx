import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WordEntity } from '../types';
import { generateGameWords } from '../services/geminiService';

interface RainGameProps {
  onGameEnd: (score: number) => void;
}

const RainGame: React.FC<RainGameProps> = ({ onGameEnd }) => {
  const [words, setWords] = useState<WordEntity[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  
  const requestRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSpawnTime = useRef<number>(0);
  const spawnRate = useRef<number>(2000); // ms

  // Load initial words
  useEffect(() => {
    const loadWords = async () => {
      setLoading(true);
      // Pre-fetch a batch
      setLoading(false);
    };
    loadWords();
  }, []);

  const spawnWord = async () => {
    const newWords = await generateGameWords(1);
    const wordText = newWords[0] || "code";
    
    setWords(prev => [
      ...prev,
      {
        id: Date.now(),
        text: wordText,
        x: Math.random() * 80 + 5, // 5% to 85% width
        y: -10, // Start above
        speed: 0.2 + (level * 0.05),
        typed: ''
      }
    ]);
  };

  const updateGame = useCallback((time: number) => {
    if (lives <= 0) return;

    if (time - lastSpawnTime.current > spawnRate.current) {
      spawnWord();
      lastSpawnTime.current = time;
      // Increase difficulty slightly over time
      if (spawnRate.current > 800) spawnRate.current -= 10;
    }

    setWords(prevWords => {
      const nextWords: WordEntity[] = [];
      let livesLost = 0;

      prevWords.forEach(word => {
        const nextY = word.y + word.speed;
        if (nextY > 100) {
          livesLost++;
        } else {
          nextWords.push({ ...word, y: nextY });
        }
      });

      if (livesLost > 0) {
        setLives(l => {
            const newLives = l - livesLost;
            if (newLives <= 0) onGameEnd(score);
            return newLives;
        });
      }
      return nextWords;
    });

    requestRef.current = requestAnimationFrame(updateGame);
  }, [lives, level, score, onGameEnd]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateGame);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [updateGame]);

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lives <= 0) return;
      
      const char = e.key;
      
      // Ignore special keys
      if (char.length > 1 && char !== 'Backspace') return;

      if (char === 'Backspace') {
          setCurrentInput(prev => prev.slice(0, -1));
          return;
      }

      // Check against active words
      setWords(prevWords => {
        // Find if we are currently targeting a word (partially typed)
        const targetIndex = prevWords.findIndex(w => w.text.startsWith(currentInput + char));
        
        if (targetIndex !== -1) {
          const targetWord = prevWords[targetIndex];
          const newTyped = currentInput + char;
          
          if (newTyped === targetWord.text) {
            // Word completed!
            setScore(s => s + targetWord.text.length * 10);
            setCurrentInput('');
            if (score > 0 && score % 100 === 0) setLevel(l => l + 1);
            return prevWords.filter((_, i) => i !== targetIndex);
          } else {
            // Correct letter, update input state
            setCurrentInput(newTyped);
            return prevWords; // Visual update handled by rendering
          }
        }
        
        // Mistake - Reset input or flash screen (optional)
        setCurrentInput(''); 
        return prevWords;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lives, currentInput, score]);

  if (lives <= 0) return null; // Logic handled by parent onGameEnd

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[500px] bg-slate-900 overflow-hidden rounded-xl border-2 border-neon-blue shadow-[0_0_20px_rgba(0,243,255,0.2)]"
    >
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-20 flex gap-6 text-white font-mono text-lg font-bold">
        <div className="text-neon-green">Score: {score}</div>
        <div className="text-neon-pink">Lives: {'♥'.repeat(lives)}</div>
        <div className="text-neon-purple">Level: {level}</div>
      </div>

      {/* Words */}
      {words.map(word => {
        // Highlighting partial match
        const isTarget = word.text.startsWith(currentInput) && currentInput.length > 0;
        const matchedPart = isTarget ? currentInput : '';
        const remainingPart = isTarget ? word.text.slice(currentInput.length) : word.text;

        return (
          <div
            key={word.id}
            className="absolute transform -translate-x-1/2 text-xl font-mono font-bold transition-all duration-75"
            style={{ 
              left: `${word.x}%`, 
              top: `${word.y}%`,
              color: isTarget ? '#fff' : '#00f3ff',
              textShadow: isTarget ? '0 0 10px #ff00ff' : 'none'
            }}
          >
            <span className="text-neon-pink">{matchedPart}</span>
            <span className="text-slate-300">{remainingPart}</span>
          </div>
        );
      })}

      {/* Input Display (Optional visual guide) */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white opacity-50 font-mono">
        {currentInput}
      </div>
    </div>
  );
};

export default RainGame;