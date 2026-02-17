"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Save, RefreshCw, Send, Image as ImageIcon, MessageSquare, 
  Settings, Heart, Play, Clock, CheckCircle2, AlertCircle, 
  ChevronRight, Sparkles, Target, Ban, Zap, Focus, Lightbulb, BookOpen
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/** * =====================================================
 * ✅ サブコンポーネント: EducationPanel (教育システム)
 * =====================================================
 */
const EducationPanel = ({ storeId }: { storeId: string }) => {
  const [suggestion, setSuggestion] = useState<any>(null);
  const [showReason, setShowReason] = useState(false);

  useEffect(() => {
    if (storeId) {
      // 実際にはSupabaseのロールモデルDNA比較テーブルから取得
      setSuggestion({
        focus_target: "暖簾（のれん）の質感とロゴの陰影",
        context: "エントランス（入り口）の撮影",
        instruction: "ドア全体を正面から撮るのではなく、暖簾にピントを合わせ、右斜め45度から店内の明かりが少し漏れる程度にボカして撮影してください。",
        angle: "レンズ位置を腰の高さまで下げた「ローアングル」",
        lighting: "暖色系の店内照明と外光のコントラスト",
        reason: "目標店舗のDNA分析によると、『境界線（入り口）』をあえて不透明に撮ることで、視聴者の「中を見てみたい」という心理的フック（好奇心）を刺激しています。暖簾にフォーカスするのは、歴史やこだわりを直感的に伝えるためです。"
      });
    }
  }, [storeId]);

  if (!suggestion || !storeId) return null;

  return (
    <section className="bg-amber-50 rounded-3xl p-6 border border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
      <h2 className="text-sm font-black flex items-center gap-2 mb-4 text-amber-900 uppercase tracking-wider">
        <BookOpen className="w-4 h-4 text-amber-600" /> AI Director Consulting
      </h2>
      
      <div className="space-y-4">
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-amber-100 p-1.5 rounded-lg">
              <Focus className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <span className="text-[10px] font-black text-amber-500 uppercase block leading-none">Focus Point</span>
              <span className="text-xs font-bold text-slate-800">{suggestion.focus_target}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase">具体的な撮影指示</span>
              <p className="text-[12px] font-medium text-slate-700 leading-relaxed mt-1">
                「{suggestion.context}では、{suggestion.instruction}」
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-amber-50/30 border border-amber-100 rounded-xl">
                <span className="text-[8px] font-bold text-amber-600 uppercase block">推奨画角</span>
                <span className="text-[10px] font-bold text-slate-600">{suggestion.angle}</span>
              </div>
              <div className="p-2 bg-amber-50/30 border border-amber-100 rounded-xl">
                <span className="text-[8px] font-bold text-amber-600 uppercase block">光の作り方</span>
                <span className="text-[10px] font-bold text-slate-600">{suggestion.lighting}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setShowReason(!showReason)}
            className="w-full mt-4 py-2 border border-amber-200 rounded-xl text-[10px] font-black text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center gap-1"
          >
            <Lightbulb className="w-3 h-3" />
            {showReason ? "解説を隠す" : "このフォーカス設定の理由（教育的根拠）"}
          </button>

          {showReason && (
            <div className="mt-3 p-4 bg-amber-900 text-amber-50 rounded-xl text-[11px] leading-relaxed animate-in zoom-in-95 duration-300">
              <p className="font-medium">{suggestion.reason}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/** * =====================================================
 * ✅ メインコンポーネント: SNSDashboard
 * =====================================================
 */
const SliderRow = ({ id, label, value, onChange, min = 0, max = 100, rightLabel = "%" }: any) => (
  <div className="flex flex-col gap-1 p-2 border rounded-lg bg-gray-50/50 hover:bg-white transition-colors">
    <div className="flex justify-between items-center px-1">
      <label htmlFor={id} className="text-[11px] font-bold text-gray-600 uppercase tracking-tighter">{label}</label>
      <span className="text-xs font-mono font-bold text-indigo-600">{value}{rightLabel}</span>
    </div>
    <input
      id={id} type="range" min={min} max={max} value={value ?? 0}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
    />
  </div>
);

export default function SNSDashboard() {
  const [storeId, setStoreId] = useState("");
  const [storeOptions, setStoreOptions] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [emotionProfile, setEmotionProfile] = useState<any>({
    feel_gratitude: 50, feel_excitement: 50, feel_nostalgia: 50, feel_sincerity: 50,
    feel_luxury: 50, feel_casual: 50, feel_intellectual: 50, feel_passionate: 50,
    feel_healing: 50, feel_vibrant: 50
  });
  const [worldview, setWorldview] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  const fetchMyStores = async () => {
    setLoadingStores(true);
    const { data } = await supabase.from("my_store_roles_view").select("*");
    setStoreOptions(data || []);
    setLoadingStores(false);
  };

  useEffect(() => { fetchMyStores(); }, []);
  useEffect(() => {
    if (storeId) {
      setWorldview({
        must_words: ["至福の一皿", "厳選素材", "隠れ家"],
        ng_words: ["激安", "コスパ重視"],
        signature_style: "情緒的な形容詞を使いつつ、最後は誠実な敬語で締める"
      });
    }
  }, [storeId]);

  return (
    <div className="mx-auto max-w-7xl min-h-screen bg-[#F8FAFC] p-4 md:p-8 text-slate-900">
      
      {/* 🟢 HEADER */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg">
            <Zap className="text-white w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-800 uppercase">AI Directing System</h1>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Education & Consulting Mode
            </div>
          </div>
        </div>

        <select 
          className="bg-slate-50 border-slate-200 border rounded-2xl px-4 py-3 text-sm font-bold min-w-[280px]"
          value={storeId} onChange={(e) => setStoreId(e.target.value)}
        >
          <option value="">店舗を選択してください</option>
          {storeOptions.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name || s.store_id}</option>)}
        </select>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 🟠 LEFT COLUMN: 教育・解析・感情 */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* ✅ 教育システム (最優先表示) */}
          <EducationPanel storeId={storeId} />

          {/* 世界観インサイト */}
          <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative">
            <h2 className="text-sm font-black flex items-center gap-2 mb-5 text-slate-800 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-500" /> AI Worldview Insight
            </h2>
            {worldview ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-indigo-400 uppercase block mb-1">文体プロトコル</span>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{worldview.signature_style}</p>
                </div>
              </div>
            ) : <p className="text-[11px] text-slate-400 italic">店舗を選択すると解析が表示されます</p>}
          </section>

          {/* 10感情スライダー */}
          <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-sm font-black flex items-center gap-2 mb-5 text-slate-800 uppercase tracking-wider">
              <Heart className="w-4 h-4 text-rose-500" /> Emotion Profile
            </h2>
            <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {Object.keys(emotionProfile).map(key => (
                <SliderRow 
                  key={key} id={key} label={key.replace('feel_', '')} 
                  value={emotionProfile[key]} 
                  onChange={(v: number) => setEmotionProfile({...emotionProfile, [key]: v})}
                />
              ))}
            </div>
            <button className="w-full mt-4 py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-bold hover:bg-black shadow-lg">
              感情設定を学習データに保存
            </button>
          </section>
        </div>

        {/* 🔵 RIGHT COLUMN: 生成とプラン */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* ストーリー生成エリア */}
          <section className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10 grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">ストーリー候補生成</h2>
                  <p className="text-indigo-200/60 text-xs mt-2 font-medium">※教育パネルの指示に基づいて撮影された写真をアップロードするか、AIにイメージを生成させます。</p>
                </div>
                
                <div className="flex gap-3">
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex-1">
                    <span className="text-[10px] font-black text-indigo-300 uppercase block mb-1">現在の状況</span>
                    <select className="bg-transparent w-full text-sm font-bold outline-none"><option>空きあり</option></select>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex-1">
                    <span className="text-[10px] font-black text-indigo-300 uppercase block mb-1">時間帯</span>
                    <input className="bg-transparent w-full text-sm font-bold outline-none" placeholder="19:00〜" />
                  </div>
                </div>

                <button className="w-full py-4 bg-white text-indigo-900 rounded-2xl font-black text-sm hover:scale-[1.02] transition-all shadow-xl">
                  候補を生成してAI校閲を開始
                </button>
              </div>

              <div className="bg-slate-800/50 rounded-3xl border border-white/10 aspect-[9/16] flex items-center justify-center">
                 <div className="text-center opacity-20">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">No Media Preview</span>
                 </div>
              </div>
            </div>
          </section>

          {/* 予約プラン一覧 */}
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-indigo-500" /> SNS Post Schedule
            </h2>
            <div className="space-y-3">
               {/* モック表示 */}
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 font-black text-xs">v1</div>
                    <div>
                      <p className="text-xs font-black text-slate-700">2026/02/18 20:00</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Status: Planned</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
               </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
