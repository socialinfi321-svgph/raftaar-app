
import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const NoInternetScreen = () => {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center animate-fade-in transition-colors">
      <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 animate-pulse border border-red-100 dark:border-red-900/30">
        <WifiOff size={40} className="text-red-500 dark:text-red-400" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No Connection</h2>
      <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 max-w-[250px] mx-auto leading-relaxed text-sm">
        It seems you are offline. Check your internet settings.
      </p>
      <button 
        onClick={() => window.location.reload()} 
        className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3.5 rounded-xl font-bold shadow-xl shadow-slate-900/20 hover:scale-105 transition-transform active:scale-95"
      >
        <RefreshCw size={18} />
        Retry
      </button>
    </div>
  );
};
