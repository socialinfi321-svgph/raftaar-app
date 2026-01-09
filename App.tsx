
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from './services/supabase';
import { api } from './services/api';
import { Profile, Question, TestSubmission } from './types';
import { TestInterface } from './components/TestInterface';
import { ShortsScreen } from './components/ShortsScreen';
import { InfinityPracticeModal } from './components/InfinityPracticeModal';
import { InfinityTestScreen } from './components/InfinityTestScreen'; 
import { PYQDashboard } from './components/PYQDashboard'; 
import { PYQSubjectiveScreen } from './components/PYQSubjectiveScreen'; 
import { LoginScreen } from './components/LoginScreen';
import { DashboardModal } from './components/DashboardModal';
import { AchievementsModal } from './components/AchievementsModal';
import { RewardsScreen } from './components/RewardsScreen';
import { HomeScreen } from './components/HomeScreen';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useBackHandler } from './hooks/useBackHandler';
import { useStatusBar } from './hooks/useStatusBar';

const RaftaarLogo = () => (
  <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg transform -rotate-3">
          <span className="text-white font-black text-xl font-sans">R</span>
      </div>
      <div className="font-black text-xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-800 to-brand-600">
          RAFTAAR
      </div>
  </div>
);

// Splash Screen
const SplashScreen = () => (
  <div className="h-[100dvh] flex flex-col items-center justify-center bg-white animate-fade-in">
    <div className="scale-150 mb-8 animate-bounce">
      <RaftaarLogo />
    </div>
    <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-6 animate-pulse">Initializing...</p>
  </div>
);

// Full Page Coming Soon
const FullPageComingSoon = ({ onClose, title, profile }: { onClose: () => void, title: string, profile: Profile | null }) => {
  return (
  <div className="h-full flex flex-col bg-white font-sans animate-fade-in">
    <div className="sticky top-0 z-50 px-5 pb-2 pt-safe-header bg-white flex justify-between items-center border-b border-gray-200 shadow-sm transition-all">
        <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors active:scale-95">
                <ArrowLeft size={20} />
            </button>
            <h2 className="text-xl font-black text-gray-900 tracking-tight truncate max-w-[200px]">{title}</h2>
        </div>
        <div className="flex items-center gap-1 text-brand-600 font-black">
             <i className="fa-solid fa-bolt text-xs"></i>
             <span>{profile?.weekly_xp || 0}</span>
        </div>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
        <div className="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-xl shadow-brand-100">
            <i className="fa-solid fa-rocket text-6xl text-brand-600"></i>
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">Coming Soon</h3>
        <p className="text-gray-500 max-w-xs mx-auto mb-10 leading-relaxed font-medium">
            We are crafting the <strong>{title}</strong> module for the Class of 2026. Excellence takes time.
        </p>
        <button onClick={onClose} className="bg-gray-900 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform w-full max-w-xs">
            Go Back
        </button>
    </div>
  </div>
)};

// Subject Icon Helper
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

// Exam Screen
const ExamScreen = ({ showCS, profile, navigate }: { showCS: () => void, profile: Profile | null, navigate: any }) => {
    useBackHandler(() => {
        navigate('/');
        return true;
    });

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="sticky top-0 z-50 px-5 pb-2 pt-safe-header bg-white flex justify-between items-center border-b border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/')} className="text-gray-600 hover:text-gray-900 transition-colors p-1 -ml-1 rounded-full active:bg-gray-100">
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

// Practice Screen
const PracticeScreen = ({ onSelectChapter, navigate, profile }: { onSelectChapter: (subject: string, chapter: string) => void, navigate: any, profile: Profile | null }) => {
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

    const handleAppBack = () => {
        if (selectedSubject) {
            setSearchParams({}, { replace: true }); 
            return true; 
        } else {
            navigate('/'); 
            return true; 
        }
    };

    useBackHandler(handleAppBack, true); 

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="sticky top-0 z-50 px-5 pb-2 pt-safe-header bg-white flex justify-between items-center border-b border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={handleAppBack} className="text-gray-600 hover:text-gray-900 transition-colors p-1 -ml-1 rounded-full active:bg-gray-100">
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
                                <div key={sub} onClick={() => setSearchParams({ subject: sub }, { replace: true })} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform hover:shadow-md hover:border-brand-200 group">
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

// Result Screen
const ResultScreen = ({ stats, onHome }: { stats: any, onHome: () => void }) => {
    if(!stats) return <div className="h-screen flex items-center justify-center">Loading Result...</div>;
    const score = stats.correct * 1; 
    return (
        <div className="h-[100dvh] overflow-y-auto bg-white p-6 animate-slide-up pb-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-brand-5 rounded-full flex items-center justify-center mb-6">
                <i className="fa-solid fa-trophy text-4xl text-brand-600"></i>
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Test Completed</h2>
            <p className="text-gray-500 font-medium mb-8">Great job! Here is your performance.</p>
            
            <div className="bg-gray-50 rounded-3xl p-8 w-full mb-8">
                <div className="text-6xl font-black mb-2 text-brand-600">{score}</div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Total Score</div>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><p className="text-2xl font-black text-green-600">{stats.correct}</p><p className="text-[10px] uppercase font-bold text-gray-400">Correct</p></div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><p className="text-2xl font-black text-red-500">{stats.wrong}</p><p className="text-[10px] uppercase font-bold text-gray-400">Wrong</p></div>
                </div>
            </div>
            
            <button onClick={onHome} className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] transition-transform">Return to Chapters</button>
        </div>
    );
};

// --- Main App Component ---
export default function App() {
  const [session, setSession] = useState<any>(null);
  const [isAppInitializing, setIsAppInitializing] = useState(true);
  
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [activeTestQuestions, setActiveTestQuestions] = useState<Question[]>([]);
  const [activeSubject, setActiveSubject] = useState<string>('');
  const [testStats, setTestStats] = useState<any>(null);
  const [comingSoonTitle, setComingSoonTitle] = useState('');
  
  // Infinity Practice State
  const [isInfinityOpen, setInfinityOpen] = useState(false);
  const [infinityConfig, setInfinityConfig] = useState<{subject: string, chapters: string[]} | null>(null);
  const [infinityInstantOpen, setInfinityInstantOpen] = useState(false);
  
  // PYQ Modal State
  const [isPYQOpen, setPYQOpen] = useState(false);
  const [pyqInitialTab, setPyqInitialTab] = useState<'objective' | 'subjective'>('objective');
  const [instantOpen, setInstantOpen] = useState(false); 
  
  // Dashboard & Achievements Modals State
  const [isDashboardOpen, setDashboardOpen] = useState(false);
  const [isAchievementsOpen, setAchievementsOpen] = useState(false);
  
  // Double Back to Exit State
  const [exitAttempted, setExitAttempted] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- 1. GLOBAL STATUS BAR MANAGEMENT ---
  useStatusBar();

  // --- DOUBLE BACK TO EXIT LOGIC ---
  useBackHandler(() => {
    if (location.pathname === '/' && !isInfinityOpen && !isPYQOpen && !isDashboardOpen && !isAchievementsOpen) {
        if (exitAttempted) {
            return false; // Exit app
        } else {
            setExitAttempted(true);
            setTimeout(() => setExitAttempted(false), 2000); 
            return true; 
        }
    }
    return false; 
  }, location.pathname === '/' && !isInfinityOpen && !isPYQOpen && !isDashboardOpen && !isAchievementsOpen);

  useEffect(() => {
    let mounted = true;
    const restoreSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted && session) {
            setSession(session);
            fetchProfile(session.user.id).catch(console.error);
        }
      } catch (error) {
        console.error("Session fail", error);
      } finally {
        if (mounted) setIsAppInitializing(false);
      }
    };
    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      if (session) fetchProfile(session.user.id).catch(console.error);
      else setUserProfile(null);
      setIsAppInitializing(false);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const mode = searchParams.get('mode');
    setInfinityOpen(mode === 'infinity');
  }, [searchParams]);

  useEffect(() => {
    if (location.state && (location.state as any).returnTo === 'infinity') {
      setInfinityInstantOpen(true);
      if (!searchParams.get('mode')) setSearchParams({ mode: 'infinity' }, { replace: true });
      window.history.replaceState({}, document.title);
    } else {
      setInfinityInstantOpen(false);
    }
  }, [location, searchParams, setSearchParams]);

  useEffect(() => {
    if (location.state && (location.state as any).openPYQ) {
        const state = location.state as any;
        setPyqInitialTab(state.tab || 'objective');
        setInstantOpen(true); 
        setPYQOpen(true);
        window.history.replaceState({}, document.title);
    } else {
        setInstantOpen(false); 
    }
  }, [location]);

  const fetchProfile = async (userId: string) => {
    const data = await api.getProfile(userId);
    if (!data) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const fullName = user?.user_metadata?.full_name || 'Student';
            const avatarUrl = user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
            const newProfile = await api.createProfile(userId, fullName, avatarUrl);
            if (newProfile) setUserProfile(newProfile);
        }
    } else {
        setUserProfile(data);
    }
  };

  const handleStartTest = async (subject: string, chapterEn: string) => {
    const qs = await api.getQuestionsByChapter(subject, chapterEn);
    if (qs.length > 0) {
      setActiveSubject(subject);
      setActiveTestQuestions(qs);
      navigate('/test');
    } else {
      setComingSoonTitle(`${subject} - ${chapterEn}`);
      navigate('/coming-soon');
    }
  };

  const handleTestComplete = async (stats: any) => {
    setTestStats(stats);
    if (session?.user?.id) {
        const submission: TestSubmission = {
            userId: session.user.id,
            subject: activeSubject || 'Practice',
            testType: 'Practice',
            totalQuestions: stats.correct + stats.wrong + stats.skipped,
            correct: stats.correct,
            wrong: stats.wrong,
            skipped: stats.skipped,
            timeTaken: stats.totalTime,
            date: new Date().toISOString()
        };
        await api.submitTestResult(submission);
        await fetchProfile(session.user.id); 
    }
    navigate('/results', { replace: true });
  };

  const handleInfinitySubjectUpdate = (sub: string | null) => {
      const newParams: any = { mode: 'infinity' };
      if (sub) newParams.subject = sub;
      setSearchParams(newParams, { replace: true });
  };

  if (isAppInitializing) return <SplashScreen />;
  if (!session) return <LoginScreen onLoginSuccess={(s) => { setSession(s); navigate('/', { replace: true }); }} />;

  const NavIcon = ({ icon, label, target }: { icon: string, label: string, target: string }) => {
      const isActive = location.pathname === target || (target !== '/' && location.pathname.startsWith(target));
      return (
        <button onClick={() => navigate(target)} className={`flex flex-col items-center justify-center w-16 gap-0.5 transition-all ${isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <i className={`fa-solid ${icon} text-lg mb-0.5`}></i>
            <span className="text-[10px] font-bold tracking-wide leading-none">{label}</span>
            <div className={`w-1 h-1 rounded-full mt-0.5 transition-opacity ${isActive ? 'bg-brand-600 opacity-100' : 'opacity-0'}`}></div>
        </button>
      )
  };

  const showNav = ['/', '/practice', '/rewards', '/profile', '/exam'].includes(location.pathname);
  const showTopHeader = location.pathname === '/';

  return (
    <div className="max-w-md mx-auto h-[100dvh] flex flex-col bg-[#f8faff] font-sans relative shadow-2xl overflow-hidden text-gray-900">
        
        {showTopHeader && (
            <div className="px-5 pb-1 pt-safe-header bg-gray-50 flex justify-between items-center sticky top-0 z-30 border-b border-gray-200 shadow-sm transition-all">
                <div className="flex items-center gap-2"><RaftaarLogo /></div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Weekly XP</span>
                        <div className="flex items-center gap-1 text-brand-600 font-black">
                             <i className="fa-solid fa-bolt text-xs"></i>
                             <span>{userProfile?.weekly_xp || 0}</span>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-white p-0.5 border border-gray-200 cursor-pointer shadow-sm" onClick={() => setDashboardOpen(true)}>
                        <img src={userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`} className="w-full h-full rounded-full" alt="User" />
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto hide-scrollbar relative z-10">
            <AnimatePresence>
                <Routes location={location} key={location.pathname}>
                    <Route 
                        path="/" 
                        element={
                            <HomeScreen 
                                profile={userProfile} 
                                setComingSoonTitle={(t) => { setComingSoonTitle(t); navigate('/coming-soon'); }} 
                                onOpenInfinity={() => setSearchParams({ mode: 'infinity' }, { replace: true })} 
                                onOpenPYQ={() => { setInstantOpen(false); setPyqInitialTab('objective'); setPYQOpen(true); }}
                                onOpenDashboard={() => setDashboardOpen(true)}
                                onOpenAchievements={() => setAchievementsOpen(true)}
                                navigate={navigate} 
                            />
                        } 
                    />
                    <Route path="/practice" element={<PracticeScreen onSelectChapter={handleStartTest} navigate={navigate} profile={userProfile} />} />
                    <Route path="/exam" element={<ExamScreen showCS={() => { setComingSoonTitle('BSEB Physics Mega Mock'); navigate('/coming-soon'); }} profile={userProfile} navigate={navigate} />} />
                    <Route path="/rewards" element={<RewardsScreen profile={userProfile} session={session} navigate={navigate} />} />
                    
                    <Route 
                        path="/pyq-test" 
                        element={
                            <InfinityTestScreen 
                                userId={session?.user?.id} 
                                subject={new URLSearchParams(location.search).get('subject') || ''} 
                                isPYQ={true} 
                                pyqYear={parseInt(new URLSearchParams(location.search).get('year') || '0')} 
                                onExit={() => { 
                                    if(session?.user?.id) fetchProfile(session.user.id); 
                                    // Navigate back to Home but with state to re-open PYQ modal at Objective tab
                                    navigate('/', { replace: true, state: { openPYQ: true, tab: 'objective' } });
                                }} 
                                defaultLanguage={userProfile?.exam_language}
                            />
                        } 
                    />
                    <Route 
                        path="/pyq-learn" 
                        element={
                            <PYQSubjectiveScreen 
                                subject={new URLSearchParams(location.search).get('subject') || ''} 
                                year={parseInt(new URLSearchParams(location.search).get('year') || '0')} 
                                onExit={() => navigate('/', { replace: true, state: { openPYQ: true, tab: 'subjective' } })}
                                defaultLanguage={userProfile?.exam_language} 
                            />
                        } 
                    />
                    
                    <Route path="/shorts" element={<ShortsScreen profile={userProfile} session={session} navigate={navigate} onInteractionSubmit={async (qId, isCorrect, isLiked, time) => { if (session?.user?.id) { await api.submitShortsInteraction(session.user.id, qId, isCorrect, isLiked, time); fetchProfile(session.user.id); } }} />} />
                    
                    <Route 
                        path="/results" 
                        element={
                            <ResultScreen 
                                stats={testStats} 
                                onHome={() => {
                                    if (activeSubject) {
                                        navigate(`/practice?subject=${activeSubject}`, { replace: true });
                                    } else {
                                        // For Modal based tests, go home, state will handle re-opening if needed (logic specific to modal types)
                                        navigate('/', { replace: true, state: { openPYQ: true, tab: 'objective' } });
                                    }
                                }} 
                            />
                        } 
                    />
                    
                    <Route 
                        path="/test" 
                        element={
                            <TestInterface 
                                questions={activeTestQuestions} 
                                subjectName={activeSubject} 
                                userId={session?.user?.id} 
                                onExit={() => {
                                    // Fix: Explicitly navigate to the previous context instead of relying on history stack (-1)
                                    // which might be polluted by the back handler trap.
                                    if (activeSubject) {
                                        navigate(`/practice?subject=${encodeURIComponent(activeSubject)}`, { replace: true });
                                    } else {
                                        navigate('/', { replace: true });
                                    }
                                }} 
                                onComplete={handleTestComplete} 
                                onAnswerSubmit={async (qId, opt, correct, timeTaken) => { await api.submitAnswer(session.user.id, qId, opt, correct, timeTaken); }} 
                                defaultLanguage={userProfile?.exam_language}
                            />
                        } 
                    />
                    <Route 
                        path="/infinity-test" 
                        element={
                            infinityConfig ? 
                            <InfinityTestScreen 
                                userId={session.user.id} 
                                subject={infinityConfig.subject} 
                                selectedChapters={infinityConfig.chapters} 
                                onExit={async () => { 
                                    if(session?.user?.id) await fetchProfile(session.user.id); 
                                    // Return to Home with Infinity Modal open logic
                                    const subjectParam = infinityConfig?.subject ? `&subject=${encodeURIComponent(infinityConfig.subject)}` : '';
                                    navigate(`/?mode=infinity${subjectParam}`, { replace: true, state: { returnTo: 'infinity' } });
                                }} 
                                defaultLanguage={userProfile?.exam_language}
                            /> : 
                            <div className="p-10 text-center">Loading...</div>
                        } 
                    />
                    <Route 
                        path="/coming-soon" 
                        element={
                            <FullPageComingSoon 
                                title={comingSoonTitle} 
                                onClose={() => navigate(-1)} 
                                profile={userProfile}
                            />
                        } 
                    />
                </Routes>
            </AnimatePresence>
        </div>

        <InfinityPracticeModal 
            isOpen={isInfinityOpen} 
            onClose={() => setSearchParams({}, { replace: true })} 
            userId={session?.user?.id}
            initialSubject={searchParams.get('subject')}
            onUpdateSubject={handleInfinitySubjectUpdate}
            instantOpen={infinityInstantOpen}
            onStartSession={(subject, chapters) => { 
                setInfinityConfig({ subject, chapters }); 
                navigate('/infinity-test'); 
            }} 
        />
        
        <PYQDashboard 
            isOpen={isPYQOpen}
            initialTab={pyqInitialTab}
            instantOpen={instantOpen}
            onClose={() => setPYQOpen(false)}
            onSelectYear={async (subject, year, type) => { 
                setPYQOpen(false); 
                if (type === 'objective') { 
                    navigate(`/pyq-test?subject=${subject}&year=${year}`); 
                } else { 
                    navigate(`/pyq-learn?subject=${subject}&year=${year}`); 
                } 
            }} 
        />

        <DashboardModal 
            isOpen={isDashboardOpen} 
            onBack={() => setDashboardOpen(false)} 
            userId={session?.user?.id}
            profile={userProfile}
        />

        <AchievementsModal 
            isOpen={isAchievementsOpen} 
            onBack={() => setAchievementsOpen(false)}
            profile={userProfile}
        />

        <AnimatePresence>
            {exitAttempted && (
                <motion.div 
                    initial={{ y: 50, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 50, opacity: 0, scale: 0.95 }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white text-gray-900 px-6 py-3 rounded-full text-sm font-bold shadow-lg z-[60] border border-gray-100 flex items-center gap-2 pb-safe"
                >
                    <div className="w-2 h-2 bg-gray-900 rounded-full animate-pulse"></div>
                    Press back again to exit
                </motion.div>
            )}
        </AnimatePresence>

        {showNav && (
            <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 flex justify-around py-2 pb-safe-offset-2 z-40 shadow-lg">
                <div className="pb-safe flex w-full justify-around pt-2">
                    <NavIcon icon="fa-house" label="Home" target="/" />
                    <NavIcon icon="fa-book-open" label="Practice" target="/practice" />
                    <NavIcon icon="fa-file-signature" label="Exam" target="/exam" />
                    <NavIcon icon="fa-trophy" label="Rewards" target="/rewards" />
                </div>
            </div>
        )}
    </div>
  );
}
