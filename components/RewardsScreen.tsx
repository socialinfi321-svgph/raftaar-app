
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
            const cacheKey = 'leaderboard_cache';
            const cached = localStorage.getItem(cacheKey);
            
            // 1. Instant Load from Cache
            if (cached) {
                setLeaderboard(JSON.parse(cached));
                setLoading(false);
            }

            // 2. Background Refresh
            const data = await api.getLeaderboard();
            setLeaderboard(data);
            localStorage.setItem(cacheKey, JSON.stringify(data));
            setLoading(false);
        };
        fetchLeaderboard();
    }, []);

    return (
        <div className="h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white transition-colors duration-300">
            {/* Header with Safe Area (pt-safe-header) */}
            <div className="sticky top-0 z-50 px-4 sm:px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex justify-between items-center border-b border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
                <div className="flex items-center gap-2 sm:gap-3">
                    <button onClick={() => navigate(-1)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors p-1 sm:p-1.5 rounded-xl active:bg-slate-50 dark:active:bg-slate-800">
                        <ChevronLeft size={18} className="stroke-[3] sm:w-5 sm:h-5" />
                    </button>
                    <h2 className="text-[1.15rem] sm:text-[1.3rem] font-bold text-slate-900 dark:text-white tracking-tight">Leaderboard</h2>
                </div>
                <div className="flex items-center">
                    <div className="flex flex-col items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border bg-brand-50 dark:bg-brand-900/20 border-brand-500/30 text-brand-700 dark:text-brand-400 transition-colors duration-300 shadow-sm">
                        <div className="flex items-center gap-1 font-bold text-xs sm:text-sm leading-none">
                            <span className="text-yellow-400 drop-shadow-sm pb-[1px] text-[10px] sm:text-[12px]">🔥</span>
                            <span>{profile?.weekly_xp?.toLocaleString() || 0}</span>
                        </div>
                        <span className="text-[6px] sm:text-[7px] mt-0.5 leading-none font-medium uppercase tracking-wider text-brand-600/80 dark:text-brand-400/80 transition-colors duration-300">Weekly XP</span>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto hide-scrollbar p-4 sm:p-5 pb-safe">
                 {/* Container also needs bottom safe padding via pb-safe in class above or spacer below */}
                 
                 {/* CURRENT LEVEL CARD */}
                 <div className="bg-white dark:bg-slate-900/60 rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100/50 dark:border-slate-800/80 relative overflow-hidden mb-6 sm:mb-8 text-center mt-1 sm:mt-2 transition-colors duration-300">
                    {/* Top-left soft gradient */}
                    <div className="absolute -top-10 -left-10 w-32 h-32 sm:w-40 sm:h-40 bg-indigo-100/60 dark:bg-indigo-900/20 rounded-full blur-2xl sm:blur-3xl pointer-events-none transition-colors duration-300"></div>
                    {/* Bottom-right soft gradient */}
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 sm:w-40 sm:h-40 bg-purple-100/60 dark:bg-purple-900/20 rounded-full blur-2xl sm:blur-3xl pointer-events-none transition-colors duration-300"></div>
                    
                    {/* Decorative dots grid (subtle) */}
                    <div className="absolute top-4 left-4 sm:top-6 sm:left-6 grid grid-cols-3 gap-1 sm:gap-1.5 opacity-20 pointer-events-none">
                        {[...Array(9)].map((_, i) => <div key={i} className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full"></div>)}
                    </div>
                    <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 grid grid-cols-3 gap-1 sm:gap-1.5 opacity-20 pointer-events-none">
                        {[...Array(9)].map((_, i) => <div key={i} className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full"></div>)}
                    </div>

                    <div className="relative z-10 flex flex-col items-center pt-1 sm:pt-2">
                        <div className="relative mb-4 sm:mb-5">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-orange-500 via-orange-400 to-yellow-400 rounded-2xl sm:rounded-[1.25rem] rotate-45 flex items-center justify-center shadow-[0_8px_20px_rgba(249,115,22,0.3)] border-[3px] sm:border-4 border-white dark:border-slate-900 transition-colors duration-300">
                                <div className="-rotate-45 flex flex-col items-center mt-1">
                                    <span className="text-white/90 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest leading-none drop-shadow-sm">Lvl</span>
                                    <span className="text-white text-3xl sm:text-4xl font-black drop-shadow-sm">{calculatedLevel}</span>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-xl sm:text-[1.4rem] font-extrabold text-slate-800 dark:text-white mb-3 sm:mb-4">{getBadgeFromXP(totalXP)}</h3>
                        
                        <div className="bg-white dark:bg-slate-800/80 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm flex items-center gap-1.5 sm:gap-2 mb-6 sm:mb-8 transition-colors duration-300">
                            <Star size={12} className="text-yellow-400 fill-yellow-400 sm:w-3.5 sm:h-3.5" />
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total XP: <span className="text-slate-800 dark:text-white text-[11px] sm:text-xs font-black">{totalXP}</span></span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full max-w-[200px] sm:max-w-[240px]">
                             <div className="flex justify-between text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 sm:mb-2">
                                <span>{xpProgressInLevel} XP</span>
                                <span>200 XP</span>
                             </div>
                             <div className="h-2 sm:h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50 transition-colors duration-300">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${progressPercent}%` }}></div>
                             </div>
                             <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-2 sm:mt-3">
                                {200 - xpProgressInLevel} XP to Level {calculatedLevel + 1}
                             </p>
                        </div>
                    </div>
                 </div>

                 {/* LEADERBOARD LIST */}
                 <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
                     <div className="flex items-center gap-1.5 sm:gap-2">
                         <Crown size={16} className="text-amber-500 fill-amber-500 sm:w-[18px] sm:h-[18px]" />
                         <h3 className="text-slate-800 dark:text-slate-200 font-extrabold text-[13px] sm:text-sm uppercase tracking-wide">Top Students</h3>
                     </div>
                     <button className="text-indigo-500 dark:text-indigo-400 text-[11px] sm:text-xs font-bold flex items-center gap-0.5 sm:gap-1 active:opacity-70 transition-colors duration-300">
                         View All <ChevronLeft size={12} className="rotate-180 stroke-[3]" />
                     </button>
                 </div>

                 <div className="space-y-2.5 sm:space-y-3 pb-24">
                     {loading && leaderboard.length === 0 ? (
                         <div className="text-center py-10 text-slate-400 dark:text-slate-500 font-medium text-sm">Loading ranks...</div>
                     ) : (
                         leaderboard.map((user, idx) => {
                             const isMe = user.id === profile?.id;
                             const rank = idx + 1;
                             
                             let rankStyle = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold";
                             let icon = null;
                             let nameColor = "text-slate-800 dark:text-white";
                             let lvlBadgeBg = "bg-slate-600/90 dark:bg-slate-700";
                             let sideLineColor = "bg-slate-300 dark:bg-slate-600";
                             let badgeTextColor = "text-slate-500 dark:text-slate-400";

                             if (rank === 1) {
                                 rankStyle = "bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400";
                                 icon = <Crown size={14} className="fill-amber-500 text-amber-500 dark:text-amber-400 dark:fill-amber-400 sm:w-4 sm:h-4" />;
                                 lvlBadgeBg = "bg-indigo-600/90 dark:bg-indigo-500/90 text-white";
                                 sideLineColor = "bg-gradient-to-b from-amber-300 to-amber-500 dark:from-amber-400 dark:to-amber-600";
                                 badgeTextColor = "text-amber-500 dark:text-amber-400";
                             } else if (rank === 2) {
                                 rankStyle = "bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400 font-black";
                                 lvlBadgeBg = "bg-blue-600/90 dark:bg-blue-500/90 text-white";
                                 sideLineColor = "bg-gradient-to-b from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700";
                                 badgeTextColor = "text-blue-500 dark:text-blue-400";
                             } else if (rank === 3) {
                                 rankStyle = "bg-orange-50 dark:bg-orange-500/10 text-orange-500 dark:text-orange-400 font-black";
                                 lvlBadgeBg = "bg-orange-500/90 dark:bg-orange-600/90 text-white";
                                 sideLineColor = "bg-gradient-to-b from-orange-400 to-orange-500 dark:from-orange-500 dark:to-orange-600";
                                 badgeTextColor = "text-orange-500 dark:text-orange-400";
                             } else {
                                 const pIdx = rank - 4;
                                 const rankStyles = [
                                    "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                                    "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
                                    "bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
                                    "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
                                    "bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400",
                                    "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400"
                                 ];
                                 rankStyle = `${rankStyles[pIdx % rankStyles.length]} font-bold`;
                                 lvlBadgeBg = "bg-amber-400 dark:bg-amber-500 text-slate-900";
                                 sideLineColor = "";
                                 badgeTextColor = "text-slate-500 dark:text-slate-400";
                             }
                             
                             if (isMe) {
                                 nameColor = "text-indigo-600 dark:text-indigo-400";
                             }

                             const dynamicLevel = Math.floor((user.total_xp || 0) / 200) + 1;
                             const dynamicBadge = getBadgeFromXP(user.total_xp || 0);

                             return (
                                 <div key={user.id} className={`relative p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 shadow-[0_4px_15px_rgb(0,0,0,0.03)] dark:shadow-none border flex items-center gap-3 sm:gap-4 transition-all duration-300 active:scale-[0.98] overflow-hidden ${rank <= 3 ? 'pl-3.5 sm:pl-4' : ''} ${isMe ? 'ring-2 ring-indigo-500/30 dark:ring-indigo-500/40 border-indigo-100 dark:border-indigo-900/40' : 'border-slate-100 dark:border-slate-800'}`}>
                                    {/* Left color accent */}
                                    {rank <= 3 && (
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${sideLineColor}`}></div>
                                    )}

                                     <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-base sm:text-lg shrink-0 transition-colors duration-300 ${rankStyle}`}>
                                         {icon || rank}
                                     </div>
                                     
                                     <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 dark:bg-slate-800 p-0.5 shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center transition-colors duration-300">
                                         {user.avatar_url ? (
                                            <img src={user.avatar_url} className="w-full h-full rounded-full object-cover" alt="u" />
                                         ) : (
                                            <User size={18} className="text-slate-400 dark:text-slate-500 sm:w-5 sm:h-5" />
                                         )}
                                     </div>

                                     <div className="flex-1 min-w-0 pr-1 sm:pr-2">
                                         <h4 className={`font-bold text-sm sm:text-[15px] truncate mb-0.5 sm:mb-1 transition-colors duration-300 ${nameColor}`}>
                                             {user.full_name} {isMe && '(You)'}
                                         </h4>
                                         <div className="flex items-center gap-1.5 sm:gap-2">
                                            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-[1px] sm:py-0.5 rounded-md shadow-sm transition-colors duration-300 ${lvlBadgeBg}`}>
                                                Lvl {dynamicLevel}
                                            </span>
                                            <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wide truncate ${badgeTextColor}`}>{dynamicBadge}</span>
                                         </div>
                                     </div>

                                     <div className="text-right flex flex-col items-center justify-center shrink-0 pr-0.5 sm:pr-1">
                                         <span className="block font-black text-slate-900 dark:text-white text-sm sm:text-base leading-none mb-1 transition-colors duration-300">{user.total_xp}</span>
                                         <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase transition-colors duration-300">XP</span>
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
