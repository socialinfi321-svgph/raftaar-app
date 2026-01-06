
import React from 'react';
import { Profile } from '../types';

// Exam Screen with Safe Area
export const ExamScreen = ({ showCS, profile, navigate }: { showCS: () => void, profile: Profile | null, navigate: any }) => {
    
    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header with Safe Area (pt-12) */}
            <div className="sticky top-0 z-30 px-5 pt-12 pb-3 bg-white flex justify-between items-center border-b border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-900 transition-colors p-1 -ml-1 rounded-full active:bg-gray-100">
                        <i className="fa-solid fa-chevron-left text-lg"></i>
                    </button>
                    <h2 className="text-xl font-black text-gray-900">Live Exam</h2>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                    <div className="flex items-center gap-1 text-brand-600 font-black">
                        <i className="fa-solid fa-bolt text-xs"></i>
                        <span>{profile?.weekly_xp || 0}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 pb-24 animate-slide-up">
                <div onClick={showCS} className="bg-white p-6 rounded-3xl border-l-4 border-l-purple-500 cursor-pointer shadow-sm hover:shadow-md transition relative overflow-hidden mb-4 border border-gray-100 group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <i className="fa-solid fa-clock text-6xl text-purple-600"></i>
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Scheduled</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">BSEB Physics Mega Mock</h3>
                        <p className="text-gray-500 text-xs mb-4">Full Syllabus • 3 Hours</p>
                        <button className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md">Register Now</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
