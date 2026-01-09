
import { supabase } from './supabase';

// Helper to calculate badge based on XP
const calculateBadge = (xp: number): string => {
  if (xp >= 8000) return 'Platinum';
  if (xp >= 5000) return 'Gold';
  if (xp >= 2500) return 'Silver';
  if (xp >= 1000) return 'Bronze';
  return 'Rookie';
};

export const updateUserXP = async (userId: string, correctAnswersCount: number) => {
  if (!userId) return { success: false, error: "No User ID" };

  try {
    const xpEarned = correctAnswersCount * 3; // 3 XP per correct answer
    
    // 1. Fetch current profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // 2. Calculate New Values
    let newTotalXP = xpEarned;
    let newWeeklyXP = xpEarned;
    let fullName = 'Student';
    let avatarUrl = '';
    let currentStudyMinutes = 0;

    if (profile) {
        newTotalXP += (profile.total_xp || 0);
        newWeeklyXP += (profile.weekly_xp || 0);
        fullName = profile.full_name;
        avatarUrl = profile.avatar_url;
        currentStudyMinutes = profile.study_minutes || 0;
    }

    // --- LEVEL LOGIC ---
    // Formula: Every 200 XP = +1 Level.
    const newLevel = Math.floor(newTotalXP / 200) + 1;

    // --- BADGE LOGIC ---
    const newBadge = calculateBadge(newTotalXP);

    // 3. Update Database
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fullName,
        avatar_url: avatarUrl,
        total_xp: newTotalXP,
        weekly_xp: newWeeklyXP,
        study_minutes: currentStudyMinutes, 
        current_level: newLevel, 
        current_badge: newBadge,
        last_active_at: new Date().toISOString(),
      });

    if (upsertError) {
        console.error("XP Update Failed:", upsertError);
        return { success: false };
    }

    return { success: true, newTotalXP, newLevel, newBadge };

  } catch (error) {
    console.error('XP Service Error:', error);
    return { success: false };
  }
};
