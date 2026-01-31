
import { createClient } from '@supabase/supabase-js';

/**
 * SUPABASE DATABASE SCHEMA (Run this in your Supabase SQL Editor):
 * 
 * -- 1. Create 'sets' table
 * CREATE TABLE sets (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   name TEXT NOT NULL,
 *   app TEXT NOT NULL,
 *   description TEXT,
 *   author_id UUID REFERENCES auth.users(id),
 *   author_name TEXT,
 *   is_community BOOLEAN DEFAULT true,
 *   saved_count BIGINT DEFAULT 0
 * );
 * 
 * -- 2. Create 'shortcuts' table
 * CREATE TABLE shortcuts (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   app TEXT NOT NULL,
 *   action TEXT NOT NULL,
 *   keys JSONB NOT NULL,
 *   description TEXT,
 *   category TEXT,
 *   difficulty TEXT,
 *   author_id UUID REFERENCES auth.users(id),
 *   author_name TEXT,
 *   is_community BOOLEAN DEFAULT true,
 *   set_id UUID REFERENCES sets(id) ON DELETE CASCADE
 * );
 * 
 * -- 3. Create 'user_shortcuts' for saved items
 * CREATE TABLE user_shortcuts (
 *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
 *   shortcut_id UUID REFERENCES shortcuts(id) ON DELETE CASCADE,
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   PRIMARY KEY (user_id, shortcut_id)
 * );
 * 
 * -- Enable Row Level Security (RLS)
 * ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE shortcuts ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE user_shortcuts ENABLE ROW LEVEL SECURITY;
 * 
 * -- Policies
 * CREATE POLICY "Public Access" ON sets FOR SELECT USING (true);
 * CREATE POLICY "Authenticated Insert" ON sets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
 * CREATE POLICY "Public Access" ON shortcuts FOR SELECT USING (true);
 * CREATE POLICY "Authenticated Insert" ON shortcuts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
 * CREATE POLICY "Users can manage own saves" ON user_shortcuts FOR ALL USING (auth.uid() = user_id);
 */

const supabaseUrl = (process.env.SUPABASE_URL || 'https://hqhlaseqfctifcrdamae.supabase.co').trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_G8TsSwWorfh6hoH1QivJjQ_KpkKQfkZ').trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
