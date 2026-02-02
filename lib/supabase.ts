
import { createClient } from '@supabase/supabase-js';

// Credentials for project: ffeynyexcwzrunqibxmr
const supabaseUrl = 'https://elbphfohfpauzpscqsfs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsYnBoZm9oZnBhdXpwc2Nxc2ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MTk5NDUsImV4cCI6MjA4NTQ5NTk0NX0.eTXrIwpFm0e3XRLQrnDeUzTSEtfSIoWpRw2wJ353y-E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * ইউজারনেম লগইন এবং স্ট্যাটাস আপডেটের জন্য নিচের SQL টি রান করুন:
 * 
 * -- ১. আরএলএস পলিসি এনাবল করা
 * ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow public username lookup" ON public.profiles FOR SELECT USING (true);
 * 
 * -- ২. অ্যাটেনডেন্স স্ট্যাটাস লজিক
 * ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Users can manage own attendance" ON public.attendance FOR ALL USING (auth.uid() = user_id);
 */
