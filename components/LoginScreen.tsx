
import React, { useState } from 'react';
import { api } from '../services/api';
import { Loader2, ArrowRight, User, MapPin, Phone, Languages, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: (session: any) => void }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    location: '',
    mobileNumber: '',
    examLanguage: 'English' as 'Hindi' | 'English'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    if (step === 1 && !formData.fullName.trim()) return;
    if (step === 2 && !formData.location.trim()) return;
    if (step === 3 && formData.mobileNumber.length < 10) return;
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      // Use the new simplified Auth method
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
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // Animation variants
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  return (
    <div className="h-screen flex flex-col bg-white relative overflow-hidden font-sans">
        
        {/* Background Decors */}
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-brand-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-purple-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        
        <div className="flex-1 flex flex-col justify-center px-8 relative z-10 max-w-md mx-auto w-full">
            
            {/* Header / Logo */}
            <div className="mb-10 text-center">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center shadow-xl transform rotate-6">
                         <span className="text-white text-4xl font-black">R</span>
                    </div>
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Raftaar Series</h1>
                
                {/* Progress Indicators */}
                <div className="flex justify-center gap-2 mt-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step >= i ? 'w-8 bg-brand-600' : 'w-2 bg-gray-200'}`}></div>
                    ))}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 bg-red-50 p-3 rounded-xl border border-red-100 text-center">
                    <p className="text-red-600 text-xs font-bold">{error}</p>
                </div>
            )}

            {/* Wizard Steps */}
            <div className="relative min-h-[300px]">
                <AnimatePresence mode='wait'>
                    
                    {/* STEP 1: NAME */}
                    {step === 1 && (
                        <motion.div key="step1" variants={variants} initial="enter" animate="center" exit="exit" transition={{type:"spring", stiffness: 300, damping: 30}} className="absolute inset-0">
                            <h2 className="text-3xl font-black text-gray-900 mb-2">What's your name?</h2>
                            <p className="text-gray-500 mb-8 font-medium">Let's get to know each other.</p>
                            
                            <div className="relative group">
                                <User className="absolute left-4 top-4 text-brand-600" size={20} />
                                <input 
                                    autoFocus
                                    name="fullName"
                                    type="text" 
                                    placeholder="Enter Full Name" 
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl font-bold text-lg border-2 border-transparent focus:border-brand-500 focus:bg-white outline-none transition-all placeholder-gray-400 text-gray-900"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: LOCATION */}
                    {step === 2 && (
                        <motion.div key="step2" variants={variants} initial="enter" animate="center" exit="exit" transition={{type:"spring", stiffness: 300, damping: 30}} className="absolute inset-0">
                            <h2 className="text-3xl font-black text-gray-900 mb-2">Where do you live?</h2>
                            <p className="text-gray-500 mb-8 font-medium">City, Village or District.</p>
                            
                            <div className="relative group">
                                <MapPin className="absolute left-4 top-4 text-brand-600" size={20} />
                                <input 
                                    autoFocus
                                    name="location"
                                    type="text" 
                                    placeholder="e.g. Patna, Bihar" 
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl font-bold text-lg border-2 border-transparent focus:border-brand-500 focus:bg-white outline-none transition-all placeholder-gray-400 text-gray-900"
                                    value={formData.location}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: PHONE */}
                    {step === 3 && (
                        <motion.div key="step3" variants={variants} initial="enter" animate="center" exit="exit" transition={{type:"spring", stiffness: 300, damping: 30}} className="absolute inset-0">
                            <h2 className="text-3xl font-black text-gray-900 mb-2">Mobile Number</h2>
                            <p className="text-gray-500 mb-8 font-medium">This will be your unique ID.</p>
                            
                            <div className="relative group">
                                <Phone className="absolute left-4 top-4 text-brand-600" size={20} />
                                <input 
                                    autoFocus
                                    name="mobileNumber"
                                    type="tel" 
                                    maxLength={10}
                                    placeholder="9876543210" 
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl font-bold text-lg border-2 border-transparent focus:border-brand-500 focus:bg-white outline-none transition-all placeholder-gray-400 text-gray-900"
                                    value={formData.mobileNumber}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setFormData({...formData, mobileNumber: val});
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: LANGUAGE */}
                    {step === 4 && (
                        <motion.div key="step4" variants={variants} initial="enter" animate="center" exit="exit" transition={{type:"spring", stiffness: 300, damping: 30}} className="absolute inset-0">
                            <h2 className="text-3xl font-black text-gray-900 mb-2">Exam Language</h2>
                            <p className="text-gray-500 mb-8 font-medium">Select your preferred medium.</p>
                            
                            <div className="grid grid-cols-1 gap-4">
                                {['Hindi', 'English'].map((lang) => (
                                    <div 
                                        key={lang}
                                        onClick={() => setFormData({...formData, examLanguage: lang as any})}
                                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${formData.examLanguage === lang ? 'border-brand-600 bg-brand-50' : 'border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.examLanguage === lang ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                <Languages size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900">{lang}</h3>
                                                <p className="text-xs text-gray-500 font-medium">{lang === 'Hindi' ? 'हिंदी माध्यम' : 'English Medium'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="mt-auto mb-8 flex gap-4">
                {step > 1 && (
                    <button 
                        onClick={handleBack}
                        disabled={loading}
                        className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}
                
                {step < 4 ? (
                    <button 
                        onClick={handleNext}
                        disabled={
                            (step === 1 && !formData.fullName) || 
                            (step === 2 && !formData.location) || 
                            (step === 3 && formData.mobileNumber.length < 10)
                        }
                        className="flex-1 h-14 bg-black text-white rounded-2xl font-bold text-lg shadow-xl shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                        Next <ArrowRight size={20} />
                    </button>
                ) : (
                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 h-14 bg-brand-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-brand-200 disabled:opacity-70 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Start Learning'}
                    </button>
                )}
            </div>

        </div>
    </div>
  );
};
