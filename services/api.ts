
import { supabase } from './supabase';
import { Question, Profile, PYQQuestion, DashboardStats, TestHistoryItem, TestSubmission } from '../types';
import { updateUserXP } from './xpService'; 

const FALLBACK_SUBJECTS = ['Physics', 'Chemistry', 'Maths', 'Biology', 'Hindi', 'English'];
const FALLBACK_QUESTIONS: Question[] = [
  {
    id: 101, subject: 'Physics', chapter_name_en: 'Electric Charges and Fields', chapter_name_hi: 'वैद्युत आवेश तथा क्षेत्र', question_text_en: 'The SI unit of electric flux is:', question_text_hi: 'विद्युत फ्लक्स का SI मात्रक है:', option_a_en: 'Weber', option_a_hi: 'वेबर', option_b_en: 'Nm²C⁻¹', option_b_hi: 'Nm²C⁻¹', option_c_en: 'Newton', option_c_hi: 'न्यूटन', option_d_en: 'Volt', option_d_hi: 'वोल्ट', correct_option: 'B', solution_short_en: 'Electric flux Φ = E.dA = (N/C) * m² = Nm²C⁻¹.', solution_short_hi: 'विद्युत फ्लक्स Φ = E.dA = (N/C) * m² = Nm²C⁻¹.', exam_year: '2021A'
  }
];

export const api = {
  // --- AUTHENTICATION ---

  registerOrLogin: async (data: { fullName: string; mobileNumber: string; location: string; examLanguage: 'Hindi' | 'English' }) => {
    try {
        const email = `${data.mobileNumber}@raftaar.local`; 
        const password = `${data.mobileNumber}raftaar2026`; 

        // Try Signing In
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (signInData.user) {
            // Update existing profile
            await supabase.from('profiles').update({
                full_name: data.fullName,
                location: data.location,
                mobile_number: data.mobileNumber,
                exam_language: data.examLanguage,
                last_active_at: new Date().toISOString()
            }).eq('id', signInData.user.id);

            return { user: signInData.user, session: signInData.session, error: null };
        }

        // Create New User
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: data.fullName } }
        });

        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("User creation failed");

        // Insert Profile - Default to Bronze and Level 1
        const profileData = {
            id: signUpData.user.id,
            full_name: data.fullName,
            mobile_number: data.mobileNumber,
            location: data.location,
            exam_language: data.examLanguage,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.fullName}`,
            study_minutes: 0,
            total_xp: 0,
            weekly_xp: 0,
            current_level: 1, // Start at Level 1
            current_badge: 'Bronze', // Start as Bronze
            last_active_at: new Date().toISOString(),
        };

        const { error: profileError } = await supabase.from('profiles').upsert(profileData);
        if (profileError) throw profileError;

        return { user: signUpData.user, session: signUpData.session, error: null };

    } catch (error: any) {
        return { user: null, session: null, error: error };
    }
  },

  getProfile: async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('leaderboard_view')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) return data;

      const { data: basicData, error: basicError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (basicError) return null;
      return { ...basicData, global_rank: 0 }; 
    } catch (e) { return null; }
  },

  updateReelsFilter: async (userId: string, filterSubjects: string[]) => {
    try {
      await supabase.from('profiles').update({ reels_subject_filter: filterSubjects }).eq('id', userId);
    } catch(e) {
      console.error(e);
    }
  },

  createProfile: async (userId: string, fullName: string, avatarUrl: string): Promise<Profile | null> => {
    try {
        const newProfile = {
            id: userId,
            full_name: fullName,
            avatar_url: avatarUrl,
            study_minutes: 0,
            total_xp: 0,
            weekly_xp: 0,
            current_level: 1,
            current_badge: 'Bronze',
            last_active_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('profiles')
            .upsert(newProfile, { onConflict: 'id' })
            .select()
            .single();

        if (error) return null;
        return data;
    } catch (e) { return null; }
  },

  getSubjects: async (): Promise<string[]> => {
    try {
      const { getActiveSubjects } = await import('./reelsRecommendation');
      return await getActiveSubjects();
    } catch (e) {
      console.error("Exception in getSubjects:", e);
      return []; 
    }
  },

  getChapters: async (subject: string): Promise<{en: string, hi: string, count: number}[]> => {
    try {
      const { data, error } = await supabase.from('questions').select('chapter_name_en, chapter_name_hi').eq('subject', subject);
      if (error) {
        console.error("Supabase error (getChapters):", error);
        return [];
      }
      if (!data) return [];
      const uniqueMap = new Map();
      data.forEach((item: any) => {
        if (!uniqueMap.has(item.chapter_name_en)) {
            uniqueMap.set(item.chapter_name_en, { en: item.chapter_name_en, hi: item.chapter_name_hi, count: 1 });
        } else {
            uniqueMap.get(item.chapter_name_en).count++;
        }
      });
      return Array.from(uniqueMap.values());
    } catch (e) {
      console.error("Exception in getChapters:", e);
      return []; 
    }
  },

  getQuestionsByChapter: async (subject: string, chapterEn: string): Promise<Question[]> => {
    try {
      const { data, error } = await supabase.from('questions').select('*').eq('subject', subject).eq('chapter_name_en', chapterEn);
      if (error) {
        console.error("Supabase error (getQuestionsByChapter):", error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error("Exception in getQuestionsByChapter:", e);
      return []; 
    }
  },

  getShortsQuestionPool: async (userId: string, filterSubjects: string[], limit: number = 8): Promise<Question[]> => {
    try {
      const { fetchPersonalizedReelBatch } = await import('./reelsRecommendation');
      return await fetchPersonalizedReelBatch(userId, filterSubjects, limit);
    } catch(e) {
      console.error("Exception in getShortsQuestionPool:", e);
      return []; 
    }
  },

  getSeenQuestionIds: async (userId: string): Promise<number[]> => {
    if (!userId || userId === 'demo-user') return [];
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select('question_id')
        .eq('user_id', userId);
      if (error) {
        console.error("Supabase error (getSeenQuestionIds):", error);
        return [];
      }
      return data ? data.map((d: any) => d.question_id) : [];
    } catch(e) {
      console.error("Exception in getSeenQuestionIds:", e);
      return [];
    }
  },

  getRandomQuestion: async (): Promise<Question | null> => {
    try {
       const { data, error } = await supabase.from('questions').select('*').limit(20); 
       if (error) {
          console.error("Supabase error (getRandomQuestion):", error);
          return null;
       }
       if (!data || data.length === 0) return null;
       return data[Math.floor(Math.random() * data.length)];
    } catch(e) {
       console.error("Exception in getRandomQuestion:", e);
       return null; 
    }
  },

  submitAnswer: async (userId: string, questionId: number, selectedOption: string, isCorrect: boolean, timeTaken: number) => {
    if (userId === 'demo-user') return true; 
    
    // Attempt to log the interaction inside a try-catch so it doesn't block XP update
    try {
      await supabase.from('user_interactions').insert({
          user_id: userId, question_id: questionId, is_correct: isCorrect, time_spent_seconds: timeTaken
      });
    } catch (err) {
      console.log("Interaction logging skipped (duplicate or error)", err);
    }
    
    // Always update XP if correct, regardless of interaction log success
    if (isCorrect) {
        await updateUserXP(userId, 1);
    }
    return true;
  },

  submitTestResult: async (data: TestSubmission) => {
    if (data.userId === 'demo-user') return { success: true };
    try {
        const { error } = await supabase.from('user_test_sessions').insert({
            user_id: data.userId, test_type: data.testType, subject: data.subject, total_questions: data.totalQuestions,
            correct_count: data.correct, wrong_count: data.wrong, skipped_count: data.skipped, time_taken_seconds: data.timeTaken, created_at: data.date
        });
        return { success: !error, error };
    } catch (e) { return { success: false }; }
  },

  submitShortsInteraction: async (userId: string, questionId: number, isCorrect: boolean, isLiked: boolean, timeSpentSeconds: number) => {
    if (userId === 'demo-user') return true;
    
    try {
      await supabase.from('user_interactions').insert({
          user_id: userId, question_id: questionId, is_correct: isCorrect, is_liked: isLiked, time_spent_seconds: timeSpentSeconds
      });
    } catch (err) {
       // Ignore duplicate logs
    }

    if (isCorrect) {
        await updateUserXP(userId, 1);
    }
    return true;
  },

  getLeaderboard: async (): Promise<Profile[]> => {
      try {
          const { data, error } = await supabase
            .from('leaderboard_view')
            .select('*')
            .order('total_xp', { ascending: false })
            .limit(50);
          
          if (error) throw error;
          return data as Profile[];
      } catch (e) { return []; }
  },

  getDashboardData: async (userId: string): Promise<DashboardStats> => {
    if (userId === 'demo-user') return { totalQuestions: 0, totalCorrect: 0, totalWrong: 0, accuracy: 0, dailyAttempts: 0, dailyCorrect: 0, dailyWrong: 0, dailyAvgTime: 0, totalTests: 0, history: [], graphData: [] };

    try {
        const { data: sessions } = await supabase.from('user_test_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (!sessions) return { totalQuestions: 0, totalCorrect: 0, totalWrong: 0, accuracy: 0, dailyAttempts: 0, dailyCorrect: 0, dailyWrong: 0, dailyAvgTime: 0, totalTests: 0, history: [], graphData: [] };

        let totalQuestions = 0, totalCorrect = 0, totalWrong = 0;
        sessions.forEach(s => { totalQuestions += (s.total_questions || 0); totalCorrect += (s.correct_count || 0); totalWrong += (s.wrong_count || 0); });
        const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        const todayStr = new Date().toISOString().split('T')[0];
        const todaySessions = sessions.filter(s => s.created_at?.startsWith(todayStr));
        let dailyAttempts = 0, dailyCorrect = 0, dailyWrong = 0, dailyTimeTotal = 0;

        todaySessions.forEach(s => { dailyAttempts += (s.total_questions || 0); dailyCorrect += (s.correct_count || 0); dailyWrong += (s.wrong_count || 0); dailyTimeTotal += (s.time_taken_seconds || 0); });
        const dailyAvgTime = dailyAttempts > 0 ? Math.round(dailyTimeTotal / dailyAttempts) : 0;

        const history: TestHistoryItem[] = sessions.slice(0, 20).map((s: any) => ({
            id: s.id, subject: s.subject || 'General', correct: s.correct_count, totalQuestions: s.total_questions, timeTaken: s.time_taken_seconds, date: s.created_at, type: s.test_type
        }));

        const graphMap = new Map<string, number>();
        [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]; }).reverse().forEach(d => graphMap.set(d.slice(5), 0));

        sessions.forEach(s => {
            const dateKey = s.created_at.slice(5, 10);
            if (graphMap.has(dateKey)) graphMap.set(dateKey, (graphMap.get(dateKey) || 0) + (s.correct_count || 0));
        });

        return { totalQuestions, totalCorrect, totalWrong, accuracy, dailyAttempts, dailyCorrect, dailyWrong, dailyAvgTime, totalTests: sessions.length, history, graphData: Array.from(graphMap.entries()).map(([day, score]) => ({ day, score })) };
    } catch (e) { return { totalQuestions: 0, totalCorrect: 0, totalWrong: 0, accuracy: 0, dailyAttempts: 0, dailyCorrect: 0, dailyWrong: 0, dailyAvgTime: 0, totalTests: 0, history: [], graphData: [] }; }
  },

  getChapterStats: async (subject: string): Promise<{ en: string, hi: string, count: number }[]> => {
      try {
          // STRICT SORTING: Order by ID to ensure chapters appear in book order
          const { data } = await supabase
            .from('questions')
            .select('chapter_name_en, chapter_name_hi, id')
            .eq('subject', subject)
            .order('id', { ascending: true });
          
          if (!data) return [];
          const map = new Map<string, { en: string, hi: string, count: number }>();
          
          // Map preserves insertion order, so sorting by ID first guarantees correct Chapter order
          data.forEach((q: any) => {
              const en = q.chapter_name_en;
              const hi = q.chapter_name_hi || '';
              if (!map.has(en)) map.set(en, { en, hi, count: 0 });
              map.get(en)!.count++;
          });
          return Array.from(map.values());
      } catch (e) { return []; }
  },

  createPracticeSession: async (userId: string, subject: string, chapters: string[]) => 'session-' + Date.now(),

  fetchInfinityBatch: async (chapters: string[], seenIds: number[], qty: number): Promise<Question[]> => {
    if (!chapters.length) return [];
    try {
        const promises = chapters.map(async (chapterName) => {
            let query = supabase.from('questions').select('*').eq('chapter_name_en', chapterName);
            if (seenIds.length > 0) query = query.not('id', 'in', `(${seenIds.join(',')})`);
            const { data } = await query.limit(qty);
            return data as Question[] || [];
        });
        const results = await Promise.all(promises);
        const all = results.flat();
        for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
        return all;
    } catch (e) { return []; }
  },

  getPYQs: async (subject: string, year: number, type: string): Promise<PYQQuestion[]> => {
    const { data } = await supabase.from('pyq_questions').select('*').eq('subject', subject).eq('exam_year', year).eq('question_type', type);
    return data as PYQQuestion[] || [];
  }
};
