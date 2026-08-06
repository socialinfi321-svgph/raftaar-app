import React, { useState } from 'react';
import { ArrowLeft, Search, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { Profile } from '../types';

interface KhazanaScreenProps {
  profile: Profile | null;
  navigate: any;
}

export const KhazanaScreen: React.FC<KhazanaScreenProps> = ({ profile, navigate }) => {
  const [activeFilter, setActiveFilter] = useState('12th Board');
  const filters = ['10th Board', '12th Board'];

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] text-[#101828] overflow-hidden font-sans selection:bg-[#3A5643]/20 relative">

      {/* Top Header */}
      <div className="relative z-50 px-4 pt-safe-header pb-3 flex justify-between items-center bg-white border-b border-[#EAECF0] shadow-sm">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1 -ml-1 active:scale-90 transition-transform">
                <ArrowLeft size={24} className="text-[#101828]" />
            </button>
            <span className="font-bold text-[22px] text-[#101828] tracking-tight">Khazana</span>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="w-5 h-5 bg-[#6941C6] rounded-full flex items-center justify-center">
               <span className="text-[9px] font-bold text-white tracking-wider">XP</span>
            </div>
            <span className="text-sm font-bold text-[#101828]">{profile?.weekly_xp || 0}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-[calc(6rem+env(safe-area-inset-bottom))] relative z-10">
        
        {/* Decorative Header Area */}
        <div className="w-full relative mt-2">
           <img 
              src="https://res.cloudinary.com/dtygcxcr1/image/upload/v1786012541/khazana_hero_section_ht6dpl.png" 
              alt="Khazana Header" 
              className="w-full h-auto object-cover object-top pointer-events-none"
              style={{ maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)' }}
           />
        </div>

        <div className="px-4 space-y-5 pb-6 max-w-lg mx-auto relative z-20 -mt-2">
          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search size={20} className="text-[#98A2B3]" />
            </div>
            <input 
              type="text" 
              placeholder="Search for a teacher or concept" 
              className="w-full bg-white border border-[#EAECF0] text-[#101828] placeholder-[#98A2B3] rounded-[16px] py-3.5 pl-11 pr-4 focus:outline-none focus:ring-1 focus:ring-[#3A5643] focus:border-[#3A5643] transition-all text-[14px] shadow-[0_1px_4px_rgba(16,24,40,0.04)]"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2.5 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
            <button className="flex-shrink-0 w-[34px] h-[34px] bg-white border border-[#EAECF0] rounded-[10px] flex items-center justify-center text-[#475467] active:scale-95 transition-transform shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
               <SlidersHorizontal size={16} />
            </button>
            {filters.map(filter => (
              <button 
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex-shrink-0 px-3.5 h-[34px] rounded-[10px] text-[12px] font-semibold transition-all active:scale-95 shadow-[0_1px_4px_rgba(16,24,40,0.04)] ${
                  activeFilter === filter 
                    ? 'bg-[#3A5643] text-white border border-[#3A5643]' 
                    : 'bg-white text-[#344054] border border-[#EAECF0] hover:bg-gray-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 gap-4">
             {/* Upcoming Tests Card */}
             <div className="bg-white border border-[#EAECF0] rounded-[16px] p-4 active:scale-95 transition-transform cursor-pointer shadow-[0_4px_12px_rgba(16,24,40,0.03)] flex flex-col relative h-[130px]">
                <div className="w-9 h-9 bg-[#F0F4F1] rounded-[10px] flex items-center justify-center mb-2.5 text-[#3A5643]">
                   {/* Custom Calendar SVG */}
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                      <circle cx="9" cy="15" r="1.5" fill="currentColor" stroke="none"></circle>
                      <circle cx="15" cy="15" r="1.5" fill="currentColor" stroke="none"></circle>
                      <path d="M10 18c1 1 3 1 4 0"></path>
                   </svg>
                </div>
                <h4 className="font-bold text-[14px] text-[#101828] leading-tight mb-1">Upcoming Tests</h4>
                <p className="text-[12px] text-[#667085] leading-[1.4] pr-4">Stay updated with your schedule</p>
                <div className="absolute bottom-4 right-4 w-7 h-7 bg-[#F0F4F1] rounded-full flex items-center justify-center">
                    <ChevronRight size={16} className="text-[#3A5643]" />
                </div>
             </div>

             {/* AI Quiz Card */}
             <div className="bg-white border border-[#EAECF0] rounded-[16px] p-4 active:scale-95 transition-transform cursor-pointer shadow-[0_4px_12px_rgba(16,24,40,0.03)] flex flex-col relative h-[130px]">
                <div className="w-9 h-9 bg-[#F0F4F1] rounded-[10px] flex items-center justify-center mb-2.5 text-[#3A5643]">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                       <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                       <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
                   </svg>
                </div>
                <h4 className="font-bold text-[14px] text-[#101828] leading-tight mb-1">AI Quiz</h4>
                <p className="text-[12px] text-[#667085] leading-[1.4] pr-4">Practice Daily Quizzes!</p>
                <div className="absolute bottom-4 right-4 w-7 h-7 bg-[#F0F4F1] rounded-full flex items-center justify-center">
                    <ChevronRight size={16} className="text-[#3A5643]" />
                </div>
             </div>
          </div>

          {/* Chalkboard Banner */}
          <div className="w-full h-[140px] rounded-[16px] overflow-hidden relative shadow-[0_4px_12px_rgba(16,24,40,0.05)] mt-2">
              {/* Fallback color matching chalkboard */}
              <div className="absolute inset-0 bg-[#35483A]"></div>
              <img src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50" alt="Chalkboard Math" />
              {/* Hand-drawn math SVG overlay to make it look more like the screenshot */}
              <div className="absolute inset-0 opacity-80 mix-blend-screen pointer-events-none">
                  <svg width="100%" height="100%" viewBox="0 0 400 140" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 20 L 100 20 M 60 20 L 60 100" />
                      <circle cx="60" cy="60" r="30" />
                      <path d="M60 60 L 81 81" />
                      
                      <path d="M120 70 L 200 70" />
                      <path d="M120 70 C 140 40 180 40 200 70 C 220 100 260 100 280 70" />
                      <path d="M160 20 L 160 120" />
                      
                      <text x="70" y="55" fill="rgba(255,255,255,0.7)" fontSize="10" stroke="none">α</text>
                      <text x="165" y="65" fill="rgba(255,255,255,0.7)" fontSize="10" stroke="none">x</text>
                      <text x="150" y="30" fill="rgba(255,255,255,0.7)" fontSize="10" stroke="none">y</text>

                      <path d="M250 40 L 330 40 L 330 100 L 250 100 Z" />
                      <path d="M250 100 L 330 40" />

                      <text x="340" y="30" fill="rgba(255,255,255,0.7)" fontSize="8" stroke="none">E = mc²</text>
                      <text x="340" y="50" fill="rgba(255,255,255,0.7)" fontSize="8" stroke="none">F = m*a</text>
                      <text x="340" y="70" fill="rgba(255,255,255,0.7)" fontSize="8" stroke="none">v = u + at</text>
                      <text x="340" y="90" fill="rgba(255,255,255,0.7)" fontSize="8" stroke="none">s = ut + ½at²</text>
                  </svg>
              </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

