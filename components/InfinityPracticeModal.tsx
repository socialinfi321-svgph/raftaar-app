
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, FlaskConical, Atom, Calculator, Dna, Languages, BookType, Tablet, PenTool } from 'lucide-react';
import { api } from '../services/api';
import { useBackHandler } from '../hooks/useBackHandler';

interface InfinityPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onStartSession: (subject: string, chapters: string[]) => void;
  initialSubject?: string | null;
  onUpdateSubject?: (subject: string | null) => void;
  instantOpen?: boolean;
}

const subjectsList = [
  { name: 'Maths', icon: Calculator, color: 'text-sky-400', bg: 'bg-slate-900', border: 'border-slate-800' },
  { name: 'Chemistry', icon: FlaskConical, color: 'text-sky-400', bg: 'bg-slate-900', border: 'border-slate-800' },
  { name: 'Physics', icon: Atom, color: 'text-sky-400', bg: 'bg-slate-900', border: 'border-slate-800' },
  { name: 'Biology', icon: Dna, color: 'text-sky-400', bg: 'bg-slate-900', border: 'border-slate-800' },
  { name: 'Hindi', icon: Languages, color: 'text-sky-400', bg: 'bg-slate-900', border: 'border-slate-800' },
  { name: 'English', icon: BookType, color: 'text-sky-400', bg: 'bg-slate-900', border: 'border-slate-800' },
];

export const InfinityPracticeModal: React.FC<InfinityPracticeModalProps> = ({ 
  isOpen, 
  onClose, 
  userId, 
  onStartSession,
  initialSubject,
  onUpdateSubject,
  instantOpen = false
}) => {
  // We removed local 'step' state. Step is now derived from selectedSubject.
  // If subject is selected -> Step 2. Else -> Step 1.
  const [selectedSubject, setSelectedSubject] = useState<string | null>(initialSubject || null);
  const step = selectedSubject ? 2 : 1;

  const [chapters, setChapters] = useState<{ en: string, hi: string, count: number }[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Sync internal state with props (URL params)
  useEffect(() => {
    if (isOpen) {
        setSelectedSubject(initialSubject || null);
        // Reset chapters if going back to step 1
        if (!initialSubject) {
            setSelectedChapters([]);
        }
    }
  }, [isOpen, initialSubject]);

  // Stack Navigation Logic for Hardware Back Button
  const handleAppBack = () => {
    if (step === 2) {
      // Go back to Step 1
      setSelectedSubject(null);
      if (onUpdateSubject) onUpdateSubject(null); // Update URL
      return true; // Trap
    } else {
      // Exit Modal
      onClose(); 
      return true; // Trap
    }
  };

  useBackHandler(handleAppBack, isOpen);

  useEffect(() => {
    if (selectedSubject) {
      setLoading(true);
      api.getChapterStats(selectedSubject).then(data => {
        setChapters(data);
        // Pre-select first 3 for convenience, or empty
        setSelectedChapters(data.slice(0, 3).map(c => c.en));
        setLoading(false);
      });
    }
  }, [selectedSubject]);

  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    if (onUpdateSubject) onUpdateSubject(subject);
  };

  const toggleChapter = (chapterName: string) => {
    setSelectedChapters(prev => 
      prev.includes(chapterName) 
        ? prev.filter(c => c !== chapterName) 
        : [...prev, chapterName]
    );
  };

  const handleStart = async () => {
    if (!selectedSubject) return;
    if (selectedChapters.length < 2) {
        alert("Minimum 2 chapters required to start.");
        return;
    }
    setCreating(true);
    // Simulating API creation delay if needed
    const sessionId = await api.createPracticeSession(userId, selectedSubject, selectedChapters);
    setCreating(false);
    onStartSession(selectedSubject, selectedChapters);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: instantOpen ? 0.5 : 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />
          
          <motion.div
            initial={{ x: instantOpen ? 0 : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-950 z-50 shadow-2xl flex flex-col h-[100dvh] overflow-hidden font-sans text-white"
          >
            <div className="bg-slate-950 shadow-sm z-20 border-b border-slate-800 shrink-0 sticky top-0">
                <div className="pt-safe-header pb-4 px-5 flex items-center gap-3">
                    <button onClick={handleAppBack} className="text-slate-400 hover:text-white transition-colors p-1 -ml-2 rounded-full active:bg-slate-900">
                        <ChevronLeft size={28} strokeWidth={2.5} />
                    </button>
                    <h2 className="text-xl font-black text-white tracking-tight">
                        {step === 1 ? 'Select Subject' : 'Select Chapters'}
                    </h2>
                </div>

                <div className="px-6 pb-6">
                    <div className="flex items-center justify-between text-sm w-full">
                        <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 1 ? 'bg-white text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                                {step > 1 ? <Check size={10} /> : '1'}
                            </div>
                            <span className={`${step >= 1 ? 'text-white font-bold' : 'text-slate-500 font-medium'}`}>Subject</span>
                        </div>
                        <div className="flex-1 h-[2px] bg-slate-800 mx-3 rounded-full"></div>
                        <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 2 ? 'bg-white text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                                2
                            </div>
                            <span className={`${step >= 2 ? 'text-white font-bold' : 'text-slate-500 font-medium'}`}>Chapter</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 relative flex flex-col bg-slate-950">
              <div className="absolute inset-0 overflow-y-auto hide-scrollbar pb-safe">
              
              {step === 1 && (
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col min-h-full"
                >
                    <div className="p-6 space-y-4 z-10 flex-1">
                        {subjectsList.map((sub) => (
                            <div 
                            key={sub.name}
                            onClick={() => handleSubjectSelect(sub.name)}
                            className={`bg-slate-900 h-16 rounded-xl flex items-center px-4 cursor-pointer transition-all border border-slate-800 shadow-sm hover:bg-slate-800 active:scale-[0.98]`}
                            >
                            <div className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-700 mr-4 bg-slate-950">
                                <sub.icon size={20} className={sub.color} strokeWidth={1.5} />
                            </div>
                            <div className="h-8 w-[1px] bg-slate-800 mr-4"></div>
                            <span className="font-bold text-slate-200 text-sm tracking-wide">{sub.name}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-6 pb-24 flex flex-col min-h-full"
                >
                  {selectedChapters.length < 2 && (
                      <div className="mb-4 bg-red-950/30 border border-red-900/50 text-red-400 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shrink-0">
                          <div className="w-4 h-4 bg-red-900/50 rounded-full flex items-center justify-center text-red-400">!</div>
                          Minimum 2 chapters required
                      </div>
                  )}

                  <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="font-bold text-white text-lg">Select Chapters</h3>
                    <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                      {selectedChapters.length}/{chapters.length}
                    </span>
                  </div>

                  {loading ? (
                    <div className="space-y-3">
                      {[1,2,3,4,5,6].map(i => <div key={i} className="h-16 bg-slate-900 rounded-xl border border-slate-800 animate-pulse" />)}
                    </div>
                  ) : (
                    <div className="space-y-3 pb-4">
                      {chapters.map((chap, idx) => {
                        const isSelected = selectedChapters.includes(chap.en);
                        return (
                          <div 
                            key={chap.en}
                            onClick={() => toggleChapter(chap.en)}
                            className={`bg-slate-900 p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-all ${isSelected ? 'border-brand-500 ring-1 ring-brand-500 shadow-sm bg-brand-900/20' : 'border-slate-800 hover:border-slate-700'}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${isSelected ? 'bg-brand-900/50 text-brand-400 border-brand-500/50' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-bold text-sm ${isSelected ? 'text-brand-400' : 'text-slate-200'}`}>{chap.en}</h4>
                              {chap.hi && (
                                <p className="text-xs text-slate-500 font-medium mt-0.5">{chap.hi}</p>
                              )}
                              <p className="text-[10px] text-slate-600 font-medium mt-1">{chap.count} Questions</p>
                            </div>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-700 bg-slate-900'}`}>
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
              </div>
            </div>

            {step === 2 && (
              <div className="absolute bottom-0 w-full bg-slate-950 border-t border-slate-800 p-4 pb-safe flex gap-4 shadow-[0_-5px_20px_rgba(0,0,0,0.2)] z-20">
                <button 
                  onClick={() => handleSubjectSelect('')} 
                  className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-colors"
                >
                  Previous
                </button>
                <button 
                  onClick={handleStart}
                  disabled={selectedChapters.length < 2 || creating}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-brand-600 shadow-lg shadow-brand-900 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-500 transition-transform active:scale-95"
                >
                  {creating ? 'Creating...' : 'Start'}
                </button>
              </div>
            )}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
