// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// 1. Supabaseの接続設定（あなたの環境変数を参照）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Edge Functionを叩く共通関数もここにまとめてしまう（簡素化）
export async function callSnsApi(path: string, body: object = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("セッション切れです");

  const url = `${supabaseUrl}/functions/v1/sns-api/${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
      "apikey": supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error("APIエラー");
  return await response.json();
}
