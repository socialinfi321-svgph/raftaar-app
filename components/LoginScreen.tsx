
import React, { useState } from 'react';
import { api } from '../services/api';
import { Loader2, ArrowRight, User, MapPin, Phone, Languages, ChevronLeft, ShieldCheck, Sparkles, GraduationCap, Trophy, Target, Atom, PenTool, NotebookText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBackHandler } from '../hooks/useBackHandler';

export const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: (session: any) => void }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    location: '',
    mobileNumber: '',
    examLanguage: 'Hindi' as 'Hindi' | 'English'
  });

  const handleAppBack = () => {
     if (step > 1) {
         setStep(prev => prev - 1);
         return true;
     }
     return false; 
  };

  useBackHandler(handleAppBack, step > 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    if (step === 1 && !formData.fullName.trim()) return;
    if (step === 2 && !formData.location.trim()) return;
    if (step === 3 && formData.mobileNumber.length < 10) return;
    setStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const { user, session, error: authError } = await api.registerOrLogin({
          fullName: formData.fullName,
          mobileNumber: formData.mobileNumber,
          location: formData.location,
          examLanguage: formData.examLanguage
      });

      if (authError) throw authError;
      
      if (session) {
          onLoginSuccess(session);
      }
    } catch (err: any) {
      setError(err.message || "Connection failed. Please check your internet.");
      setLoading(false);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 20 : -20,
      opacity: 0,
    })
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-950 relative overflow-hidden font-sans text-white">
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-[10%] -right-[10%] w-[80vw] h-[80vw] bg-gradient-to-br from-brand-900 to-blue-900 rounded-full blur-3xl opacity-20"></div>
            <div className="absolute -bottom-[10%] -left-[10%] w-[70vw] h-[70vw] bg-gradient-to-tr from-purple-900 to-pink-900 rounded-full blur-3xl opacity-20"></div>
            
            <div className="absolute top-[15%] left-[8%] text-brand-700 opacity-30">
                <Atom size={56} strokeWidth={1.5} />
            </div>
            <div className="absolute top-[12%] right-[10%] text-blue-700 opacity-30">
                <Target size={40} strokeWidth={1.5} />
            </div>
            <div className="absolute bottom-[20%] left-[5%] text-slate-700 opacity-20 transform -rotate-12">
                <NotebookText size={120} strokeWidth={1} />
            </div>
            <div className="absolute bottom-[25%] right-[5%] text-brand-800 opacity-20 transform rotate-12">
                <PenTool size={100} strokeWidth={1} />
            </div>
            <div className="absolute top-[40%] right-[5%] text-purple-700 opacity-20">
                <Trophy size={32} strokeWidth={1.5} />
            </div>
        </div>

        {/* HEADER */}
        <div className="relative z-10 pt-safe-header pb-8 flex flex-col items-center justify-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center shadow-2xl shadow-brand-900/30 transform -rotate-3 border border-slate-700">
                    <span className="text-white font-black text-2xl italic font-sans pr-1">R</span>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter leading-none">RAFTAAR</h1>
                    <span className="text-[9px] font-bold text-brand-400 uppercase tracking-[0.3em] block mt-1">Test Series App</span>
                </div>
            </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 relative z-20 flex flex-col px-8 pb-safe max-w-md mx-auto w-full justify-center">
            
            <div className="w-full h-1 bg-slate-800 rounded-full mb-8 overflow-hidden shrink-0">
                <motion.div 
                    className="h-full bg-brand-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(step / 4) * 100}%` }}
                    transition={{ duration: 0.4 }}
                />
            </div>

            <div className="relative min-h-[300px]">
                <AnimatePresence mode='wait' custom={step}>
                    
                    {step === 1 && (
                        <motion.div key="step1" custom={step} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="absolute inset-0 flex flex-col">
                            <h2 className="text-3xl font-black text-white mb-2">Welcome!</h2>
                            <p className="text-slate-400 font-medium mb-8">Enter your name to begin your test series.</p>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400">
                                    <User size={20} />
                                </div>
                                <input 
                                    autoFocus
                                    name="fullName"
                                    type="text" 
                                    placeholder="Enter your name" 
                                    className="w-full bg-slate-900 border border-slate-800 shadow-sm rounded-2xl py-4 pl-12 pr-4 text-lg font-bold text-white placeholder:text-slate-600 outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                />
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="step2" custom={step} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="absolute inset-0 flex flex-col">
                            <h2 className="text-3xl font-black text-white mb-2">Location</h2>
                            <p className="text-slate-400 font-medium mb-8">Which city or district are you from?</p>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400">
                                    <MapPin size={20} />
                                </div>
                                <input 
                                    autoFocus
                                    name="location"
                                    type="text" 
                                    placeholder="Enter City/District" 
                                    className="w-full bg-slate-900 border border-slate-800 shadow-sm rounded-2xl py-4 pl-12 pr-4 text-lg font-bold text-white placeholder:text-slate-600 outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                    value={formData.location}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                />
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div key="step3" custom={step} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="absolute inset-0 flex flex-col">
                            <h2 className="text-3xl font-black text-white mb-2">Mobile</h2>
                            <p className="text-slate-400 font-medium mb-8">Enter your 10-digit number to login.</p>
                            <div className="space-y-4">
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400">
                                        <Phone size={20} />
                                    </div>
                                    <span className="absolute left-11 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-500 border-r border-slate-700 pr-2 mr-2">+91</span>
                                    <input 
                                        autoFocus
                                        name="mobileNumber"
                                        type="tel" 
                                        maxLength={10}
                                        placeholder="00000 00000" 
                                        className="w-full bg-slate-900 border border-slate-800 shadow-sm rounded-2xl py-4 pl-28 pr-4 text-lg font-bold text-white placeholder:text-slate-600 outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                        value={formData.mobileNumber}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setFormData({...formData, mobileNumber: val});
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                    />
                                </div>
                                <div className="flex items-center gap-2 px-2 opacity-60">
                                    <ShieldCheck size={12} className="text-brand-400" />
                                    <p className="text-[10px] text-brand-400 font-bold">Secure Login • OTP Verification</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div key="step4" custom={step} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="absolute inset-0 flex flex-col">
                            <h2 className="text-3xl font-black text-white mb-2">Medium</h2>
                            <p className="text-slate-400 font-medium mb-8">Select your preferred exam language.</p>
                            
                            <div className="grid grid-cols-1 gap-3">
                                {['Hindi', 'English'].map((lang) => {
                                    const isSelected = formData.examLanguage === lang;
                                    return (
                                        <div 
                                            key={lang}
                                            onClick={() => setFormData({...formData, examLanguage: lang as any})}
                                            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between active:scale-[0.98] ${isSelected ? 'border-brand-500 bg-slate-800 shadow-lg shadow-brand-900/50 ring-1 ring-brand-500' : 'border-transparent bg-slate-900 shadow-sm hover:bg-slate-800'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                                    <Languages size={20} />
                                                </div>
                                                <div>
                                                    <h3 className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-slate-400'}`}>{lang}</h3>
                                                </div>
                                            </div>
                                            {isSelected && <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full"></div></div>}
                                        </div>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
            
            {error && (
                <div className="mb-4 text-center">
                    <p className="text-red-400 text-xs font-bold bg-red-950/30 py-2 px-4 rounded-full inline-block shadow-sm border border-red-900/50 animate-pulse">{error}</p>
                </div>
            )}

            <div className="flex items-center gap-4 mt-auto z-30 pb-4">
                 {step > 1 && (
                    <button 
                        onClick={handleAppBack}
                        className="w-14 h-14 rounded-full bg-slate-900 shadow-md text-slate-400 flex items-center justify-center hover:text-white transition-colors border border-slate-800"
                    >
                        <ChevronLeft size={24} />
                    </button>
                 )}
                 
                 <button 
                    onClick={step < 4 ? handleNext : handleSubmit}
                    disabled={
                        (step === 1 && !formData.fullName) || 
                        (step === 2 && !formData.location) || 
                        (step === 3 && formData.mobileNumber.length < 10) ||
                        loading
                    }
                    className="flex-1 h-14 bg-white text-slate-950 rounded-full font-bold text-lg shadow-xl shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                 >
                    {loading ? <Loader2 className="animate-spin" /> : (
                        step < 4 ? (
                            <>Next <ArrowRight size={20} /></>
                        ) : (
                            <>Start Learning <Sparkles size={18} /></>
                        )
                    )}
                 </button>
            </div>

        </div>
    </div>
  );
};
