-- reels-migration.sql
-- Run this in your Supabase SQL Editor

-- 1. Add subject filter array to profiles
alter table profiles add column if not exists reels_subject_filter text[] default null;

-- 2. Ensure timestamp columns exist for recycling/recency logic
alter table questions add column if not exists created_at timestamptz default now();
alter table user_interactions add column if not exists created_at timestamptz default now();

-- 3. Add performance indexes
create index if not exists idx_questions_subject_id on questions(subject, id);
create index if not exists idx_questions_subject_chapter_id on questions(subject, chapter_name_en, id);
create index if not exists idx_interactions_user_question on user_interactions(user_id, question_id);

-- 4. Create RPC for distinct active subjects (bypasses default PostgREST 1000-row limits)
CREATE OR REPLACE FUNCTION get_active_subjects()
RETURNS TABLE(subject text) AS $$
BEGIN
  RETURN QUERY SELECT DISTINCT q.subject FROM questions q WHERE q.subject IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Create RPC for Personalized Reel Batch (handles anti-join efficiently)
-- Note: V1 uses simple random sampling per subject instead of complex ML affinity,
-- as joining interactions to compute affinity per subject live is expensive.
CREATE OR REPLACE FUNCTION get_personalized_reel_batch(
    p_user_id uuid,
    p_subjects text[],
    p_batch_size int
)
RETURNS SETOF questions AS $$
BEGIN
    RETURN QUERY
    WITH eligible_questions AS (
        SELECT q.*,
               row_number() OVER (PARTITION BY q.subject ORDER BY random()) as rn
        FROM questions q
        WHERE (p_subjects IS NULL OR p_subjects = '{}' OR q.subject = ANY(p_subjects))
          AND NOT EXISTS (
              SELECT 1 FROM user_interactions ui 
              WHERE ui.user_id = p_user_id AND ui.question_id = q.id
          )
    )
    SELECT id, subject, chapter_name_en, chapter_name_hi, question_text_en, question_text_hi, option_a_en, option_a_hi, option_b_en, option_b_hi, option_c_en, option_c_hi, option_d_en, option_d_hi, correct_option, solution_short_en, solution_short_hi, exam_year, created_at FROM eligible_questions
    WHERE rn <= p_batch_size
    ORDER BY random()
    LIMIT p_batch_size;
END;
$$ LANGUAGE plpgsql;
