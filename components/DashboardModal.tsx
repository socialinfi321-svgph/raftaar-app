
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Trophy, Target, Clock, XCircle, CheckCircle2, Activity,
  History, CalendarDays, Infinity, BookOpen, ScrollText, AlertTriangle,
  Play, User, Layout, Zap
} from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { Profile, DashboardStats } from '../types';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useBackHandler } from '../hooks/useBackHandler';

interface DashboardModalProps {
  isOpen: boolean;
  profile: Profile | null;
  onBack: () => void;
  userId: string;
}

export const DashboardModal: React.FC<DashboardModalProps> = ({ isOpen, profile, onBack, userId }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // --- UNIFIED BACK LOGIC ---
  const handleAppBack = () => {
    onBack();
    return true; // Trap: Manually close the modal
  };

  // Sync Hardware Button
  useBackHandler(handleAppBack, isOpen);

  // Fetch data only when Modal is OPEN
  useEffect(() => {
    if (isOpen && userId) {
      const fetchDashboard = async () => {
        setLoading(true);
        const data = await api.getDashboardData(userId);
        setStats(data);
        setLoading(false);
      };
      fetchDashboard();
    }
  }, [isOpen, userId]);

  const dailySolved = (stats?.dailyCorrect || 0) + (stats?.dailyWrong || 0);
  const dailyAccuracy = dailySolved > 0 
    ? Math.round(((stats?.dailyCorrect || 0) / dailySolved) * 100) 
    : 0;

  const getTestIcon = (type: string) => {
    switch (type) {
        case 'Infinity': return <Infinity size={16} className="text-purple-600" />;
        case 'PYQ': return <BookOpen size={16} className="text-amber-600" />;
        case 'Practice': return <Play size={16} className="text-emerald-600 ml-0.5" />;
        default: return <ScrollText size={16} className="text-blue-600" />;
    }
  };

  const getTestColor = (type: string) => {
      switch (type) {
          case 'Infinity': return 'bg-purple-50 border-purple-200';
          case 'PYQ': return 'bg-amber-50 border-amber-200';
          case 'Practice': return 'bg-emerald-50 border-emerald-200';
          default: return 'bg-blue-50 border-blue-200';
      }
  };

  const getTestTextColor = (type: string) => {
      switch (type) {
          case 'Infinity': return 'text-purple-700 bg-purple-100 border-purple-200';
          case 'PYQ': return 'text-amber-700 bg-amber-100 border-amber-200';
          case 'Practice': return 'text-emerald-700 bg-emerald-100 border-emerald-200';
          default: return 'text-blue-700 bg-blue-100 border-blue-200';
      }
  };

  return (
    <AnimatePresence mode="sync">
      {isOpen && (
        <>
            {/* 1. BACKDROP */}
            <motion.div 
                key="dashboard-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={onBack}
                className="fixed inset-0 bg-black z-40" 
            />

            {/* 2. SLIDING PANEL */}
            <motion.div 
              key="dashboard-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200, mass: 0.8 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-[#f8faff] z-50 shadow-2xl flex flex-col h-full overflow-hidden font-sans"
            >
              
              {/* Loading State INSIDE the modal */}
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center bg-[#f8faff]">
                    <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading Stats...</p>
                </div>
              ) : (
                <div className="h-full overflow-y-auto hide-scrollbar">
                    {/* 1. HERO HEADER */}
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white pb-8 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

                        {/* Apply Safe Area Offset to Header */}
                        <div className="relative z-10 px-5 pt-safe-offset-14 pb-2">
                        <div className="flex justify-between items-center mb-4">
                            {/* UI Back Button triggers same logic as hardware back */}
                            <button onClick={handleAppBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 backdrop-blur-md border border-white/10 active:bg-white/10 transition-all hover:scale-105">
                            <ArrowLeft size={18} className="text-white" />
                            </button>
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-100/90 shadow-black drop-shadow-sm">Online</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center text-center">
                            <div className="relative mb-3 group">
                                <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-brand-400 via-purple-400 to-amber-400 shadow-xl shadow-brand-900/50">
                                    <div className="w-full h-full rounded-full border-[3px] border-slate-900 overflow-hidden bg-slate-800 flex items-center justify-center relative">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Profile" />
                                        ) : (
                                            <User size={32} className="text-slate-400" />
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <h2 className="text-xl font-black tracking-tight mb-6 mt-1 text-white text-shadow-sm">{profile?.full_name || 'Student'}</h2>

                            {/* Responsive Grid for Header Stats */}
                            <div className="grid grid-cols-3 gap-2 w-full px-2">
                                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-col items-center gap-1 shadow-lg hover:bg-white/10 transition-colors">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Layout size={10} className="text-yellow-400" /> Tests</div>
                                    <div className="text-lg font-black text-white">{stats?.totalTests || 0}</div>
                                </div>
                                <div className="bg-emerald-500/5 backdrop-blur-md border border-emerald-500/20 rounded-xl p-3 flex flex-col items-center gap-1 shadow-lg hover:bg-emerald-500/10 transition-colors">
                                    <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={10} /> Right</div>
                                    <div className="text-lg font-black text-white">{stats?.totalCorrect}</div>
                                </div>
                                <div className="bg-rose-500/5 backdrop-blur-md border border-rose-500/20 rounded-xl p-3 flex flex-col items-center gap-1 shadow-lg hover:bg-rose-500/10 transition-colors">
                                    <div className="text-[9px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1"><XCircle size={10} /> Wrong</div>
                                    <div className="text-lg font-black text-white">{stats?.totalWrong}</div>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>

                    {/* BODY CONTENT */}
                    <div className="p-5 space-y-6 -mt-2 relative z-20">
                        
                        {/* Today's Pulse */}
                        <div>
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <Activity size={16} className="text-brand-600" />
                                <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Today's Pulse</h3>
                            </div>
                            <div className="flex overflow-x-auto hide-scrollbar gap-3 snap-x pb-2">
                                {/* Card 1: Solved Today */}
                                <div className="min-w-[130px] bg-white p-4 rounded-2xl border-b-4 border border-slate-100 border-b-slate-200 snap-center shadow-sm flex flex-col justify-between h-32 group relative overflow-hidden active:scale-95 transition-transform">
                                     <div className="absolute top-0 right-0 w-16 h-16 bg-brand-50 rounded-full blur-xl -mr-6 -mt-6 transition-all group-hover:bg-brand-100"></div>
                                     <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-2 relative z-10 shadow-sm border border-brand-100"><CheckCircle2 size={18} /></div>
                                     <div className="relative z-10">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 tracking-wider">Solved</p>
                                        <div className="flex items-baseline gap-1"><p className="text-2xl font-black text-slate-900 tracking-tight">{dailySolved}</p><span className="text-[9px] font-bold text-slate-400">Qs</span></div>
                                     </div>
                                </div>

                                {/* Card 2: Total Right (NEW) */}
                                <div className="min-w-[130px] bg-white p-4 rounded-2xl border-b-4 border border-slate-100 border-b-slate-200 snap-center shadow-sm flex flex-col justify-between h-32 group relative overflow-hidden active:scale-95 transition-transform">
                                     <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-full blur-xl -mr-6 -mt-6 transition-all group-hover:bg-emerald-100"></div>
                                     <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 relative z-10 shadow-sm border border-emerald-100"><CheckCircle2 size={18} /></div>
                                     <div className="relative z-10">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 tracking-wider">Total Right</p>
                                        <div className="flex items-baseline gap-1"><p className="text-2xl font-black text-slate-900 tracking-tight">{stats?.dailyCorrect || 0}</p><span className="text-[9px] font-bold text-slate-400">Qs</span></div>
                                     </div>
                                </div>

                                {/* Card 3: Accuracy */}
                                <div className="min-w-[130px] bg-white p-4 rounded-2xl border-b-4 border border-slate-100 border-b-slate-200 snap-center shadow-sm flex flex-col justify-between h-32 group relative overflow-hidden active:scale-95 transition-transform">
                                     <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-full blur-xl -mr-6 -mt-6 transition-all group-hover:bg-blue-100"></div>
                                     <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 relative z-10 shadow-sm border border-blue-100"><Target size={18} /></div>
                                     <div className="relative z-10">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 tracking-wider">Accuracy</p>
                                        <p className="text-2xl font-black text-slate-900 tracking-tight">{dailyAccuracy}%</p>
                                     </div>
                                </div>
                                {/* Card 4: Avg Speed */}
                                <div className="min-w-[130px] bg-white p-4 rounded-2xl border-b-4 border border-slate-100 border-b-slate-200 snap-center shadow-sm flex flex-col justify-between h-32 group relative overflow-hidden active:scale-95 transition-transform">
                                     <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-full blur-xl -mr-6 -mt-6 transition-all group-hover:bg-amber-100"></div>
                                     <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 relative z-10 shadow-sm border border-amber-100"><Clock size={18} /></div>
                                     <div className="relative z-10">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 tracking-wider">Speed</p>
                                        <div className="flex items-baseline gap-1"><p className="text-2xl font-black text-slate-900 tracking-tight">{stats?.dailyAvgTime}</p><span className="text-[9px] font-bold text-slate-400">s</span></div>
                                     </div>
                                </div>
                                {/* Card 5: Mistakes */}
                                <div className="min-w-[130px] bg-white p-4 rounded-2xl border-b-4 border border-slate-100 border-b-slate-200 snap-center shadow-sm flex flex-col justify-between h-32 group relative overflow-hidden active:scale-95 transition-transform">
                                     <div className="absolute top-0 right-0 w-16 h-16 bg-rose-50 rounded-full blur-xl -mr-6 -mt-6 transition-all group-hover:bg-rose-100"></div>
                                     <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2 relative z-10 shadow-sm border border-rose-100"><AlertTriangle size={18} /></div>
                                     <div className="relative z-10">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 tracking-wider">Mistakes</p>
                                        <p className="text-2xl font-black text-slate-900 tracking-tight">{stats?.dailyWrong}</p>
                                     </div>
                                </div>
                            </div>
                        </div>

                        {/* Graph - Full Width Container */}
                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] w-full">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <CalendarDays size={16} className="text-brand-600" />
                                    <h3 className="font-bold text-slate-900 text-sm">Performance</h3>
                                </div>
                                <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">Last 7 Days</span>
                            </div>
                            <div className="h-36 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats?.graphData}>
                                    <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                                    </linearGradient>
                                    </defs>
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                      itemStyle={{ color: '#fff' }}
                                      cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }}
                                    />
                                    <Area type="monotone" dataKey="score" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorScore)" />
                                </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* History Section */}
                        <div className="pb-24">
                           <div className="flex items-center gap-2 mb-3 px-1">
                                <History size={16} className="text-brand-600" />
                                <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Recent Activity</h3>
                           </div>
                           {stats?.history.length === 0 && <div className="text-center p-6 border-2 border-dashed border-slate-100 rounded-3xl bg-white"><div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-300"><History size={20} /></div><p className="text-slate-400 text-[10px] font-bold uppercase">No recent tests</p></div>}
                           
                           <div className="space-y-2.5">
                           {stats?.history.map((item, idx) => (
                               <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform hover:shadow-md hover:border-brand-100">
                                   <div className="flex items-center gap-3">
                                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getTestColor(item.type)} shadow-sm`}>
                                          {getTestIcon(item.type)}
                                       </div>
                                       <div>
                                           <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                               {item.subject}
                                           </h4>
                                           <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider ${getTestTextColor(item.type)}`}>
                                                    {item.type}
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-medium">
                                                    {new Date(item.date).toLocaleDateString()}
                                                </span>
                                           </div>
                                       </div>
                                   </div>
                                   <div className="text-right">
                                       <span className="block font-black text-slate-900 text-base">
                                           {item.correct}/{item.totalQuestions}
                                       </span>
                                       <span className="text-[9px] font-bold text-slate-400 uppercase">Correct</span>
                                   </div>
                               </div>
                           ))}
                           </div>
                        </div>
                    </div>
                </div>
              )}
            </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
