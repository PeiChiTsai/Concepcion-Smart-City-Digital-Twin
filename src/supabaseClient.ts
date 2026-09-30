import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("缺少 Supabase 環境變數，請檢查 .env 檔案！")
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)