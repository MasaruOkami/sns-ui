"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      // ログイン状態の確認
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserName(user.email);

      // 投稿プラン一覧を取得
      const { data, error } = await supabase
        .from("sns_post_plans")
        .select("*")
        .order("scheduled_at", { ascending: true });

      if (!error && data) {
        setPlans(data);
      }
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return <div className="p-10 text-center text-slate-500">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-800">SNS Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 hidden sm:block">{userName}</span>
          <button 
            onClick={handleLogout}
            className="text-sm font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-800">投稿予定一覧</h2>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
            ＋ 新規作成
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-medium">投稿予定がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.plan_id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider ${
                      plan.platform === 'instagram' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {plan.platform}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {new Date(plan.scheduled_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-slate-800 mb-2 line-clamp-2">
                    {plan.caption || "タイトルなし"}
                  </h3>
                  
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">ID: {plan.plan_id.slice(0,8)}</span>
                    <Link 
                      href={`/preview?plan_id=${plan.plan_id}`}
                      className="bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      プレビュー表示
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
