
import { createClient } from '@supabase/supabase-js';

// Credentials for project: FieldForce
// Note: If you see "Invalid API key" errors, please update these values with your own Supabase project credentials.
// You can find them in your Supabase Dashboard -> Project Settings -> API
const supabaseUrl = process.env.SUPABASE_URL || 'https://cpgzeqekfpcosnglwmoo.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZ3plcWVrZnBjb3NuZ2x3bW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NTkyMTIsImV4cCI6MjA4NTUzNTIxMn0.BeO6PwdNCd4V4vJ63LfosaTQiD7FWRGP0ZB5NzfXWjA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);