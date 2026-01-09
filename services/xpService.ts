
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
    
    // 1. Fetch current profile safely
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('total_xp, weekly_xp')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
        // If profile fetch fails, do not attempt to update to avoid overwriting with bad data
        // This prevents the "reset to 0" issue if fetch fails
        console.error("XP Update Failed: Profile not found or fetch error", fetchError);
        return { success: false, error: fetchError };
    }

    // 2. Calculate New Values using fetched data
    const newTotalXP = (profile.total_xp || 0) + xpEarned;
    const newWeeklyXP = (profile.weekly_xp || 0) + xpEarned;

    // --- LEVEL LOGIC ---
    // Formula: Every 200 XP = +1 Level.
    const newLevel = Math.floor(newTotalXP / 200) + 1;

    // --- BADGE LOGIC ---
    const newBadge = calculateBadge(newTotalXP);

    // 3. Update Database (Only update relevant fields)
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
