
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Atom, FlaskConical, Calculator, Dna, Languages, BookType, Sparkles } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';

const subjectsList = [
  { name: 'Physics', icon: Atom, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-900/50' },
  { name: 'Chemistry', icon: FlaskConical, color: 'text-teal-500 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/30', border: 'border-teal-200 dark:border-teal-900/50' },
  { name: 'Maths', icon: Calculator, color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-200 dark:border-indigo-900/50' },
  { name: 'Biology', icon: Dna, color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30', border: 'border-rose-200 dark:border-rose-900/50' },
  { name: 'Hindi', icon: Languages, color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-900/50' },
  { name: 'English', icon: BookType, color: 'text-violet-500 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30', border: 'border-violet-200 dark:border-violet-900/50' },
];

const yearsList = Array.from({ length: 16 }, (_, i) => 2010 + i).reverse();

interface PYQDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'objective' | 'subjective';
  instantOpen?: boolean;
  onSelectYear: (subject: string, year: number, type: 'objective' | 'subjective') => void;
}

export const PYQDashboard: React.FC<PYQDashboardProps> = ({ 
    isOpen, 
    onClose, 
    onSelectYear, 
    initialTab = 'objective', 
    instantOpen = false 
}) => {
  const [activeTab, setActiveTab] = useState<'objective' | 'subjective'>(initialTab);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedSubject(null);
    }
  }, [isOpen, initialTab]);

  // Priority: Close Popup -> Switch to Objective -> Close Modal
  const handleAppBack = () => {
    if (selectedSubject) {
      setSelectedSubject(null);
      return true;
    }
    if (activeTab === 'subjective') {
      setActiveTab('objective');
      return true;
    }
    onClose();
    return true;
  };

  useBackHandler(handleAppBack, isOpen);

  const handleSubjectClick = (subject: string) => {
    setSelectedSubject(subject);
  };

  const handleYearClick = (year: number) => {
    if (selectedSubject) {
      onSelectYear(selectedSubject, year, activeTab);
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
                    className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-950 z-50 shadow-2xl flex flex-col h-[100dvh] overflow-hidden font-sans text-slate-900 dark:text-white"
                >
                    <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none dark:block hidden" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                    {/* Header with Safe Area (pt-safe-header) */}
                    <div className="px-5 pb-4 pt-safe-header bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 sticky top-0 z-50 shadow-sm shrink-0">
                        <button onClick={handleAppBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors -ml-1 active:scale-95">
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Practice PYQs</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 pb-24 z-10 hide-scrollbar pb-safe">
                        
                        {/* Tabs */}
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl mb-8 border border-slate-200 dark:border-slate-800 shadow-inner dark:shadow-sm isolate">
                        {(['objective', 'subjective'] as const).map((tab) => {
                            const isActive = activeTab === tab;
                            return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-3 text-sm font-bold text-center relative transition-colors duration-200 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                {isActive && (
                                <motion.div
                                    layoutId="active-tab-pill"
                                    className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-md border border-slate-100 dark:border-slate-600 -z-10"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                                )}
                                <span className="relative z-10 capitalize">{tab}</span>
                            </button>
                            );
                        })}
                        </div>

                        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 pl-1">Select Subject</h3>
                        
                        <div className="relative min-h-[400px]"> 
                            <AnimatePresence mode='wait' initial={false}>
                                <motion.div
                                    key={activeTab}
                                    initial={{ x: 10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -10, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="grid grid-cols-2 gap-4 w-full"
                                >
                                {subjectsList.map((sub) => (
                                    <div 
                                    key={sub.name} 
                                    onClick={() => handleSubjectClick(sub.name)}
                                    className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border ${sub.border} shadow-sm dark:shadow-none hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.97] transition-all cursor-pointer flex flex-col justify-between h-40 group relative overflow-hidden`}
                                    >
                                        <div className={`absolute inset-0 ${sub.bg} opacity-0 group-hover:opacity-50 transition-opacity duration-300`}></div>
                                        <div className="relative z-10">
                                            <div className={`w-10 h-10 rounded-xl ${sub.bg} flex items-center justify-center ${sub.color} mb-3 border ${sub.border}`}>
                                                <sub.icon size={20} strokeWidth={2.5} />
                                            </div>
                                            <span className="font-black text-slate-800 dark:text-slate-200 text-lg tracking-tight block">{sub.name}</span>
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wide">BSEB 2010-2025</span>
                                        </div>
                                        <div className="relative z-10 flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <Sparkles size={10} className="text-yellow-500" />
                                            <span>Practice PYQs</span>
                                        </div>
                                    </div>
                                ))}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    <AnimatePresence>
                        {selectedSubject && (
                        <>
                            <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.3 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedSubject(null)}
                            className="absolute inset-0 bg-black z-40"
                            />
                            
                            <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="absolute bottom-0 left-0 right-0 z-50 rounded-t-[2rem] overflow-hidden"
                            >
                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 pb-safe border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 mt-2"></div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 text-center">Select Year</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">
                                Practice <span className="font-bold text-slate-900 dark:text-white capitalize">{activeTab}</span> PYQs for <span className="font-bold text-brand-600 dark:text-brand-400">{selectedSubject}</span>
                                </p>
                                <div className="flex overflow-x-auto gap-3 pb-6 px-2 hide-scrollbar snap-x">
                                {yearsList.map((year) => (
                                    <button
                                    key={year}
                                    onClick={() => handleYearClick(year)}
                                    className="snap-center shrink-0 w-20 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-brand-500/50 flex items-center justify-center text-lg font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 active:bg-slate-100 dark:active:bg-slate-700"
                                    >
                                    {year}
                                    </button>
                                ))}
                                </div>
                            </div>
                            </motion.div>
                        </>
                        )}
                    </AnimatePresence>
                </motion.div>
            </>
        )}
    </AnimatePresence>
  );
};