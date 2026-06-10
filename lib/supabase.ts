import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// クライアント・サーバー共通（匿名認証ユーザー向け）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// サーバーサイド専用（API Route内でのみ使用すること）
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
