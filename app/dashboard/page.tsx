"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Save, RefreshCw, Send, Image as ImageIcon, MessageSquare, 
  Settings, Heart, Play, Clock, CheckCircle2, AlertCircle, 
  ChevronRight, Sparkles, Target, Ban, Zap
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/** * =====================================================
 * ✅ ヘルパー関数群
 * =====================================================
 */
const normalizeStyleRatios = (p: number, i: number, v: number, changed: "photo" | "illust" | "video") => {
  let photo = p, illust = i, video = v;
  const total = photo + illust + video;
  if (total === 100) return { photo, illust, video };
  const remaining = 100 - (changed === "photo" ? photo : changed === "illust" ? illust : video);
  const otherSum = (changed === "photo" ? illust + video : changed === "illust" ? photo + video : photo + illust) || 1;
  const factor = remaining / otherSum;
  if (changed === "photo") {
    illust = Math.round(illust * factor);
    video = 100 - photo - illust;
  } else if (changed === "illust") {
    photo = Math.round(photo * factor);
    video = 100 - illust - photo;
  } else {
    photo = Math.round(photo * factor);
    illust = 100 - video - photo;
  }
  return { photo, illust, video };
};

const getStoryMetaVersion = (meta: any) => meta?.version ?? 0;
const toLocalInputValue = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

/** * =====================================================
 * ✅ サブコンポーネント: SliderRow
 * =====================================================
 */
const SliderRow = ({ id, label, value, onChange, min = 0, max = 100, rightLabel = "%" }: any) => (
  <div className="flex flex-col gap-1 p-2 border rounded-lg bg-gray-50/50 hover:bg-white transition-colors">
    <div className="flex justify-between items-center px-1">
      <label htmlFor={id} className="text-[11px] font-bold text-gray-600 uppercase tracking-tighter">{label}</label>
      <span className="text-xs font-mono font-bold text-indigo-600">{value}{rightLabel}</span>
    </div>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      value={value ?? 0}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
    />
  </div>
);

/** * =====================================================
 * ✅ メインコンポーネント: SNSDashboard
 * =====================================================
 */
export default function SNSDashboard() {
  // --- 基本状態 ---
  const [storeId, setStoreId] = useState("");
  const [storeOptions, setStoreOptions] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  
  // --- プロフィール状態 ---
  const [storeProfile, setStoreProfile] = useState<any>(null);
  const [emotionProfile, setEmotionProfile] = useState<any>({
    feel_gratitude: 50, feel_excitement: 50, feel_nostalgia: 50, feel_sincerity: 50,
    feel_luxury: 50, feel_casual: 50, feel_intellectual: 50, feel_passionate: 50,
    feel_healing: 50, feel_vibrant: 50
  });
  const [mediaProfile, setMediaProfile] = useState<any>({
    style_photo_ratio: 70, style_illustration_ratio: 20, style_video_ratio: 10, realism_level: 80
  });

  // --- 世界観解析 (Insight) 状態 ---
  const [worldview, setWorldview] = useState<any>(null);
  const [loadingWorldview, setLoadingWorldview] = useState(false);

  // --- 投稿・プラン状態 ---
  const [storyPreviews, setStoryPreviews] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activePlanVersion, setActivePlanVersion] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const functionsBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL;

  // --- 権限管理 ---
  const myRole = useMemo(() => storeOptions.find(s => s.store_id === storeId)?.role ?? "viewer", [storeOptions, storeId]);
  const canEdit = myRole === "admin" || myRole === "editor";

  // --- データ取得ロジック ---
  const fetchMyStores = async () => {
    setLoadingStores(true);
    const { data } = await supabase.from("my_store_roles_view").select("*");
    setStoreOptions(data || []);
    setLoadingStores(false);
  };

  const loadStoreData = async (id: string) => {
    if (!id) return;
    setLoadingWorldview(true);
    // 本来は build-core-doc 等の結果を取得
    setWorldview({
      must_words: ["至福の一皿", "厳選素材", "隠れ家"],
      ng_words: ["激安", "コスパ重視", "とりあえず"],
      signature_style: "情緒的な形容詞を使いつつ、最後は誠実な敬語で締める",
      target_persona: "週末に自分へのご褒美を求める30-40代の女性"
    });
    setLoadingWorldview(false);
    loadPlans(id);
  };

  const loadPlans = async (id: string) => {
    setLoadingPlans(true);
    const { data } = await supabase.from("sns_post_plans").select("*").eq("store_id", id).order("scheduled_at", { ascending: false });
    setPlans(data || []);
    setLoadingPlans(false);
  };

  const sendPlanFeedback = async (type: string, extra: any = {}) => {
    if (!activePlanId || !storeId) return;
    setSendingFeedback(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${functionsBaseUrl}/sns-preview-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}`, "x-store-id": storeId },
        body: JSON.stringify({
          store_id: storeId, plan_id: activePlanId, feedback_type: type,
          comment: feedbackComment, if_version: activePlanVersion, ...extra
        })
      });
      if (res.ok) {
        alert("フィードバックを反映しました。AIが学習を開始します。");
        setFeedbackComment("");
        loadPlans(storeId);
      }
    } catch (e) { alert("エラーが発生しました"); } finally { setSendingFeedback(false); }
  };

  useEffect(() => { fetchMyStores(); }, []);
  useEffect(() => { if (storeId) loadStoreData(storeId); }, [storeId]);

  return (
    <div className="mx-auto max-w-7xl min-h-screen bg-[#F8FAFC] p-4 md:p-8 text-slate-900 font-sans">
      
      {/* 🟢 HEADER: 店舗選択 & システムステータス */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-indigo-200 shadow-lg">
            <Zap className="text-white w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">AI SNS DIRECTOR</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Engine: Corefit-Runner v4.2</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select 
            className="bg-slate-50 border-slate-200 border rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none min-w-[280px] shadow-inner"
            value={storeId} onChange={(e) => setStoreId(e.target.value)}
          >
            <option value="">店舗を選択してください</option>
            {storeOptions.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name || s.store_id} ({s.role})</option>)}
          </select>
          <button onClick={fetchMyStores} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
            <RefreshCw className={`w-5 h-5 text-slate-400 ${loadingStores ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 🟠 LEFT COLUMN: 世界観と感情の設計 (AIの脳内設定) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 世界観インサイト (AI解析可視化) */}
          <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 uppercase font-black text-4xl select-none">World</div>
            <h2 className="text-sm font-black flex items-center gap-2 mb-5 text-slate-800 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-500" /> AI Worldview Insight
            </h2>
            
            {loadingWorldview ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-20 bg-slate-100 rounded-2xl"></div>
                <div className="h-20 bg-slate-100 rounded-2xl"></div>
              </div>
            ) : worldview ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                    <Target className="w-3 h-3 text-green-500" /> Must Keywords
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {worldview.must_words.map((w: string) => (
                      <span key={w} className="px-2.5 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-lg border border-green-100">{w}</span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                    <Ban className="w-3 h-3 text-red-400" /> NG Keywords
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {worldview.ng_words.map((w: string) => (
                      <span key={w} className="px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-lg border border-red-100">{w}</span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-indigo-400 uppercase block mb-2">文体プロトコル</span>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{worldview.signature_style}</p>
                </div>
              </div>
            ) : <div className="text-center py-10 text-slate-300 italic text-xs">店舗を選択してください</div>}
          </section>

          {/* 10感情スライダー */}
          <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-sm font-black flex items-center gap-2 mb-5 text-slate-800 uppercase tracking-wider">
              <Heart className="w-4 h-4 text-rose-500" /> Emotion Profile
            </h2>
            <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[320px] pr-2 custom-scrollbar">
              {Object.keys(emotionProfile).map(key => (
                <SliderRow 
                  key={key} id={key} label={key.replace('feel_', '')} 
                  value={emotionProfile[key]} 
                  onChange={(v: number) => setEmotionProfile({...emotionProfile, [key]: v})}
                />
              ))}
            </div>
            <button className="w-full mt-4 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200">
              <Save className="w-3.5 h-3.5" /> 感情設計を保存
            </button>
          </section>
        </div>

        {/* 🔵 RIGHT COLUMN: 実行と予約管理 */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 生成アクションエリア */}
          <section className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
              <div className="space-y-4 flex-1">
                <h2 className="text-2xl font-black tracking-tight leading-tight">リアルタイム・ストーリー生成</h2>
                <p className="text-indigo-200/70 text-sm max-w-md">現在の空席状況や「こだわり」を、AIが解析した世界観に沿って即座にビジュアル化します。</p>
                
                <div className="flex flex-wrap gap-3">
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex-1">
                    <span className="text-[10px] font-black text-indigo-300 uppercase block mb-1">現在の状況</span>
                    <select className="bg-transparent w-full text-sm font-bold outline-none">
                      <option className="text-slate-900" value="available">空きあり</option>
                      <option className="text-slate-900" value="few">残りわずか</option>
                      <option className="text-slate-900" value="full">満席</option>
                    </select>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex-1">
                    <span className="text-[10px] font-black text-indigo-300 uppercase block mb-1">時間帯</span>
                    <input className="bg-transparent w-full text-sm font-bold outline-none placeholder:text-indigo-300/50" placeholder="例: 19:00〜" />
                  </div>
                </div>

                <button className="w-full py-4 bg-white text-indigo-900 rounded-2xl font-black text-sm hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-lg">
                  <Play className="w-4 h-4 fill-current" /> 候補を生成してプレビュー
                </button>
              </div>

              <div className="w-full md:w-64 aspect-[9/16] bg-slate-800/50 rounded-3xl border border-white/10 flex items-center justify-center relative group">
                <div className="text-center p-6">
                  <ImageIcon className="w-10 h-10 text-white/20 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">No Preview Generated</p>
                </div>
              </div>
            </div>
          </section>

          {/* 予約プラン一覧（タイムライン形式） */}
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-black text-slate-800">SNS投稿スケジュール</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Scheduled Plans (48h Window)</p>
              </div>
              <button onClick={() => loadPlans(storeId)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <RefreshCw className={`w-4 h-4 text-slate-400 ${loadingPlans ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-4">
              {plans.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-3xl">
                  <Clock className="w-10 h-10 text-slate-100 mx-auto mb-2" />
                  <p className="text-sm text-slate-300 font-bold italic">No active plans found.</p>
                </div>
              ) : (
                plans.map(p => {
                  const isActive = activePlanId === p.plan_id;
                  const version = getStoryMetaVersion(p.story_meta);
                  return (
                    <div 
                      key={p.plan_id}
                      onClick={() => { setActivePlanId(p.plan_id); setActivePlanVersion(version); }}
                      className={`group p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${isActive ? 'bg-indigo-50 border-indigo-200 shadow-md translate-x-1' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                    >
                      <div className="flex items-center gap-5">
                        <div className={`p-3 rounded-xl ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-700">{new Date(p.scheduled_at).toLocaleString()}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${p.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                              {p.status}
                            </span>
                            <span className="text-[10px] font-bold text-slate-300">v{version}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 transition-transform ${isActive ? 'text-indigo-600 translate-x-1' : 'text-slate-200'}`} />
                    </div>
                  );
                })
              )}
            </div>

            {/* 🛠 選択中のプランに対する高度なフィードバックパネル */}
            {activePlanId && (
              <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-black text-sm">v{activePlanVersion}</div>
                    <div>
                      <h3 className="text-sm font-black">Plan Feedback Engine</h3>
                      <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Active Plan: {activePlanId.slice(0, 8)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => sendPlanFeedback("approve")}
                    disabled={sendingFeedback || !canEdit}
                    className="bg-green-500 hover:bg-green-400 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-green-900/20 transition-all flex items-center gap-2"
                  >
                    {sendingFeedback ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    APPROVE & SCHEDULE
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AIへの具体的な修正リクエスト</label>
                      <textarea 
                        value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="例: 文末をもっと親しみやすくして。季節感を強めに。"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">クイック・微調整</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => sendPlanFeedback("shorter_text")} className="bg-white/5 hover:bg-white/10 p-3 rounded-xl text-[10px] font-bold border border-white/5 transition-all">短くする</button>
                      <button onClick={() => sendPlanFeedback("longer_text")} className="bg-white/5 hover:bg-white/10 p-3 rounded-xl text-[10px] font-bold border border-white/5 transition-all">長くする</button>
                      <button onClick={() => sendPlanFeedback("more_emoji")} className="bg-white/5 hover:bg-white/10 p-3 rounded-xl text-[10px] font-bold border border-white/5 transition-all">絵文字増量</button>
                      <button onClick={() => sendPlanFeedback("softer_tone")} className="bg-white/5 hover:bg-white/10 p-3 rounded-xl text-[10px] font-bold border border-white/5 transition-all">柔らかい口調</button>
                    </div>
                    <button 
                      onClick={() => sendPlanFeedback("img_regen_variation")}
                      className="w-full py-3 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-[10px] font-black hover:bg-indigo-600/30 transition-all uppercase"
                    >
                      画像を再生成 (Variation)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* 🚀 FLOAT ACTION: 実行ログの確認など（任意） */}
      <footer className="mt-12 text-center pb-12">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Powered by Gemini & Supabase Edge Functions</p>
      </footer>
    </div>
  );
}
