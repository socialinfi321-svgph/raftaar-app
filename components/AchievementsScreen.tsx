
import React from 'react';
import { ChevronLeft, Medal, Lock, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Profile } from '../types';

interface AchievementsScreenProps {
  profile: Profile | null;
  onBack: () => void;
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ profile, onBack }) => {
  const totalXP = profile?.total_xp || 0;

  const achievements = [
    {
      name: 'Platinum Scholar',
      requiredXP: 8000,
      color: 'bg-gradient-to-br from-slate-300 via-white to-slate-400',
      textColor: 'text-slate-800',
      iconColor: 'text-slate-900',
      description: 'Mastery level achieved. You are a legend!'
    },
    {
      name: 'Gold Genius',
      requiredXP: 4000,
      color: 'bg-gradient-to-br from-yellow-300 via-yellow-100 to-yellow-500',
      textColor: 'text-yellow-900',
      iconColor: 'text-yellow-800',
      description: 'Consistent excellence in all subjects.'
    },
    {
      name: 'Silver Striker',
      requiredXP: 2500,
      color: 'bg-gradient-to-br from-gray-300 via-gray-100 to-gray-400',
      textColor: 'text-gray-800',
      iconColor: 'text-gray-700',
      description: 'You are moving up fast!'
    },
    {
      name: 'Bronze Beginner',
      requiredXP: 1300,
      color: 'bg-gradient-to-br from-orange-300 via-orange-100 to-orange-500',
      textColor: 'text-orange-900',
      iconColor: 'text-orange-800',
      description: 'First big milestone unlocked.'
    }
  ];

  return (
    <motion.div 
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="h-full flex flex-col bg-white overflow-y-auto absolute inset-0 z-50"
    >
      <div className="px-5 py-4 bg-white border-b border-gray-100 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors -ml-1 active:scale-95">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-black text-gray-900">Achievements</h2>
      </div>

      <div className="p-6 pb-24 space-y-6">
        {/* Header Stats */}
        <div className="bg-gray-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-3 border border-white/20">
                    <Star className="text-yellow-400 fill-yellow-400" size={32} />
                </div>
                <h3 className="text-3xl font-black">{totalXP}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lifetime XP</p>
            </div>
        </div>

        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Medals</h3>

        <div className="space-y-4">
          {achievements.map((ach) => {
            const isUnlocked = totalXP >= ach.requiredXP;
            
            return (
              <div key={ach.name} className={`relative p-5 rounded-2xl border-2 transition-all ${isUnlocked ? 'border-transparent shadow-lg' : 'border-gray-100 bg-gray-50 opacity-80'}`}>
                 {isUnlocked ? (
                    <div className={`absolute inset-0 rounded-2xl ${ach.color} opacity-20`}></div>
                 ) : (
                    <div className="absolute inset-0 bg-gray-50 rounded-2xl"></div>
                 )}

                 <div className="relative z-10 flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm shrink-0 ${isUnlocked ? ach.color : 'bg-gray-200'}`}>
                        {isUnlocked ? (
                            <Medal size={28} className={ach.iconColor} strokeWidth={2} />
                        ) : (
                            <Lock size={24} className="text-gray-400" />
                        )}
                    </div>
                    <div className="flex-1">
                        <h4 className={`font-bold text-lg ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>{ach.name}</h4>
                        <p className="text-xs text-gray-500 font-medium mb-2">{ach.description}</p>
                        
                        {!isUnlocked && (
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-brand-500 rounded-full" 
                                    style={{ width: `${Math.min(100, (totalXP / ach.requiredXP) * 100)}%` }}
                                ></div>
                            </div>
                        )}
                        {!isUnlocked && (
                            <p className="text-[10px] font-bold text-gray-400 mt-1 text-right">{totalXP} / {ach.requiredXP} XP</p>
                        )}
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
