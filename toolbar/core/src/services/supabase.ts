import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vucvdpamtrjkzmubwlts.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Y3ZkcGFtdHJqa3ptdWJ3bHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc2OTA4NDcsImV4cCI6MjA0MzI2Njg0N30.uTznS2P5CJ8NcPlBoDvJ2cV5QRZLUcCLlSntokJV40o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
