
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Profile } from '../types';

// Subject Icon Helper for Practice Screen
const SubjectIcon = ({ subject }: { subject: string }) => {
  const map: any = {
    'Physics': { icon: 'fa-atom', color: 'text-blue-500', bg: 'bg-blue-50' },
    'Chemistry': { icon: 'fa-flask', color: 'text-teal-500', bg: 'bg-teal-50' },
    'Maths': { icon: 'fa-calculator', color: 'text-indigo-500', bg: 'bg-indigo-50' },
    'Biology': { icon: 'fa-dna', color: 'text-rose-500', bg: 'bg-rose-50' },
    'Hindi': { icon: 'fa-om', color: 'text-orange-500', bg: 'bg-orange-50' },
    'English': { icon: 'fa-font', color: 'text-violet-500', bg: 'bg-violet-50' },
  };
  const style = map[subject] || { icon: 'fa-book', color: 'text-gray-500', bg: 'bg-gray-50' };
  return (
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${style.bg} mb-2 shadow-sm`}>
        <i className={`fa-solid ${style.icon} text-2xl ${style.color}`}></i>
    </div>
  );
};

// Practice Screen with Safe Area
export const PracticeScreen = ({ onSelectChapter, navigate, profile }: { onSelectChapter: (subject: string, chapter: string) => void, navigate: any, profile: Profile | null }) => {
    const [subjects, setSubjects] = useState<string[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedSubject = searchParams.get('subject');
    
    const [chapters, setChapters] = useState<{en: string, hi: string, count: number}[]>([]);
    const [loading, setLoading] = useState(false);
  
    useEffect(() => {
      api.getSubjects().then(setSubjects);
    }, []);
  
    useEffect(() => {
      if (selectedSubject) {
          setLoading(true);
          api.getChapterStats(selectedSubject).then(data => {
              setChapters(data);
              setLoading(false);
          });
      }
    }, [selectedSubject]);

    // Navigate back function for the UI button
    const handleBackClick = () => {
        navigate(-1);
    };

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header with Safe Area (pt-12) */}
            <div className="sticky top-0 z-30 px-5 pt-12 pb-3 bg-white flex justify-between items-center border-b border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={handleBackClick} className="text-gray-600 hover:text-gray-900 transition-colors p-1 -ml-1 rounded-full active:bg-gray-100">
                        <i className="fa-solid fa-chevron-left text-lg"></i>
                    </button>
                    <h2 className="text-xl font-black text-gray-900">
                        {selectedSubject || 'Practice'}
                    </h2>
                </div>
                <div className="flex items-center gap-1 text-brand-600 font-black">
                    <i className="fa-solid fa-bolt text-xs"></i>
                    <span>{profile?.weekly_xp || 0}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar p-5 pb-24 animate-fade-in">
                {!selectedSubject ? (
                    <>
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Select <span className="text-brand-600">Subject</span></h2>
                        <div className="grid grid-cols-2 gap-4">
                            {subjects.map(sub => (
                                <div key={sub} onClick={() => setSearchParams({ subject: sub })} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform hover:shadow-md hover:border-brand-200 group">
                                    <SubjectIcon subject={sub} />
                                    <span className="font-bold text-gray-700 text-sm group-hover:text-brand-600 transition-colors">{sub}</span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center p-10 text-gray-400 text-sm font-bold animate-pulse">Loading chapters...</div>
                        ) : (
                            chapters.map((chap, idx) => (
                                <div key={idx} onClick={() => onSelectChapter(selectedSubject, chap.en)} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-transform flex items-center justify-between cursor-pointer hover:border-brand-200 group">
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm group-hover:text-brand-600 transition-colors">
                                            {idx + 1}. {chap.en}
                                        </h4>
                                        {chap.hi && <p className="text-xs text-gray-400 mt-1 font-medium">{chap.hi}</p>}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                                        <i className="fa-solid fa-chevron-right text-xs"></i>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
