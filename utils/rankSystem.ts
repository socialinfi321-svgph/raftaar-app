
import { UserTag } from '../types';

// Determines the UserTag based on Total XP
export const calculateRank = (totalXP: number): string => {
  if (totalXP >= 5000) return UserTag.Cheetah;
  if (totalXP >= 2000) return UserTag.Panther;
  if (totalXP >= 500) return UserTag.Donkey;
  return UserTag.Monkey;
};
