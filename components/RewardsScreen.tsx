
import React, { useState, useEffect } from 'react';
import { Crown, Zap, Star, User, ChevronLeft } from 'lucide-react';
import { Profile } from '../types';
import { api } from '../services/api';
import { useBackHandler } from '../hooks/useBackHandler';

interface RewardsScreenProps {
  profile: Profile | null;
  session: any;
  navigate: (path: string | number) => void;
}

export const RewardsScreen: React.FC<RewardsScreenProps> = ({ profile, session, navigate }) => {
    const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    const totalXP = profile?.total_xp || 0;
    
    const calculatedLevel = Math.floor(totalXP / 200) + 1;
    const currentLevelStartXP = (calculatedLevel - 1) * 200; 
    const xpProgressInLevel = totalXP - currentLevelStartXP; 
    const progressPercent = Math.min(100, (xpProgressInLevel / 200) * 100);

    const getBadgeFromXP = (xp: number) => {
        if (xp >= 8000) return "Platinum"; 
        if (xp >= 5000) return "Gold";
        if (xp >= 2500) return "Silver";
        if (xp >= 1000) return "Bronze";
        return "Rookie"; 
    };

    useBackHandler(() => {
        navigate('/');
        return true;
    });

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            const data = await api.getLeaderboard();
            setLeaderboard(data);
            setLoading(false);
        };
        fetchLeaderboard();
    }, []);

    return (
        <div className="h-[100dvh] flex flex-col bg-slate-950 font-sans text-white">
            {/* Header with Safe Area (pt-safe-header) */}
            <div className="sticky top-0 z-50 px-5 pb-3 pt-safe-header bg-slate-950 flex justify-between items-center border-b border-slate-800 shadow-lg">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700 transition-colors -ml-1 active:scale-95">
                        <ChevronLeft size={24} />
                    </button>
                    <h2 className="text-xl font-black text-white tracking-tight">Leaderboard</h2>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end mr-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly XP</span>
                        <div className="flex items-center gap-1 text-brand-400 font-black leading-none">
                            <Zap size={12} className="fill-brand-400" />
                            <span className="text-sm">{profile?.weekly_xp || 0}</span>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-slate-800 p-0.5 border border-slate-700 shadow-sm">
                        <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.user?.email || 'user'}`} className="w-full h-full rounded-full" alt="User" />
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto hide-scrollbar p-5 pb-safe">
                 {/* Container also needs bottom safe padding via pb-safe in class above or spacer below */}
                 
                 {/* CURRENT LEVEL CARD */}
                 <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden mb-8 text-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="relative mb-3">
                            <div className="w-20 h-20 bg-gradient-to-b from-amber-400 to-amber-600 rounded-2xl rotate-45 flex items-center justify-center shadow-lg border-4 border-slate-800">
                                <div className="-rotate-45 flex flex-col items-center">
                                    <span className="text-amber-100 text-[10px] font-bold uppercase tracking-widest">Lvl</span>
                                    <span className="text-white text-3xl font-black">{calculatedLevel}</span>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-2">{getBadgeFromXP(totalXP)}</h3>
                        
                        <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2 mb-5">
                            <Star size={12} className="text-yellow-400 fill-yellow-400" />
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Total XP: <span className="text-white">{totalXP}</span></span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full max-w-[220px]">
                             <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                                <span>{xpProgressInLevel} XP</span>
                                <span>200 XP</span>
                             </div>
                             <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
                             </div>
                             <p className="text-[10px] text-slate-500 font-bold mt-2">
                                {200 - xpProgressInLevel} XP to Level {calculatedLevel + 1}
                             </p>
                        </div>
                    </div>
                 </div>

                 {/* LEADERBOARD LIST */}
                 <div className="flex items-center gap-2 mb-4 px-1">
                     <Crown size={16} className="text-amber-500 fill-amber-500" />
                     <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest">Top Students</h3>
                 </div>

                 <div className="space-y-3 pb-24">
                     {loading ? (
                         <div className="text-center py-10 text-slate-600 text-sm">Loading ranks...</div>
                     ) : (
                         leaderboard.map((user, idx) => {
                             const isMe = user.id === profile?.id;
                             const rank = idx + 1;
                             let rankStyle = "bg-slate-800 border-slate-700 text-slate-400";
                             let icon = null;

                             if (rank === 1) {
                                 rankStyle = "bg-yellow-500/10 border-yellow-500/50 text-yellow-500";
                                 icon = <Crown size={14} className="fill-yellow-500 text-yellow-500" />;
                             } else if (rank === 2) {
                                 rankStyle = "bg-slate-700 border-slate-600 text-slate-300";
                             } else if (rank === 3) {
                                 rankStyle = "bg-orange-500/10 border-orange-500/50 text-orange-500";
                             }

                             const dynamicLevel = Math.floor((user.total_xp || 0) / 200) + 1;
                             const dynamicBadge = getBadgeFromXP(user.total_xp || 0);

                             return (
                                 <div key={user.id} className={`relative p-3 rounded-2xl border flex items-center gap-4 transition-transform active:scale-[0.98] ${isMe ? 'bg-brand-900/20 border-brand-500/50 shadow-[0_0_15px_rgba(14,165,233,0.15)]' : 'bg-slate-900 border-slate-800 shadow-sm'}`}>
                                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border ${rankStyle}`}>
                                         {icon || rank}
                                     </div>
                                     
                                     <div className="w-10 h-10 rounded-full bg-slate-800 p-0.5 shrink-0 border border-slate-700 overflow-hidden flex items-center justify-center">
                                         {user.avatar_url ? (
                                            <img src={user.avatar_url} className="w-full h-full rounded-full object-cover" alt="u" />
                                         ) : (
                                            <User size={20} className="text-slate-500" />
                                         )}
                                     </div>

                                     <div className="flex-1 min-w-0">
                                         <h4 className={`font-bold text-sm truncate ${isMe ? 'text-brand-400' : 'text-white'}`}>
                                             {user.full_name} {isMe && '(You)'}
                                         </h4>
                                         <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] font-bold text-slate-900 bg-amber-400 px-1.5 py-0.5 rounded">
                                                Lvl {dynamicLevel}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">{dynamicBadge}</span>
                                         </div>
                                     </div>

                                     <div className="text-right">
                                         <span className="block font-black text-white">{user.total_xp}</span>
                                         <span className="text-[9px] font-bold text-slate-500 uppercase">XP</span>
                                     </div>
                                 </div>
                             );
                         })
                     )}
                 </div>
            </div>
        </div>
    );
};
