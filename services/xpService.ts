
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
    
    // 1. Fetch current profile to get current XP
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('total_xp, weekly_xp')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("XP Fetch Error:", fetchError);
        return { success: false };
    }

    // 2. Calculate New Values
    const currentTotalXP = profile?.total_xp || 0;
    const currentWeeklyXP = profile?.weekly_xp || 0;
    
    const newTotalXP = currentTotalXP + xpEarned;
    const newWeeklyXP = currentWeeklyXP + xpEarned;

    // --- LEVEL LOGIC ---
    // Formula: Every 200 XP = +1 Level.
    const newLevel = Math.floor(newTotalXP / 200) + 1;

    // --- BADGE LOGIC ---
    const newBadge = calculateBadge(newTotalXP);

    // 3. Update Database - Use UPDATE instead of UPSERT to protect other fields
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        total_xp: newTotalXP,
        weekly_xp: newWeeklyXP,
        current_level: newLevel, 
        current_badge: newBadge,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
        console.error("XP Update Failed:", updateError);
        return { success: false };
    }

    return { success: true, newTotalXP, newLevel, newBadge };

  } catch (error) {
    console.error('XP Service Error:', error);
    return { success: false };
  }
};
