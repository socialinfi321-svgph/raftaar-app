
import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { api } from '../services/api';

interface ShortsScreenProps {
  profile: any;
  session: any;
  navigate: (path: string) => void;
  onInteractionSubmit: (questionId: number, isCorrect: boolean, isLiked: boolean, timeSpentSeconds: number) => Promise<void>;
}

export const ShortsScreen: React.FC<ShortsScreenProps> = ({ profile, session, navigate, onInteractionSubmit }) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // Function to load a new question
  const loadNewQuestion = async () => {
    setLoading(true);
    const question = await api.getRandomQuestion();
    setCurrentQuestion(question);
    setLoading(false);
    setQuestionStartTime(Date.now());
  };

  useEffect(() => {
    loadNewQuestion();
  }, []);

  const handleSwipe = async (isLiked: boolean) => {
    if (!currentQuestion) return;

    const timeSpentSeconds = Math.floor((Date.now() - questionStartTime) / 1000);
    const isCorrect = false; 
    
    await onInteractionSubmit(currentQuestion.id, isCorrect, isLiked, timeSpentSeconds);
    
    // Load next question
    await loadNewQuestion();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-600 rounded-full animate-spin border-t-transparent"></div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <p className="text-gray-400 text-center">No questions available</p>
        <button 
          onClick={() => navigate('/')} 
          className="mt-4 bg-brand-600 text-white px-6 py-2 rounded-xl font-bold"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with Safe Area (pt-16) */}
      <div className="sticky top-0 z-30 px-5 pt-16 pb-3 bg-white flex justify-between items-center border-b border-gray-200 shadow-sm">
        <h2 className="text-xl font-black text-gray-900">Shorts</h2>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white p-0.5 border border-gray-200 cursor-pointer shadow-sm" onClick={() => navigate('/profile')}>
            <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.user?.email || 'user'}`} className="w-full h-full rounded-full" alt="User" />
          </div>
        </div>
      </div>

      {/* Question Content Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-6 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-4">
            <span className="text-xs text-brand-600 bg-brand-50 px-2 py-1 rounded font-bold uppercase tracking-wider">{currentQuestion.subject}</span>
          </div>
          
          <p className="text-xl font-bold text-gray-900 mb-6 leading-relaxed">
            {currentQuestion.question_text_en}
          </p>
          
          {/* Options Display (Static for Shorts view) */}
          <div className="space-y-2 mb-8 opacity-80">
             <div className="p-3 border border-gray-100 rounded-lg text-sm text-gray-600">A. {currentQuestion.option_a_en}</div>
             <div className="p-3 border border-gray-100 rounded-lg text-sm text-gray-600">B. {currentQuestion.option_b_en}</div>
             <div className="p-3 border border-gray-100 rounded-lg text-sm text-gray-600">C. {currentQuestion.option_c_en}</div>
             <div className="p-3 border border-gray-100 rounded-lg text-sm text-gray-600">D. {currentQuestion.option_d_en}</div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-6 justify-center mt-4">
            <button
              onClick={() => handleSwipe(false)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 border border-red-100 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <i className="fa-solid fa-xmark text-2xl"></i>
              </div>
              <span className="text-xs font-bold text-gray-400">Skip</span>
            </button>
            
            <button
              onClick={() => handleSwipe(true)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 border border-green-100 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <i className="fa-solid fa-heart text-2xl"></i>
              </div>
              <span className="text-xs font-bold text-gray-400">Like</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
