
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, FlaskConical, Atom, Calculator, Dna, Languages, BookType, Tablet, PenTool } from 'lucide-react';
import { api } from '../services/api';

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
  { name: 'Maths', icon: Calculator, color: 'text-sky-500', bg: 'bg-white', border: 'border-gray-200' },
  { name: 'Chemistry', icon: FlaskConical, color: 'text-sky-500', bg: 'bg-white', border: 'border-gray-200' },
  { name: 'Physics', icon: Atom, color: 'text-sky-500', bg: 'bg-white', border: 'border-gray-200' },
  { name: 'Biology', icon: Dna, color: 'text-sky-500', bg: 'bg-white', border: 'border-gray-200' },
  { name: 'Hindi', icon: Languages, color: 'text-sky-500', bg: 'bg-white', border: 'border-gray-200' },
  { name: 'English', icon: BookType, color: 'text-sky-500', bg: 'bg-white', border: 'border-gray-200' },
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
  const [step, setStep] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [chapters, setChapters] = useState<{ en: string, hi: string, count: number }[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialSubject) {
        setSelectedSubject(initialSubject);
        setStep(2);
      } else {
        setStep(1);
        setSelectedSubject(null);
        setSelectedChapters([]);
      }
    }
  }, [isOpen, initialSubject]);

  useEffect(() => {
    if (selectedSubject) {
      setLoading(true);
      api.getChapterStats(selectedSubject).then(data => {
        setChapters(data);
        setSelectedChapters(data.slice(0, 3).map(c => c.en));
        setLoading(false);
      });
    }
  }, [selectedSubject]);

  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    setStep(2);
    if (onUpdateSubject) onUpdateSubject(subject);
  };

  const toggleChapter = (chapterName: string) => {
    setSelectedChapters(prev => 
      prev.includes(chapterName) 
        ? prev.filter(c => c !== chapterName) 
        : [...prev, chapterName]
    );
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedSubject(null);
      if (onUpdateSubject) onUpdateSubject(null);
    } else {
      onClose();
    }
  };

  const handleStart = async () => {
    if (!selectedSubject) return;
    
    if (selectedChapters.length < 2) {
        alert("Minimum 2 chapters required to start.");
        return;
    }

    setCreating(true);
    const sessionId = await api.createPracticeSession(userId, selectedSubject, selectedChapters);
    setCreating(false);
    
    if (sessionId) {
      onStartSession(selectedSubject, selectedChapters);
    } else {
        onStartSession(selectedSubject, selectedChapters);
    }
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
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col h-full overflow-hidden font-sans"
          >
            <div className="bg-white shadow-sm z-20 border-b border-gray-100 shrink-0">
                <div className="pt-6 pb-4 px-5 flex items-center gap-3">
                    <button onClick={handleBack} className="text-gray-600 hover:text-gray-900 transition-colors p-1 -ml-2 rounded-full active:bg-gray-100">
                        <ChevronLeft size={28} strokeWidth={2.5} />
                    </button>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Start New Practice</h2>
                </div>

                <div className="px-6 pb-6">
                    <div className="flex items-center justify-between text-sm w-full">
                        <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 1 ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {step > 1 ? <Check size={10} /> : '1'}
                            </div>
                            <span className={`${step >= 1 ? 'text-gray-900 font-bold' : 'text-gray-400 font-medium'}`}>Subject</span>
                        </div>
                        <div className="flex-1 h-[2px] bg-gray-100 mx-3 rounded-full"></div>
                        <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 2 ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {step > 2 ? <Check size={10} /> : '2'}
                            </div>
                            <span className={`${step >= 2 ? 'text-gray-900 font-bold' : 'text-gray-400 font-medium'}`}>Chapter</span>
                        </div>
                        <div className="flex-1 h-[2px] bg-gray-100 mx-3 rounded-full"></div>
                        <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 3 ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'}`}>
                                3
                            </div>
                            <span className={`${step >= 3 ? 'text-gray-900 font-bold' : 'text-gray-400 font-medium'}`}>Preference</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 relative flex flex-col bg-gray-50">
              <div className="absolute inset-0 overflow-y-auto hide-scrollbar">
              
              {step === 1 && (
                <div className="flex flex-col min-h-full">
                    <div className="p-6 space-y-4 z-10 flex-1">
                        {subjectsList.map((sub) => (
                            <div 
                            key={sub.name}
                            onClick={() => handleSubjectSelect(sub.name)}
                            className={`bg-white h-16 rounded-xl flex items-center px-4 cursor-pointer transition-all border border-gray-200 shadow-sm hover:shadow-md active:scale-[0.98]`}
                            >
                            <div className="w-10 h-10 flex items-center justify-center rounded-lg border border-sky-100 mr-4">
                                <sub.icon size={20} className={sub.color} strokeWidth={1.5} />
                            </div>
                            <div className="h-8 w-[1px] bg-gray-100 mr-4"></div>
                            <span className="font-bold text-gray-800 text-sm tracking-wide">{sub.name}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto px-6 pb-8 pt-10 relative overflow-hidden bg-gray-50 shrink-0">
                        <div className="absolute -left-10 bottom-0 w-56 h-56 bg-purple-100 rounded-full blur-3xl opacity-70 pointer-events-none"></div>
                        <div className="absolute right-6 top-10 grid grid-cols-4 gap-2 opacity-20 pointer-events-none">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="w-1 h-1 bg-gray-400 rounded-full"></div>
                            ))}
                        </div>

                        <div className="relative flex justify-between items-end z-10">
                            <div>
                                <h3 className="text-3xl font-black text-gray-800 leading-tight">
                                    Unlimited<br/>
                                    Questions to<br/>
                                    Practice
                                </h3>
                            </div>
                            <div className="relative w-24 h-32 flex items-center justify-center">
                                <Tablet size={80} strokeWidth={1} className="text-gray-800 fill-white" />
                                <div className="absolute -right-2 top-8">
                                    <PenTool size={40} strokeWidth={1} className="text-gray-800 fill-white transform -rotate-45" />
                                </div>
                                <div className="absolute flex flex-col gap-2 items-start left-7 top-8">
                                    <div className="w-8 h-1 bg-gray-200 rounded-full"></div>
                                    <div className="w-10 h-1 bg-gray-200 rounded-full"></div>
                                    <div className="w-6 h-1 bg-gray-200 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {step === 2 && (
                <div className="p-6 pb-24 animate-fade-in flex flex-col min-h-full">
                  {selectedChapters.length < 2 && (
                      <div className="mb-4 bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shrink-0">
                          <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center text-red-500">!</div>
                          Minimum 2 chapters required to start
                      </div>
                  )}

                  <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="font-bold text-gray-900 text-lg">Select Chapters</h3>
                    <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">
                      {selectedChapters.length}/{chapters.length}
                    </span>
                  </div>

                  {loading ? (
                    <div className="space-y-3">
                      {[1,2,3,4,5,6].map(i => <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />)}
                    </div>
                  ) : (
                    <div className="space-y-3 pb-4">
                      {chapters.map((chap, idx) => {
                        const isSelected = selectedChapters.includes(chap.en);
                        return (
                          <div 
                            key={chap.en}
                            onClick={() => toggleChapter(chap.en)}
                            className={`bg-white p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-all ${isSelected ? 'border-brand-500 ring-1 ring-brand-500 shadow-sm bg-brand-50/30' : 'border-gray-200 hover:border-gray-300'}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${isSelected ? 'bg-brand-100 text-brand-600 border-brand-200' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-bold text-sm ${isSelected ? 'text-brand-700' : 'text-gray-800'}`}>{chap.en}</h4>
                              {chap.hi && (
                                <p className="text-xs text-gray-400 font-medium mt-0.5">{chap.hi}</p>
                              )}
                              <p className="text-[10px] text-gray-300 font-medium mt-1">{chap.count} Questions</p>
                            </div>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-300 bg-white'}`}>
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>

            {step === 2 && (
              <div className="absolute bottom-0 w-full bg-white border-t border-gray-100 p-4 pb-6 flex gap-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-20">
                <button 
                  onClick={() => handleSubjectSelect('')}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <button 
                  onClick={handleStart}
                  disabled={selectedChapters.length < 2 || creating}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-brand-600 shadow-lg shadow-brand-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-700 transition-transform active:scale-95"
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
