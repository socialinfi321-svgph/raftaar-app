
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Trophy, 
  Target, 
  Clock, 
  XCircle, 
  CheckCircle2, 
  Activity,
  History,
  CalendarDays,
  Infinity, 
  BookOpen, 
  ScrollText,
  AlertTriangle,
  Play,
  User,
  Zap,
  Layout
} from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { Profile, DashboardStats } from '../types';
import { api } from '../services/api';
import { motion } from 'framer-motion';

interface DashboardScreenProps {
  profile: Profile | null;
  onBack: () => void;
  userId: string;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ profile, onBack, userId }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      if (userId) {
        const data = await api.getDashboardData(userId);
        setStats(data);
      }
      setLoading(false);
    };
    fetchDashboard();
  }, [userId]);

  // Logic: Solved = Correct + Wrong (Excluding Skipped)
  const dailySolved = (stats?.dailyCorrect || 0) + (stats?.dailyWrong || 0);
  
  // Logic: Accuracy based on Solved (not total attempts which might include skipped)
  const dailyAccuracy = dailySolved > 0 
    ? Math.round(((stats?.dailyCorrect || 0) / dailySolved) * 100) 
    : 0;

  // Icon Helper Function
  const getTestIcon = (type: string) => {
    switch (type) {
        case 'Infinity': return <Infinity size={18} className="text-purple-600" />;
        case 'PYQ': return <BookOpen size={18} className="text-amber-600" />;
        case 'Practice': return <Play size={18} className="text-emerald-600 ml-0.5" />;
        default: return <ScrollText size={18} className="text-blue-600" />;
    }
  };

  const getTestColor = (type: string) => {
      switch (type) {
          case 'Infinity': return 'bg-purple-50 border-purple-100';
          case 'PYQ': return 'bg-amber-50 border-amber-100';
          case 'Practice': return 'bg-emerald-50 border-emerald-100';
          default: return 'bg-blue-50 border-blue-100';
      }
  };

  const getTestTextColor = (type: string) => {
      switch (type) {
          case 'Infinity': return 'text-purple-700 bg-purple-100';
          case 'PYQ': return 'text-amber-700 bg-amber-100';
          case 'Practice': return 'text-emerald-700 bg-emerald-100';
          default: return 'text-blue-700 bg-blue-100';
      }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f8faff]">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="h-full flex flex-col bg-[#f8faff] overflow-y-auto font-sans hide-scrollbar absolute inset-0 z-50 bg-white"
    >
      
      {/* 1. HERO HEADER (Professional Design) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white pb-10 rounded-b-[3rem] shadow-2xl relative overflow-hidden shrink-0">
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        <div className="relative z-10 px-6 pt-6">
          {/* Top Nav */}
          <div className="flex justify-between items-center mb-6">
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 backdrop-blur-md border border-white/10 active:bg-white/10 transition-all hover:scale-105">
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-100/90 shadow-black drop-shadow-sm">Online</span>
            </div>
          </div>

          {/* Profile Section */}
          <div className="flex flex-col items-center text-center">
            
            {/* Avatar - Logic: Image or Default Icon */}
            <div className="relative mb-4 group">
                <div className="w-28 h-28 rounded-full p-1.5 bg-gradient-to-tr from-brand-400 via-purple-400 to-amber-400 shadow-2xl shadow-brand-900/50">
                    <div className="w-full h-full rounded-full border-4 border-slate-900 overflow-hidden bg-slate-800 flex items-center justify-center relative">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                            <User size={48} className="text-slate-400" />
                        )}
                        {/* Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                </div>
            </div>
            
            <h2 className="text-2xl font-black tracking-tight mb-8 mt-2 text-white">{profile?.full_name || 'Student'}</h2>

            {/* Lifetime Stats (Glassmorphism Cards) */}
            <div className="flex gap-3 w-full justify-center max-w-sm">
                
                {/* Tests Taken (Replaced XP) */}
                <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-1.5 shadow-xl hover:bg-white/10 transition-colors">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Layout size={10} className="text-yellow-400" /> Tests
                    </div>
                    <div className="text-xl font-black text-white">{stats?.totalTests || 0}</div>
                </div>

                {/* Won */}
                <div className="flex-1 bg-emerald-500/5 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-4 flex flex-col items-center gap-1.5 shadow-xl hover:bg-emerald-500/10 transition-colors">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 size={10} /> Won
                    </div>
                    <div className="text-xl font-black text-white">{stats?.totalCorrect}</div>
                </div>

                {/* Lost */}
                <div className="flex-1 bg-rose-500/5 backdrop-blur-md border border-rose-500/20 rounded-2xl p-4 flex flex-col items-center gap-1.5 shadow-xl hover:bg-rose-500/10 transition-colors">
                    <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1">
                        <XCircle size={10} /> Lost
                    </div>
                    <div className="text-xl font-black text-white">{stats?.totalWrong}</div>
                </div>

            </div>
          </div>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="p-5 space-y-8 -mt-2 relative z-20">
        
        {/* 2. Today's Pulse */}
        <div>
            <div className="flex items-center gap-2 mb-4 px-1">
                <Activity size={18} className="text-brand-600" />
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Today's Pulse</h3>
            </div>
            
            {/* Horizontal Slider */}
            <div className="flex overflow-x-auto hide-scrollbar gap-4 snap-x pb-4">
                
                {/* Card 1: Solved Today */}
                <div className="min-w-[150px] bg-white p-5 rounded-3xl border border-slate-100 snap-center shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] flex flex-col justify-between h-40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-brand-50 rounded-full blur-2xl -mr-6 -mt-6 transition-all group-hover:bg-brand-100"></div>
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-2 relative z-10 shadow-sm">
                        <CheckCircle2 size={24} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-wider">Solved Today</p>
                        <div className="flex items-baseline gap-1">
                            <p className="text-3xl font-black text-slate-900">{dailySolved}</p>
                            <span className="text-[10px] font-bold text-slate-400">Qs</span>
                        </div>
                    </div>
                </div>

                {/* Card 2: Accuracy */}
                <div className="min-w-[150px] bg-white p-5 rounded-3xl border border-slate-100 snap-center shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] flex flex-col justify-between h-40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full blur-2xl -mr-6 -mt-6 transition-all group-hover:bg-blue-100"></div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 relative z-10 shadow-sm">
                        <Target size={24} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-wider">Accuracy</p>
                        <p className="text-3xl font-black text-slate-900">{dailyAccuracy}%</p>
                    </div>
                </div>

                {/* Card 3: Avg Speed */}
                <div className="min-w-[150px] bg-white p-5 rounded-3xl border border-slate-100 snap-center shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] flex flex-col justify-between h-40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-full blur-2xl -mr-6 -mt-6 transition-all group-hover:bg-amber-100"></div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 relative z-10 shadow-sm">
                        <Clock size={24} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-wider">Avg Speed</p>
                        <div className="flex items-baseline gap-1">
                            <p className="text-3xl font-black text-slate-900">{stats?.dailyAvgTime}</p>
                            <span className="text-[10px] font-bold text-slate-400">sec</span>
                        </div>
                    </div>
                </div>

                {/* Card 4: Mistakes */}
                <div className="min-w-[150px] bg-white p-5 rounded-3xl border border-slate-100 snap-center shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] flex flex-col justify-between h-40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-rose-50 rounded-full blur-2xl -mr-6 -mt-6 transition-all group-hover:bg-rose-100"></div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2 relative z-10 shadow-sm">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-wider">Mistakes</p>
                        <p className="text-3xl font-black text-slate-900">{stats?.dailyWrong}</p>
                    </div>
                </div>

            </div>
        </div>

        {/* 3. Activity Graph (Correct Answers) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-brand-600" />
                <h3 className="font-bold text-slate-900 text-sm">Correct Answers</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">Last 7 Days</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.graphData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#0284c7" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Recent History */}
        <div className="pb-32">
          <div className="flex items-center gap-2 mb-4 px-1">
            <History size={18} className="text-brand-600" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent Sessions</h3>
          </div>
          
          <div className="space-y-3">
            {stats?.history.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed border-slate-100 rounded-3xl bg-white">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                        <History size={24} />
                    </div>
                    <p className="text-slate-400 text-xs font-medium">No recent tests found.</p>
                </div>
            ) : (
                stats?.history.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm active:scale-[0.99] transition-transform hover:shadow-md">
                    <div className="flex items-center gap-4">
                        {/* Dynamic Icon */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${getTestColor(item.type)} shadow-sm`}>
                           {getTestIcon(item.type)}
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                {item.subject}
                                <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider font-bold ${getTestTextColor(item.type)}`}>
                                    {item.type}
                                </span>
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-2">
                                <span>{new Date(item.date).toLocaleDateString()}</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span>{Math.floor(item.timeTaken / 60)}m {item.timeTaken % 60}s</span>
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="block font-black text-slate-900 text-lg">
                            {item.correct}/{item.totalQuestions}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Correct</span>
                    </div>
                </div>
                ))
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
};
