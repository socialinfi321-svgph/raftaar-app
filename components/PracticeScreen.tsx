import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Atom, FlaskConical, Calculator, Dna, BookOpen, Languages, ChevronRight, Play, CheckCircle2, Sparkles } from 'lucide-react';
import { Profile } from '../types';
import { api } from '../services/api';
import { useBackHandler } from '../hooks/useBackHandler';

interface PracticeScreenProps {
  onSelectChapter: (subject: string, chapterEn: string) => void;
  navigate: (path: string, options?: any) => void;
  profile: Profile | null;
}

interface SubjectItem {
  id: string;
  name: string;
  hiName: string;
  icon: any;
  color: string;
  bgGradient: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

const SUBJECTS_DATA: SubjectItem[] = [
  {
    id: 'Physics',
    name: 'Physics',
    hiName: 'भौतिक विज्ञान',
    icon: Atom,
    color: 'text-blue-500 dark:text-blue-400',
    bgGradient: 'from-blue-600 to-indigo-700',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60',
    badgeText: 'text-blue-700 dark:text-blue-300',
    description: 'Electric Charges, Magnetism, Optics & Modern Physics'
  },
  {
    id: 'Chemistry',
    name: 'Chemistry',
    hiName: 'रसायन विज्ञान',
    icon: FlaskConical,
    color: 'text-teal-500 dark:text-teal-400',
    bgGradient: 'from-teal-600 to-emerald-700',
    badgeBg: 'bg-teal-100 dark:bg-teal-950/60',
    badgeText: 'text-teal-700 dark:text-teal-300',
    description: 'Physical, Inorganic & Organic Chemistry'
  },
  {
    id: 'Maths',
    name: 'Maths',
    hiName: 'गणित',
    icon: Calculator,
    color: 'text-indigo-500 dark:text-indigo-400',
    bgGradient: 'from-indigo-600 to-blue-700',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950/60',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    description: 'Calculus, Vectors, Matrices & Probability'
  },
  {
    id: 'Biology',
    name: 'Biology',
    hiName: 'जीव विज्ञान',
    icon: Dna,
    color: 'text-rose-500 dark:text-rose-400',
    bgGradient: 'from-rose-600 to-pink-700',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    description: 'Reproduction, Genetics, Evolution & Ecology'
  },
  {
    id: 'Hindi',
    name: 'Hindi',
    hiName: 'हिन्दी (100 Marks)',
    icon: Languages,
    color: 'text-amber-500 dark:text-amber-400',
    bgGradient: 'from-amber-600 to-orange-700',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
    description: 'गद्य खण्ड, पद्य खण्ड एवं हिन्दी व्याकरण'
  },
  {
    id: 'English',
    name: 'English',
    hiName: 'English (100 Marks)',
    icon: BookOpen,
    color: 'text-purple-500 dark:text-purple-400',
    bgGradient: 'from-purple-600 to-violet-700',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/60',
    badgeText: 'text-purple-700 dark:text-purple-300',
    description: 'Prose, Poetry, Story of English & Grammar'
  }
];

// Fallback standard chapters for Bihar Board Class 12
const FALLBACK_CHAPTERS: Record<string, { en: string; hi: string }[]> = {
  Physics: [
    { en: 'Electric Charges and Fields', hi: 'वैद्युत आवेश तथा क्षेत्र' },
    { en: 'Electrostatic Potential and Capacitance', hi: 'स्थिरवैद्युत विभव तथा धारिता' },
    { en: 'Current Electricity', hi: 'विद्युत धारा' },
    { en: 'Moving Charges and Magnetism', hi: 'गतिमान आवेश और चुंबकत्व' },
    { en: 'Magnetism and Matter', hi: 'चुंबकत्व एवं द्रव्य' },
    { en: 'Electromagnetic Induction', hi: 'वैद्युतचुंबकीय प्रेरण' },
    { en: 'Alternating Current', hi: 'प्रत्यावर्ती धारा' },
    { en: 'Electromagnetic Waves', hi: 'वैद्युतचुंबकीय तरंगें' },
    { en: 'Ray Optics and Optical Instruments', hi: 'किरण प्रकाशिकी एवं प्रकाशिक यंत्र' },
    { en: 'Wave Optics', hi: 'तरंग-प्रकाशिकी' },
    { en: 'Dual Nature of Radiation and Matter', hi: 'विकिरण तथा द्रव्य की द्वैत प्रकृति' },
    { en: 'Atoms', hi: 'परमाणु' },
    { en: 'Nuclei', hi: 'नाभिक' },
    { en: 'Semiconductor Electronics', hi: 'अर्धचालक इलेक्ट्रॉनिकी' }
  ],
  Chemistry: [
    { en: 'Solutions', hi: 'विलयन' },
    { en: 'Electrochemistry', hi: 'वैद्युतरसायन' },
    { en: 'Chemical Kinetics', hi: 'रासायनिक बलगतिकी' },
    { en: 'd and f Block Elements', hi: 'd-एवं f-ब्लॉक के तत्व' },
    { en: 'Coordination Compounds', hi: 'उपसहसंयोजन यौगिक' },
    { en: 'Haloalkanes and Haloarenes', hi: 'हैलोएल्केन तथा हैलोएरीन' },
    { en: 'Alcohols, Phenols and Ethers', hi: 'ऐल्कोहॉल, फीनॉल एवं ईथर' },
    { en: 'Aldehydes, Ketones and Carboxylic Acids', hi: 'ऐल्डिहाइड, कीटोन एवं कार्बोक्सिलिक अम्ल' },
    { en: 'Amines', hi: 'ऐमीन' },
    { en: 'Biomolecules', hi: 'जैव-अणु' }
  ],
  Maths: [
    { en: 'Relations and Functions', hi: 'संबंध एवं फलन' },
    { en: 'Inverse Trigonometric Functions', hi: 'प्रतिलोम त्रिकोणमितीय फलन' },
    { en: 'Matrices', hi: 'आव्यूह' },
    { en: 'Determinants', hi: 'सारणिक' },
    { en: 'Continuity and Differentiability', hi: 'सांतत्य तथा अवकलनीयता' },
    { en: 'Application of Derivatives', hi: 'अवकलज के अनुप्रयोग' },
    { en: 'Integrals', hi: 'समाकलन' },
    { en: 'Application of Integrals', hi: 'समाकलनों के अनुप्रयोग' },
    { en: 'Differential Equations', hi: 'अवकल समीकरण' },
    { en: 'Vector Algebra', hi: 'सदिश बीजगणित' },
    { en: 'Three Dimensional Geometry', hi: 'त्रिविमीय ज्यामिति' },
    { en: 'Linear Programming', hi: 'रैखिक प्रोग्रामन' },
    { en: 'Probability', hi: 'प्रायिकता' }
  ],
  Biology: [
    { en: 'Sexual Reproduction in Flowering Plants', hi: 'पुष्पी पादपों में लैंगिक प्रजनन' },
    { en: 'Human Reproduction', hi: 'मानव जनन' },
    { en: 'Reproductive Health', hi: 'जनन स्वास्थ्य' },
    { en: 'Principles of Inheritance and Variation', hi: 'वंशागति तथा विविधता के सिद्धांत' },
    { en: 'Molecular Basis of Inheritance', hi: 'वंशागति का आणविक आधार' },
    { en: 'Evolution', hi: 'विकास' },
    { en: 'Human Health and Disease', hi: 'मानव स्वास्थ्य तथा रोग' },
    { en: 'Microbes in Human Welfare', hi: 'मानव कल्याण में सूक्ष्मजीव' },
    { en: 'Biotechnology: Principles and Processes', hi: 'जैव प्रौद्योगिकी - सिद्धांत व प्रक्रम' },
    { en: 'Biotechnology and its Applications', hi: 'जैव प्रौद्योगिकी एवं उसके उपयोग' },
    { en: 'Organisms and Populations', hi: 'जीव और समष्टियाँ' },
    { en: 'Ecosystem', hi: 'पारितंत्र' },
    { en: 'Biodiversity and Conservation', hi: 'जैव विविधता एवं संरक्षण' }
  ],
  Hindi: [
    { en: 'Baatchit', hi: 'बातचीत (बालकृष्ण भट्ट)' },
    { en: 'Usne Kaha Tha', hi: 'उसने कहा था (चन्द्रधर शर्मा गुलेरी)' },
    { en: 'Sampurna Kranti', hi: 'संपूर्ण क्रांति (जयप्रकाश नारायण)' },
    { en: 'Ardhanarishwar', hi: 'अर्धनारीश्वर (रामधारी सिंह दिनकर)' },
    { en: 'Roj', hi: 'रोज (सच्चिदानंद हीरानंद वात्स्यायन अज्ञेय)' },
    { en: 'Ek Lekh Aur Ek Patra', hi: 'एक लेख और एक पत्र (भगत सिंह)' },
    { en: 'O Sadanira', hi: 'ओ सदानीरा (जगदीशचंद्र माथुर)' },
    { en: 'Sipahi Ki Maa', hi: 'सिपाही की माँ (मोहन राकेश)' }
  ],
  English: [
    { en: 'Indian Civilization and Culture', hi: 'Indian Civilization and Culture (M. Gandhi)' },
    { en: 'Bharat is My Home', hi: 'Bharat is My Home (Dr. Zakir Hussain)' },
    { en: 'A Pinch of Snuff', hi: 'A Pinch of Snuff (Manohar Malgonkar)' },
    { en: 'I Have a Dream', hi: 'I Have a Dream (Martin Luther King Jr.)' },
    { en: 'Ideas That Have Helped Mankind', hi: 'Ideas That Have Helped Mankind (B. Russell)' },
    { en: 'The Artist', hi: 'The Artist (Shiga Naoya)' },
    { en: 'A Child is Born', hi: 'A Child is Born (Germaine Greer)' },
    { en: 'How Free is the Press', hi: 'How Free is the Press (Dorothy L. Sayers)' },
    { en: 'The Earth', hi: 'The Earth (H. E. Bates)' }
  ]
};

export const PracticeScreen: React.FC<PracticeScreenProps> = ({ onSelectChapter, navigate, profile }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSubject = searchParams.get('subject');

  const [selectedSubject, setSelectedSubject] = useState<string | null>(urlSubject || null);
  const [chapters, setChapters] = useState<{ en: string; hi: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync selectedSubject with URL param
  useEffect(() => {
    setSelectedSubject(urlSubject || null);
  }, [urlSubject]);

  // Hardware/System back button handling
  useBackHandler(() => {
    if (selectedSubject) {
      handleBackToSubjects();
      return true;
    }
    navigate('/');
    return true;
  });

  // Fetch chapters when a subject is selected
  useEffect(() => {
    if (!selectedSubject) {
      setChapters([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const loadChapters = async () => {
      try {
        const data = await api.getChapterStats(selectedSubject);
        if (!isMounted) return;

        if (data && data.length > 0) {
          setChapters(data);
        } else {
          // If no questions yet in database, load default syllabus chapters
          const fallback = FALLBACK_CHAPTERS[selectedSubject] || [];
          setChapters(fallback.map(c => ({ en: c.en, hi: c.hi, count: 0 })));
        }
      } catch (err) {
        if (!isMounted) return;
        const fallback = FALLBACK_CHAPTERS[selectedSubject] || [];
        setChapters(fallback.map(c => ({ en: c.en, hi: c.hi, count: 0 })));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadChapters();

    return () => {
      isMounted = false;
    };
  }, [selectedSubject]);

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSearchQuery('');
    setSearchParams({ subject: subjectId }, { replace: true });
  };

  const handleBackToSubjects = () => {
    setSelectedSubject(null);
    setSearchQuery('');
    setSearchParams({}, { replace: true });
  };

  const currentSubjectData = SUBJECTS_DATA.find(s => s.id === selectedSubject);

  const filteredChapters = chapters.filter(ch => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return ch.en.toLowerCase().includes(q) || (ch.hi && ch.hi.toLowerCase().includes(q));
  });

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-40 px-4 sm:px-6 py-3 pt-safe-header bg-white dark:bg-slate-950 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={selectedSubject ? handleBackToSubjects : () => navigate('/')}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
            {selectedSubject ? currentSubjectData?.name : 'Practice'}
          </h1>
        </div>

        {/* User Weekly XP Badge (Horizontal) */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-full text-amber-700 dark:text-amber-400 font-black text-xs sm:text-sm shadow-sm">
          <i className="fa-solid fa-bolt text-amber-500 text-xs animate-pulse"></i>
          <span>{profile?.weekly_xp || 0} XP</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-4 sm:p-6 pb-6">
        <AnimatePresence mode="wait">
          {!selectedSubject ? (
            /* ================= VIEW 1: SUBJECT SELECTION ================= */
            <motion.div
              key="subject-list"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="max-w-4xl mx-auto space-y-4"
            >
              {/* Subject Grid - Compact & Modern Design */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SUBJECTS_DATA.map(subj => {
                  const IconComponent = subj.icon;
                  return (
                    <div
                      key={subj.id}
                      onClick={() => handleSelectSubject(subj.id)}
                      className="group cursor-pointer rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.98] transition-all flex items-center justify-between gap-3 relative overflow-hidden"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${subj.badgeBg} ${subj.color} shadow-xs group-hover:scale-105 transition-transform`}>
                          <IconComponent size={22} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                            {subj.name}
                          </h4>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-hindi mt-0.5 truncate">
                            {subj.hiName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors hidden xs:inline">
                          Practice
                        </span>
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-brand-600 dark:group-hover:bg-brand-600 transition-all shadow-xs">
                          <ChevronRight size={15} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            /* ================= VIEW 2: CHAPTER LIST ================= */
            <motion.div
              key="chapter-list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="max-w-4xl mx-auto space-y-4"
            >
              {/* Search & Stats Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search chapter by name (English / हिन्दी)..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:focus:border-brand-500 text-slate-900 dark:text-white transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
                  <span>{filteredChapters.length} Chapters Found</span>
                </div>
              </div>

              {/* Chapters List */}
              <div className="space-y-3">
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 animate-pulse"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                          <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2"></div>
                        </div>
                      </div>
                      <div className="w-24 h-9 bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0"></div>
                    </div>
                  ))
                ) : filteredChapters.length > 0 ? (
                  filteredChapters.map((chapter, idx) => (
                    <div
                      key={chapter.en + idx}
                      onClick={() => onSelectChapter(selectedSubject, chapter.en)}
                      className="group cursor-pointer rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-4.5 shadow-sm hover:shadow-md hover:border-brand-500/50 dark:hover:border-brand-500/40 active:scale-[0.99] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                    >
                      <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                        {/* Chapter Number Badge */}
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center font-black text-sm text-slate-700 dark:text-slate-300 shrink-0 group-hover:bg-brand-500 group-hover:text-white group-hover:border-brand-500 transition-colors">
                          {String(idx + 1).padStart(2, '0')}
                        </div>

                        {/* Chapter Titles */}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                            {chapter.en}
                          </h4>
                          {chapter.hi && (
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-hindi mt-0.5 truncate">
                              {chapter.hi}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Action & Question Count */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                        {chapter.count > 0 ? (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            {chapter.count} Questions
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800">
                            Practice Ready
                          </span>
                        )}

                        <button
                          type="button"
                          className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 group-hover:bg-brand-600 group-hover:text-white"
                        >
                          <Play size={12} className="fill-current" />
                          <span>Start Test</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
                      <Search size={20} />
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">No chapters found</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                      No chapter matched your search "{searchQuery}". Try searching with another keyword.
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Clear Search
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
