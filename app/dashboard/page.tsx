"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Save, RefreshCw, Send, Image as ImageIcon, MessageSquare, 
  Settings, Heart, Play, Clock, CheckCircle2, AlertCircle, ChevronRight 
} from "lucide-react";
import { supabase } from "@/lib/supabase"; // 以前作成したファイルを想定

/** * =====================================================
 * ✅ ヘルパー関数 (補完版)
 * =====================================================
 */

// 合計を100%に調整するロジック
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
 * ✅ UIコンポーネント: SliderRow
 * =====================================================
 */
const SliderRow = ({ id, label, value, onChange, min = 0, max = 100, rightLabel = "" }: any) => (
  <div className="flex flex-col gap-1 p-2 border rounded-lg bg-gray-50/50">
    <div className="flex justify-between items-center px-1">
      <label htmlFor={id} className="text-xs font-medium text-gray-700">{label}</label>
      <span className="text-xs font-mono font-bold text-blue-600">{value}{rightLabel}</span>
    </div>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      value={value ?? 0}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
    />
  </div>
);

/** * =====================================================
 * ✅ メインコンポーネント
 * =====================================================
 */
export default function SNSDashboard() {
  // --- 状態管理 (送っていただいたコードを統合) ---
  const [storeId, setStoreId] = useState("");
  const [storeOptions, setStoreOptions] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [authed, setAuthed] = useState(true); // 簡易化。実際はsupabase.auth等
  
  const [storeProfile, setStoreProfile] = useState<any>(null);
  const [savingStoreProfile, setSavingStoreProfile] = useState(false);
  
  const [emotionProfile, setEmotionProfile] = useState<any>(null);
  const [savingEmotionProfile, setSavingEmotionProfile] = useState(false);
  
  const [mediaProfile, setMediaProfile] = useState<any>(null);
  const [savingMediaProfile, setSavingMediaProfile] = useState(false);

  const [storyPreviews, setStoryPreviews] = useState<any[]>([]);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [generatingStory, setGeneratingStory] = useState(false);

  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  
  const [control, setControl] = useState<any>({ status: "available", time_slot: "", note: "" });
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [storyDryRun, setStoryDryRun] = useState(false);
  const [publishingStory, setPublishingStory] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activePlanVersion, setActivePlanVersion] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [rescheduleLocal, setRescheduleLocal] = useState("");

  const functionsBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL;
  const tz = "Asia/Tokyo";

  // --- 権限判定 ---
  const myRoleForSelectedStore = useMemo(() => {
    return storeOptions.find((s) => s.store_id === storeId)?.role ?? "viewer";
  }, [storeOptions, storeId]);

  const canEditAny = myRoleForSelectedStore === "admin" || myRoleForSelectedStore === "editor";
  const isAdmin = myRoleForSelectedStore === "admin";
  const canEditStoreCoreAdminOnly = isAdmin;
  const canEditStoreEditorAllowed = canEditAny;
  const canEditMediaProfile = canEditAny;
  const canEditEmotionProfile = canEditAny;

  const selectedStoreLabel = useMemo(() => {
    const opt = storeOptions.find((o) => o.store_id === storeId);
    if (!opt) return storeId || "";
    return opt.store_name ? `${opt.store_id}（${opt.store_name}）` : opt.store_id;
  }, [storeOptions, storeId]);

  const activePlan = useMemo(() => plans.find(p => p.plan_id === activePlanId), [plans, activePlanId]);
  const meta = activePlan?.story_meta;
  const activeVersionLabel = activePlanId ? (activePlanVersion ?? "-") : "-";

  // --- API Functions (Supabase統合版) ---

  const buildApiHeaders = async (sId?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: any = { "Content-Type": "application/json" };
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
    if (sId) headers["x-store-id"] = sId;
    return headers;
  };

  const fetchMyStores = async () => {
    setLoadingStores(true);
    try {
      const { data, error } = await supabase.from("my_store_roles_view").select("*");
      if (error) throw error;
      setStoreOptions(data || []);
    } catch (e) { console.error(e); } finally { setLoadingStores(false); }
  };

  const loadPlans = async (sId: string) => {
    if (!sId) return;
    setLoadingPlans(true);
    try {
      const { data, error } = await supabase
        .from("sns_post_plans")
        .select("*")
        .eq("store_id", sId)
        .order("scheduled_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setPlans(data || []);
    } catch (e) { console.error(e); } finally { setLoadingPlans(false); }
  };

  // ... (その他の saveEmotionProfile, generateStoryPreview 等の関数をここに配置)
  // スペースの都合上、UI部分を優先しますが、fetchをbuildApiHeadersを使う形に置換してください

  const sendPlanFeedback = async (type: string, extra: any = {}) => {
    if (!activePlanId || !storeId) return;
    setSendingFeedback(true);
    try {
      const url = `${functionsBaseUrl}/sns-preview-feedback`;
      const headers = await buildApiHeaders(storeId);
      const payload = {
        store_id: storeId,
        plan_id: activePlanId,
        feedback_type: type,
        comment: feedbackComment,
        if_version: activePlanVersion,
        ...extra,
      };
      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Feedback failed");
      alert(`反映しました: ${type}`);
      setFeedbackComment("");
      await loadPlans(storeId);
    } catch (e: any) { alert(e.message); } finally { setSendingFeedback(false); }
  };

  useEffect(() => { fetchMyStores(); }, []);
  useEffect(() => { if (storeId) loadPlans(storeId); }, [storeId]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <header className="flex flex-wrap items-end justify-between gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-black rounded-xl">
            <Settings className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">SNS AI DIRECTOR</h1>
            <p className="text-xs text-gray-500 font-medium">STORIES & PLANS MANAGEMENT</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="rounded-xl border-gray-200 border px-4 py-2.5 min-w-[320px] text-sm font-medium shadow-sm focus:ring-2 focus:ring-black outline-none transition-all"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            disabled={loadingStores}
          >
            {storeOptions.length === 0 ? (
              <option value="">{loadingStores ? "店舗一覧を取得中..." : "店舗を選択してください"}</option>
            ) : (
              <>
                <option value="">店舗を選択</option>
                {storeOptions.map((s) => (
                  <option key={s.store_id} value={s.store_id}>
                    {s.store_name ? `${s.store_id}（${s.store_name}）` : s.store_id} [{s.role}]
                  </option>
                ))}
              </>
            )}
          </select>
          <button
            className="p-2.5 rounded-xl border hover:bg-gray-50 transition-colors"
            onClick={fetchMyStores}
            disabled={loadingStores}
          >
            <RefreshCw className={`w-5 h-5 ${loadingStores ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* REMAINDER OF UI (Emotion, Media, Previews, Plans) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: SETTINGS */}
        <div className="lg:col-span-4 space-y-6">
          {/* Emotion Profile */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2"><Heart className="w-4 h-4 text-red-500" /> 感情設計</h2>
              <button className="text-xs bg-black text-white px-3 py-1.5 rounded-lg disabled:opacity-30" disabled={!canEditEmotionProfile}>
                <Save className="w-3 h-3 inline mr-1" /> 保存
              </button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <SliderRow id="feel_gratitude" label="感謝" value={emotionProfile?.feel_gratitude} />
              <SliderRow id="feel_excitement" label="ワクワク" value={emotionProfile?.feel_excitement} />
              <SliderRow id="feel_nostalgia" label="懐かしさ" value={emotionProfile?.feel_nostalgia} />
              <SliderRow id="feel_sincerity" label="誠実さ" value={emotionProfile?.feel_sincerity} />
              {/* 他のスライダーも同様に展開 */}
            </div>
          </section>

          {/* Media Profile */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4 text-blue-500" /> 生成スタイル</h2>
              <button className="text-xs bg-black text-white px-3 py-1.5 rounded-lg">
                保存
              </button>
            </div>
            <div className="space-y-2">
               <SliderRow id="realism_level" label="実写感" value={mediaProfile?.realism_level} />
               <div className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300 mt-4">
                 <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Style Ratio</p>
                 <SliderRow id="style_photo_ratio" label="写真 %" value={mediaProfile?.style_photo_ratio} />
                 <SliderRow id="style_video_ratio" label="動画 %" value={mediaProfile?.style_video_ratio} />
               </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: ACTIONS & LISTS */}
        <div className="lg:col-span-8 space-y-6">
          {/* A-2 Story Creation */}
          <section className="rounded-2xl border bg-white p-6 shadow-sm border-l-4 border-l-black">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-bold">ストーリー候補生成</h2>
                <p className="text-sm text-gray-500">現在の空き状況から投稿をプランニングします</p>
              </div>
              <button className="text-sm font-medium border px-4 py-2 rounded-xl hover:bg-gray-50">
                手動Dispatcher実行
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
                    <select className="w-full border rounded-lg p-2 text-sm font-bold">
                      <option value="available">空きあり</option>
                      <option value="full">満席</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Time Slot</label>
                    <input className="w-full border rounded-lg p-2 text-sm" placeholder="19:00〜" />
                  </div>
                </div>
                <button className="w-full py-3 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-zinc-800 transition-all">
                  <Play className="w-4 h-4 fill-current" /> 候補を生成する
                </button>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border overflow-y-auto max-h-[300px]">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Generated Previews</h3>
                {storyPreviews.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 italic text-sm">候補がありません</div>
                ) : (
                  storyPreviews.map(p => (
                    <div key={p.preview_id} className="bg-white p-3 rounded-xl border mb-2 shadow-sm">
                      <p className="text-xs font-bold mb-1">{p.caption?.substring(0, 30)}...</p>
                      <button className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-1 rounded">予約に採用</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Post Plans Table */}
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Clock className="w-5 h-5" /> 予約プラン一覧</h2>
              <button className="p-2 hover:bg-gray-100 rounded-lg" onClick={() => loadPlans(storeId)}><RefreshCw className="w-4 h-4" /></button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black">
                  <tr>
                    <th className="p-3">Scheduled At</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Retry</th>
                    <th className="p-3">Version</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {plans.map(p => (
                    <tr 
                      key={p.plan_id} 
                      className={`cursor-pointer transition-colors ${activePlanId === p.plan_id ? "bg-blue-50/50" : "hover:bg-gray-50"}`}
                      onClick={() => {
                        setActivePlanId(p.plan_id);
                        setActivePlanVersion(getStoryMetaVersion(p.story_meta));
                        setRescheduleLocal(toLocalInputValue(p.scheduled_at));
                      }}
                    >
                      <td className="p-3 font-medium">{new Date(p.scheduled_at).toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-gray-400">{p.retry_count}/{p.retry_max}</td>
                      <td className="p-3 font-bold text-gray-400">v{getStoryMetaVersion(p.story_meta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Selection Actions */}
            {activePlanId && (
              <div className="mt-4 p-4 bg-zinc-900 rounded-2xl text-white animate-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold uppercase tracking-widest">Plan Selected: {activePlanId.slice(0,8)}</span>
                  </div>
                  <button onClick={() => sendPlanFeedback("approve")} className="bg-white text-black text-xs font-black px-4 py-2 rounded-lg hover:bg-green-400 transition-colors">
                    APPROVE / 承認
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Feedback</label>
                    <input 
                      className="w-full bg-zinc-800 border-none rounded-lg p-2 text-sm focus:ring-1 focus:ring-white" 
                      placeholder="AIへの修正指示..."
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button onClick={() => sendPlanFeedback("shorter_text")} className="flex-1 bg-zinc-800 py-2 rounded-lg text-[10px] font-bold hover:bg-zinc-700">短く</button>
                    <button onClick={() => sendPlanFeedback("more_emoji")} className="flex-1 bg-zinc-800 py-2 rounded-lg text-[10px] font-bold hover:bg-zinc-700">絵文字↑</button>
                    <button onClick={() => sendPlanFeedback("img_regen_variation")} className="flex-1 bg-blue-600 py-2 rounded-lg text-[10px] font-bold hover:bg-blue-500">再生成</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
