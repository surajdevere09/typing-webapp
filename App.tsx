import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameMode, KeyStats, LessonConfig, Theme, TypingSessionStats } from './types';
import TypingArea from './components/TypingArea';
import VirtualKeyboard from './components/VirtualKeyboard';
import RainGame from './components/RainGame';
import { generateLessonContent, generateTypingAdvice } from './services/geminiService';
import { 
  ChartBarIcon, 
  ComputerDesktopIcon, 
  SparklesIcon, 
  BoltIcon, 
  SunIcon, 
  MoonIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/solid';

const DEFAULT_TEXT = "Welcome to TypeNeon. Start typing to begin your journey. Speed and accuracy will follow practice.";

const App = () => {
  // --- State ---
  const [theme, setTheme] = useState<Theme>('dark');
  const [mode, setMode] = useState<GameMode>(GameMode.LESSON);
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [userInput, setUserInput] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [keyStats, setKeyStats] = useState<Record<string, KeyStats>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [lastGameScore, setLastGameScore] = useState<number>(0);
  
  // --- Derived Stats ---
  const currentStats = useMemo<TypingSessionStats>(() => {
    const charsTyped = userInput.length;
    const errors = userInput.split('').reduce((acc, char, idx) => {
      return char !== text[idx] ? acc + 1 : acc;
    }, 0);
    
    let timeElapsed = 0;
    if (startTime) {
      timeElapsed = (isFinished ? Date.now() : Date.now()) - startTime; // Rough estimate for live view
      if(isFinished) timeElapsed = Date.now() - startTime; // Fix later with actual end timestamp
    }
    
    // Avoid division by zero
    const minutes = Math.max((Date.now() - (startTime || Date.now())) / 60000, 0.001);
    const wpm = Math.round((charsTyped / 5) / minutes);
    const accuracy = charsTyped > 0 ? Math.round(((charsTyped - errors) / charsTyped) * 100) : 100;

    return { wpm, accuracy, timeElapsed: minutes * 60, mistakes: errors, charsTyped };
  }, [userInput, startTime, isFinished, text]);

  // --- Effects ---
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // --- Handlers ---

  const handleModeChange = async (newMode: GameMode) => {
    setMode(newMode);
    resetSession();
    
    if (newMode === GameMode.ZEN) {
      setLoading(true);
      const newText = await generateLessonContent([], 'Intermediate', 'Philosophy and Nature');
      setText(newText);
      setLoading(false);
    } else if (newMode === GameMode.LESSON) {
      setText(DEFAULT_TEXT);
    }
  };

  const resetSession = () => {
    setUserInput('');
    setStartTime(null);
    setIsFinished(false);
    setAiAdvice('');
  };

  const handleLessonGenerate = async (difficulty: string) => {
    setLoading(true);
    // Find weak keys (error rate > 10%)
    const weakKeys = Object.values(keyStats)
      .filter((k: KeyStats) => (k.errors / k.total) > 0.1 && k.total > 5)
      .map((k: KeyStats) => k.char);
      
    const newText = await generateLessonContent(weakKeys, difficulty, 'Science Fiction');
    setText(newText);
    resetSession();
    setLoading(false);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (mode === GameMode.GAME_RAIN || isFinished || loading) return;

    // Prevent default for scrolling keys if focused on body (handled by inputs usually but global listener here)
    if([' '].includes(e.key) && e.target === document.body) {
        e.preventDefault();
    }

    if (e.key.length === 1 || e.key === 'Backspace') {
      if (!startTime) setStartTime(Date.now());

      if (e.key === 'Backspace') {
        setUserInput(prev => prev.slice(0, -1));
        return;
      }

      // Record Stats
      const expectedChar = text[userInput.length];
      const isCorrect = e.key === expectedChar;

      // Update Heatmap
      setKeyStats(prev => {
        const charKey = expectedChar?.toLowerCase() || '';
        if(!charKey) return prev;
        
        const current = prev[charKey] || { char: charKey, total: 0, errors: 0 };
        return {
          ...prev,
          [charKey]: {
            ...current,
            total: current.total + 1,
            errors: isCorrect ? current.errors : current.errors + 1
          }
        };
      });

      setUserInput(prev => {
        const next = prev + e.key;
        if (next.length === text.length) {
          finishSession(next);
        }
        return next;
      });
    }
  }, [mode, isFinished, loading, startTime, text, userInput]);

  const finishSession = async (finalInput: string) => {
    setIsFinished(true);
    // Calculate final stats
    const errors = finalInput.split('').reduce((acc, char, idx) => char !== text[idx] ? acc + 1 : acc, 0);
    const chars = finalInput.length;
    const durationMin = (Date.now() - (startTime || Date.now())) / 60000;
    const wpm = Math.round((chars / 5) / durationMin);
    const accuracy = Math.round(((chars - errors) / chars) * 100);

    const weakKeys = Object.values(keyStats)
      .filter((k: KeyStats) => (k.errors / k.total) > 0.1)
      .map((k: KeyStats) => k.char);

    const advice = await generateTypingAdvice(wpm, accuracy, weakKeys);
    setAiAdvice(advice);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // --- Render ---

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-slate-800 p-6 flex flex-col gap-6 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-neon-blue to-neon-purple rounded-lg shadow-lg animate-pulse"></div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-purple">
            TypeNeon
          </h1>
        </div>

        <nav className="flex flex-col gap-2">
          <MenuButton 
            active={mode === GameMode.LESSON} 
            onClick={() => handleModeChange(GameMode.LESSON)}
            icon={<ComputerDesktopIcon className="w-5 h-5" />}
            label="Lessons" 
          />
          <MenuButton 
            active={mode === GameMode.ZEN} 
            onClick={() => handleModeChange(GameMode.ZEN)}
            icon={<SparklesIcon className="w-5 h-5" />}
            label="Zen Mode" 
          />
          <MenuButton 
            active={mode === GameMode.GAME_RAIN} 
            onClick={() => handleModeChange(GameMode.GAME_RAIN)}
            icon={<BoltIcon className="w-5 h-5" />}
            label="Neon Rain" 
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-200 dark:border-slate-700">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto flex flex-col items-center max-w-7xl mx-auto w-full">
        
        {/* Header Stats */}
        <div className="w-full flex justify-between items-center mb-12">
           <div className="flex gap-8">
              <StatCard label="WPM" value={currentStats.wpm} color="text-neon-green" />
              <StatCard label="ACCURACY" value={`${currentStats.accuracy}%`} color="text-neon-blue" />
           </div>
           {mode === GameMode.LESSON && (
             <button 
               onClick={() => handleLessonGenerate('Intermediate')}
               className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-sm font-bold"
               disabled={loading}
             >
               <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
               {loading ? 'Generating...' : 'Surprise Me'}
             </button>
           )}
        </div>

        {/* Dynamic Content Based on Mode */}
        {mode === GameMode.GAME_RAIN ? (
          <div className="w-full max-w-4xl">
             {isFinished ? (
                 <div className="bg-dark-surface p-8 rounded-2xl border border-neon-purple text-center">
                    <h2 className="text-3xl font-bold mb-4 text-white">Game Over</h2>
                    <p className="text-xl text-neon-blue mb-6">Final Score: {lastGameScore}</p>
                    <button 
                      onClick={() => { setIsFinished(false); setLastGameScore(0); }}
                      className="px-6 py-3 bg-neon-purple text-white rounded-lg font-bold hover:bg-opacity-80 transition"
                    >
                      Play Again
                    </button>
                 </div>
             ) : (
                <RainGame onGameEnd={(score) => { setLastGameScore(score); setIsFinished(true); }} />
             )}
          </div>
        ) : (
          <>
            {/* Results Modal */}
            {isFinished && (
              <div className="w-full max-w-4xl mb-8 p-6 bg-white dark:bg-slate-800 rounded-xl border border-neon-green shadow-lg animate-fade-in-up">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Session Complete!</h2>
                    <p className="text-gray-600 dark:text-gray-300">
                      WPM: <span className="text-neon-green font-bold text-xl">{currentStats.wpm}</span> | 
                      Accuracy: <span className="text-neon-blue font-bold text-xl">{currentStats.accuracy}%</span>
                    </p>
                  </div>
                  {aiAdvice && (
                    <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg max-w-md">
                      <div className="flex items-center gap-2 mb-1 text-neon-purple text-sm font-bold uppercase">
                        <SparklesIcon className="w-4 h-4" /> AI Coach
                      </div>
                      <p className="italic text-gray-700 dark:text-gray-300 text-sm">"{aiAdvice}"</p>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end">
                   <button 
                     onClick={() => { resetSession(); if(mode === GameMode.ZEN) handleModeChange(GameMode.ZEN); }}
                     className="px-6 py-2 bg-neon-blue text-black font-bold rounded-lg hover:bg-opacity-80 transition"
                   >
                     Next Lesson
                   </button>
                </div>
              </div>
            )}

            {/* Typing Area */}
            <TypingArea 
              fullText={text} 
              userInput={userInput} 
              isFocused={true} // Simplified focus for demo
              onBlur={() => {}}
              onFocus={() => {}}
            />

            {/* Virtual Keyboard */}
            <div className="mt-12 w-full max-w-5xl overflow-x-auto">
              <VirtualKeyboard 
                activeKey={text[userInput.length]} 
                keyStats={keyStats}
              />
            </div>
          </>
        )}

      </main>
    </div>
  );
};

// UI Sub-components

const MenuButton = ({ active, onClick, label, icon }: any) => (
  <button 
    onClick={onClick}
    className={`
      flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
      ${active 
        ? 'bg-slate-100 dark:bg-slate-800 text-neon-blue border-l-4 border-neon-blue' 
        : 'text-gray-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
    `}
  >
    {icon}
    {label}
  </button>
);

const StatCard = ({ label, value, color }: any) => (
  <div className="flex flex-col">
    <span className="text-xs font-bold text-gray-400 tracking-wider mb-1">{label}</span>
    <span className={`text-4xl font-mono font-bold ${color}`}>{value}</span>
  </div>
);

export default App;