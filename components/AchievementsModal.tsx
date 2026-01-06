
import React from 'react';
import { ChevronLeft, Medal, Lock, Star, Crown, Award, CheckCircle2, Zap, TrendingUp, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Profile } from '../types';
import { useBackHandler } from '../hooks/useBackHandler';

interface AchievementsModalProps {
  isOpen: boolean;
  profile: Profile | null;
  onBack: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ isOpen, profile, onBack }) => {
  const totalXP = profile?.total_xp || 0;
  const weeklyXP = profile?.weekly_xp || 0;

  const handleAppBack = () => {
    onBack();
    return true; 
  };

  useBackHandler(handleAppBack, isOpen);

  const achievements = [
    {
      id: 1,
      name: 'Bronze Beginner',
      requiredXP: 1000,
      icon: Medal,
      medalName: 'Bronze',
      theme: {
        bg: 'bg-gradient-to-br from-[#E6A65D] via-[#FFF0E0] to-[#CD7F32]', 
        border: 'border-[#A05A2C]',
        iconBg: 'bg-gradient-to-br from-[#CD7F32] to-[#8B4513]', 
        iconColor: 'text-[#FFE4B5]',
        text: 'text-[#5D3A1A]',
        subText: 'text-[#8B5A2B]',
        progress: 'bg-[#CD7F32]',
        tag: 'bg-[#CD7F32]/10 border-[#CD7F32] text-[#8B4513]'
      },
      desc: 'Start your journey. Earn 1000 XP.',
    },
    {
      id: 2,
      name: 'Silver Striker',
      requiredXP: 2500,
      icon: Star,
      medalName: 'Silver',
      theme: {
        bg: 'bg-gradient-to-br from-[#C0C0C0] via-[#FFFFFF] to-[#A9A9A9]',
        border: 'border-[#808080]',
        iconBg: 'bg-gradient-to-br from-[#A9A9A9] to-[#696969]',
        iconColor: 'text-white',
        text: 'text-slate-800',
        subText: 'text-slate-600',
        progress: 'bg-[#A9A9A9]',
        tag: 'bg-slate-500/10 border-slate-500 text-slate-700'
      },
      desc: 'Consistency is key. Reach 2500 XP.',
    },
    {
      id: 3,
      name: 'Gold Genius',
      requiredXP: 5000,
      icon: Crown,
      medalName: 'Gold',
      theme: {
        bg: 'bg-gradient-to-br from-[#FFD700] via-[#FFFACD] to-[#DAA520]',
        border: 'border-[#B8860B]',
        iconBg: 'bg-gradient-to-br from-[#DAA520] to-[#B8860B]',
        iconColor: 'text-[#FFF8E1]',
        text: 'text-[#78350F]', 
        subText: 'text-[#92400E]',
        progress: 'bg-[#F59E0B]',
        tag: 'bg-[#F59E0B]/10 border-[#B8860B] text-[#78350F]'
      },
      desc: 'Elite status unlocked at 5000 XP.',
    },
    {
      id: 4,
      name: 'Platinum Legend',
      requiredXP: 8000,
      icon: Award,
      medalName: 'Platinum',
      theme: {
        bg: 'bg-gradient-to-br from-[#E0F7FA] via-[#FFFFFF] to-[#B2EBF2]',
        border: 'border-[#00BCD4]',
        iconBg: 'bg-gradient-to-br from-[#00BCD4] to-[#006064]',
        iconColor: 'text-cyan-50',
        text: 'text-[#0E7490]',
        subText: 'text-[#155E75]',
        progress: 'bg-[#00BCD4]',
        tag: 'bg-[#00BCD4]/10 border-[#00838F] text-[#0E7490]'
      },
      desc: 'Ultimate mastery. 8,000 XP Club.',
    }
  ];

  const nextAchievement = achievements.find(a => totalXP < a.requiredXP);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={onBack}
                className="fixed inset-0 bg-black z-40" 
            />

            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col h-[100dvh] overflow-hidden font-sans text-slate-900"
            >
              {/* Header with Safe Area (pt-safe) */}
              <div className="px-5 py-4 pt-safe bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-30 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={handleAppBack} className="p-1 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors active:scale-95">
                        <ChevronLeft size={28} />
                    </button>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Achievements</h2>
                </div>
                
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Weekly XP</span>
                    <div className="flex items-center gap-1 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-100">
                        <Zap size={12} className="text-brand-600 fill-brand-600" />
                        <span className="text-sm font-black text-brand-700">{weeklyXP}</span>
                    </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto hide-scrollbar pb-safe">
                
                {/* TOP SECTION */}
                <div className="bg-gradient-to-b from-blue-50/50 to-white pt-8 pb-10 px-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-100 rounded-full blur-3xl opacity-50 -ml-10 -mb-10"></div>

                    <div className="flex flex-col items-center justify-center relative z-10">
                        <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm mb-2">
                            <TrendingUp size={14} className="text-green-500" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lifetime Progress</span>
                        </div>
                        <div className="text-5xl font-black text-gray-900 tracking-tighter mb-1 drop-shadow-sm">{totalXP.toLocaleString()}</div>
                        <p className="text-sm font-medium text-gray-400">Total XP Earned</p>
                    </div>
                </div>

                {/* Vertical List */}
                <div className="px-6 pb-24 -mt-4 relative z-20">
                  <div className="space-y-6">
                    {achievements.map((item, index) => {
                      const isUnlocked = totalXP >= item.requiredXP;
                      const isNext = nextAchievement?.id === item.id;
                      
                      return (
                        <div key={item.id} className="relative">
                            {/* Connector Line */}
                            {index !== achievements.length - 1 && (
                                <div className="absolute left-[28px] top-16 bottom-[-24px] w-[3px] rounded-full overflow-hidden z-0">
                                    <div className={`w-full h-full ${isUnlocked ? 'bg-gradient-to-b from-brand-400 to-blue-200' : 'bg-gray-100'}`}></div>
                                </div>
                            )}

                            {/* CARD */}
                            <div className={`relative group flex flex-col gap-3 p-5 rounded-3xl border transition-all duration-300 overflow-hidden ${isUnlocked ? `${item.theme.bg} ${item.theme.border} shadow-lg shadow-gray-200` : 'bg-white border-gray-100 grayscale opacity-80'}`}>
                                
                                {isUnlocked && (
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-50 pointer-events-none" />
                                )}

                                <div className="flex items-start gap-4 relative z-10">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-inner transition-transform ${isUnlocked ? `${item.theme.iconBg} border-white/30 scale-105` : 'bg-gray-50 border-gray-100'}`}>
                                        {isUnlocked ? (
                                            <>
                                                <item.icon size={26} className={`${item.theme.iconColor} drop-shadow-md`} strokeWidth={2.5} />
                                                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20"></div>
                                            </>
                                        ) : (
                                            <Lock size={22} className="text-gray-300" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 pt-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`font-black text-lg truncate ${item.theme.text} drop-shadow-sm`}>{item.name}</h4>
                                            
                                            {isUnlocked && (
                                                <div className="bg-white/90 p-1 rounded-full shadow-sm border border-black/5">
                                                    <CheckCircle2 size={16} className="text-green-600" />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2 mb-2">
                                            {isUnlocked && (
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider shadow-sm ${item.theme.tag}`}>
                                                    {item.medalName}
                                                </span>
                                            )}
                                            <p className={`text-xs font-bold ${item.theme.subText}`}>
                                                {isUnlocked ? 'Unlocked' : `Target: ${item.requiredXP} XP`}
                                            </p>
                                        </div>
                                        
                                        {!isUnlocked && (
                                            <p className="text-[11px] text-gray-400 font-medium mt-1 leading-snug">
                                                {item.desc}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {isNext && (
                                    <div className="mt-2 bg-white/60 p-3 rounded-xl border border-gray-100 backdrop-blur-sm shadow-inner">
                                        <div className="flex justify-between text-[10px] font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                                            <span>Progress</span>
                                            <span>{item.requiredXP - totalXP} XP Left</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ${item.theme.progress}`}
                                                style={{ width: `${Math.max(5, (totalXP / item.requiredXP) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
