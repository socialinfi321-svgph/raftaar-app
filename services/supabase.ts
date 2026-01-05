import { createClient } from '@supabase/supabase-js';

// Configuration for Raftaar Test Series
// Using the credentials provided to ensure direct connection to the live database
const supabaseUrl = 'https://lmauqnfzcvhtxlznrwni.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtYXVxbmZ6Y3ZodHhsem5yd25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMzgzODIsImV4cCI6MjA4MjYxNDM4Mn0.r6LQUTq9UBj0zK0KoYC6VGkNXF87iTnzIvtSVpjuPhk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const auth = supabase.auth;