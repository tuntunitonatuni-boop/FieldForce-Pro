
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jgjltkejfmqaefelwbuv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnamx0a2VqZm1xYWVmZWx3YnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NTE5MTgsImV4cCI6MjA4NTUyNzkxOH0.NWtFtxZ5gE9qsTrHthG8SeTvWWGNqBokr2OHlvOtCyM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
