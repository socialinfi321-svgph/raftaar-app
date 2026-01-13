
import React from 'react';

export const NoInternetScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-fade-in font-sans select-none transition-colors duration-300">
      
      {/* Graphics Container */}
      <div className="relative w-full max-w-[300px] aspect-square flex items-center justify-center mb-[-20px]">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
             {/* Left Arcs */}
             <path d="M50 100 C 50 70, 70 50, 100 50" stroke="#2563eb" strokeWidth="12" strokeLinecap="round" className="dark:stroke-blue-500" />
             <path d="M30 120 C 30 60, 60 30, 120 30" stroke="#2563eb" strokeWidth="12" strokeLinecap="round" opacity="0.5" className="dark:stroke-blue-500" />
             
             {/* Dot Area */}
             <circle cx="60" cy="110" r="8" fill="#2563eb" className="dark:fill-blue-500" />
             <circle cx="60" cy="110" r="25" stroke="#2563eb" strokeWidth="2" opacity="0.3" className="dark:stroke-blue-500" />

             {/* The Cross X */}
             <line x1="120" y1="40" x2="160" y2="80" stroke="#2563eb" strokeWidth="12" strokeLinecap="round" className="dark:stroke-blue-500" />
             <line x1="160" y1="40" x2="120" y2="80" stroke="#2563eb" strokeWidth="12" strokeLinecap="round" className="dark:stroke-blue-500" />
          </svg>
      </div>

      {/* "Oops!" Text - Outlined */}
      <h1 className="text-7xl font-black tracking-tighter mb-6 relative z-10 select-none" 
          style={{ 
             color: 'transparent',
             WebkitTextStroke: '2px #2563eb', // Blue-600
          }}>
        Oops!
      </h1>

      {/* Heading */}
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
        No internet connection!
      </h2>

      {/* Description */}
      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto font-medium">
        Something went wrong. Try refreshing the page or checking your internet connection.
        <br/><span className="mt-2 block">We'll see you in a moment!</span>
      </p>

      {/* Retry Button */}
      <button 
        onClick={() => window.location.reload()} 
        className="mt-8 px-10 py-3.5 bg-blue-600 dark:bg-blue-500 text-white rounded-full font-bold shadow-xl shadow-blue-600/30 dark:shadow-blue-900/30 hover:scale-105 active:scale-95 transition-all"
      >
        Try Again
      </button>
    </div>
  );
};
