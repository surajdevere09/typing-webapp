import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameMode, KeyStats, Theme, TypingSessionStats } from './types';
import TypingArea from './components/TypingArea';
import VirtualKeyboard from './components/VirtualKeyboard';
import RainGame from './components/RainGame';
import { generateLessonContent, generateTypingAdvice } from './services/geminiService';
import { 
  ComputerDesktopIcon, 
  SparklesIcon, 
  BoltIcon, 
  SunIcon, 
  MoonIcon, 
  ArrowPathIcon,
  FireIcon,
  ChartBarIcon
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

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
    
    // Time calculation
    const now = Date.now();
    const start = startTime || now;
    // Prevent division by zero and minimal time
    const durationMin = Math.max((now - start) / 60000, 0.001);
    
    const wpm = Math.round((charsTyped / 5) / durationMin);
    const accuracy = charsTyped > 0 ? Math.round(((charsTyped - errors) / charsTyped) * 100) : 100;

    return { wpm, accuracy, timeElapsed: durationMin * 60, mistakes: errors, charsTyped };
  }, [userInput, startTime, text]);

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

  // Identify weakest keys for display
  const weakKeysDisplay = useMemo(() => {
    return Object.values(keyStats)
      .sort((a: KeyStats, b: KeyStats) => (b.errors / (b.total || 1)) - (a.errors / (a.total || 1)))
      .slice(0, 3)
      .filter((k: KeyStats) => k.errors > 0); 
  }, [keyStats]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-300 overflow-hidden relative">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-100 pointer-events-none z-0" />

      {/* Sidebar Navigation */}
      <motion.aside 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full md:w-72 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl border-r border-gray-200 dark:border-slate-800 p-6 flex flex-col gap-6 z-20 shadow-xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-neon-purple rounded-lg shadow-[0_0_15px_rgba(188,19,254,0.5)] flex items-center justify-center shrink-0">
             <FireIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-purple truncate">
            TypeNeon
          </h1>
        </div>

        <nav className="flex flex-col gap-2">
          <MenuButton 
            active={mode === GameMode.LESSON} 
            onClick={() => handleModeChange(GameMode.LESSON)}
            icon={<ComputerDesktopIcon className="w-5 h-5" />}
            label="Practice" 
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
        
        <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Training Needed</h3>
            <div className="flex gap-2">
                {weakKeysDisplay.length > 0 ? weakKeysDisplay.map((k: KeyStats) => (
                    <div key={k.char} className="w-8 h-8 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center font-mono font-bold border border-red-200 dark:border-red-800 animate-pulse">
                        {k.char.toUpperCase()}
                    </div>
                )) : <span className="text-xs text-gray-400">No weak keys yet</span>}
            </div>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-200 dark:border-slate-700">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto flex flex-col items-center w-full relative z-10">
        
        {/* Header Stats */}
        <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center mb-12 gap-6"
        >
           <div className="flex gap-8 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800">
              <StatCard label="WPM" value={currentStats.wpm} color="text-neon-green" />
              <div className="w-px bg-gray-200 dark:bg-slate-700 h-10 self-center"></div>
              <StatCard label="ACCURACY" value={`${currentStats.accuracy}%`} color="text-neon-blue" />
           </div>
           
           {mode === GameMode.LESSON && (
             <button 
               onClick={() => handleLessonGenerate('Intermediate')}
               className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl shadow-[0_0_20px_rgba(188,19,254,0.3)] hover:shadow-[0_0_30px_rgba(188,19,254,0.5)] transition-all font-bold"
               disabled={loading}
             >
               <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
               {loading ? 'Generating...' : 'Surprise Me'}
             </button>
           )}
        </motion.div>

        {/* Dynamic Content */}
        <div className="w-full max-w-5xl flex-1 flex flex-col items-center">
        {mode === GameMode.GAME_RAIN ? (
          <div className="w-full h-full min-h-[500px]">
             {isFinished ? (
                 <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-dark-surface p-12 rounded-3xl border-2 border-neon-purple text-center shadow-2xl"
                 >
                    <h2 className="text-4xl font-black mb-4 text-white uppercase tracking-widest">Game Over</h2>
                    <p className="text-6xl font-mono text-neon-blue mb-8 text-shadow-neon">{lastGameScore}</p>
                    <button 
                      onClick={() => { setIsFinished(false); setLastGameScore(0); }}
                      className="px-8 py-4 bg-neon-purple text-white rounded-xl font-bold hover:bg-opacity-80 transition text-lg"
                    >
                      Play Again
                    </button>
                 </motion.div>
             ) : (
                <RainGame onGameEnd={(score) => { setLastGameScore(score); setIsFinished(true); }} />
             )}
          </div>
        ) : (
          <>
            <AnimatePresence>
            {isFinished && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full mb-8 p-6 bg-white dark:bg-slate-800/90 backdrop-blur rounded-2xl border-l-4 border-neon-green shadow-xl"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Session Complete</h2>
                    <p className="text-gray-600 dark:text-gray-300 flex items-center gap-4">
                      <span>Speed: <span className="text-neon-green font-bold text-2xl">{currentStats.wpm}</span> wpm</span>
                      <span>•</span>
                      <span>Accuracy: <span className="text-neon-blue font-bold text-2xl">{currentStats.accuracy}%</span></span>
                    </p>
                  </div>
                  {aiAdvice && (
                    <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                      <div className="flex items-center gap-2 mb-2 text-neon-purple text-sm font-bold uppercase tracking-wide">
                        <SparklesIcon className="w-4 h-4" /> AI Analysis
                      </div>
                      <p className="italic text-gray-700 dark:text-gray-200 font-medium">"{aiAdvice}"</p>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end">
                   <button 
                     onClick={() => { resetSession(); if(mode === GameMode.ZEN) handleModeChange(GameMode.ZEN); }}
                     className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:scale-105 transition-transform"
                   >
                     Next Lesson →
                   </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>

            {/* Typing Area */}
            <TypingArea 
              fullText={text} 
              userInput={userInput} 
              isFocused={true} 
              onBlur={() => {}}
              onFocus={() => {}}
            />

            {/* Virtual Keyboard */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-12 w-full overflow-x-auto"
            >
              <VirtualKeyboard 
                activeKey={text[userInput.length]} 
                keyStats={keyStats}
              />
            </motion.div>
          </>
        )}
        </div>

      </main>
    </div>
  );
};

// UI Sub-components

const MenuButton = ({ active, onClick, label, icon }: any) => (
  <button 
    onClick={onClick}
    className={`
      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200
      ${active 
        ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg scale-105' 
        : 'text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
    `}
  >
    {icon}
    {label}
  </button>
);

const StatCard = ({ label, value, color }: any) => (
  <div className="flex flex-col min-w-[100px]">
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</span>
    <span className={`text-5xl font-mono font-black tracking-tighter ${color} drop-shadow-sm`}>{value}</span>
  </div>
);

export default App;