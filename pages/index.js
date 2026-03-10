import { useState, useEffect } from "react";
import Head from "next/head";

const CHANNELS = ["닥터레시피", "82초처방", "기타"];
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });

// 서버 API 라우트를 통해 Claude 호출 (API 키 서버사이드 보호)
async function callClaude(prompt, system, useWebSearch = false) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, system, useWebSearch }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API 오류 (${res.status})`);
  }
  const data = await res.json();
  if (!data.text) throw new Error("빈 응답");
  return data.text;
}

function parseJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{") !== -1 ? clean.indexOf("{") : clean.indexOf("[");
  const e = clean.lastIndexOf("}") !== -1 ? clean.lastIndexOf("}") : clean.lastIndexOf("]");
  return JSON.parse(clean.slice(s, e + 1));
}

// ── News Panel ──────────────────────────────────────────────
function NewsPanel({ onUseNews }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  useEffect(() => {
    const cached = localStorage.getItem("news_cache");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.date === today() && parsed.items?.length) {
        setNews(parsed.items);
        setLastFetched(parsed.date);
      }
    }
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const prompt = `오늘(${today()}) 기준 한국 의료계 최신 뉴스 5가지를 웹 검색으로 찾아주세요.
의료정책, 신약, 수술법, 건강보험, 질병 이슈 등 다양하게 포함해 주세요.
반드시 JSON 배열만 응답하세요. 마크다운 없이 순수 JSON:
[{"title":"제목","summary":"2~3문장 요약","source":"출처","category":"카테고리","relevance":"82초처방 콘텐츠로 활용 가능한 이유 1문장"}]`;
      const text = await callClaude(prompt,
        "당신은 한국 의료 뉴스 큐레이터입니다. 웹 검색으로 오늘 날짜의 최신 의료 뉴스를 찾아 JSON으로만 응답합니다.", true);
      const clean = text.replace(/```json|```/g, "").trim();
      const s = clean.indexOf("["), e = clean.lastIndexOf("]");
      if (s === -1 || e === -1) throw new Error("뉴스 JSON 파싱 실패");
      const parsed = JSON.parse(clean.slice(s, e + 1));
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("뉴스 데이터 없음");
      setNews(parsed);
      setLastFetched(today());
      localStorage.setItem("news_cache", JSON.stringify({ date: today(), items: parsed }));
    } catch (e) { console.error(e); alert("뉴스를 가져오는 중 오류가 발생했습니다: " + e.message); }
    setLoading(false);
  };

  const makeDraft = async (item) => {
    setDrafting(item.title);
    try {
      const prompt = `채널: 82초처방 (서동주 원장, 혈관외과/심장외과 전문의, 다리핏의원 대표원장)
뉴스 주제: ${item.title}
뉴스 요약: ${item.summary}
이 뉴스를 82초 분량의 유튜브 쇼츠/숏폼 스크립트로 만들어주세요.
JSON만 응답 (마크다운 없이):
{"hook":"(충격적/호기심 유발 오프닝 1~2문장)","main":"(뉴스 핵심 + 전문의 코멘트 3~5문장)","cta":"(구독/다음 영상 유도 1문장)","title":"(유튜브 제목 후보)","thumbnail":"(썸네일 문구)"}`;
      const text = await callClaude(prompt, "82초처방 유튜브 채널 전담 스크립트 작가입니다.");
      const parsed = parseJSON(text);
      onUseNews({ ...parsed, newsTitle: item.title });
    } catch (e) { console.error(e); }
    setDrafting(null);
  };

  const catColor = { "의료정책": "#3b5bdb", "신약": "#2f9e44", "수술/시술": "#e67700", "건강보험": "#862e9c", "질병": "#c92a2a", "기타": "#495057" };

  return (
    <div style={{ padding: "24px 20px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>📰 오늘의 의료 뉴스</div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>82초처방 콘텐츠 소재 발굴</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          {lastFetched && <div style={{ fontSize: 11, color: "#555" }}>마지막 업데이트: {lastFetched}</div>}
          <button onClick={fetchNews} disabled={loading}
            style={{ background: loading ? "#2a2a3a" : "#6c63ff", color: loading ? "#666" : "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, cursor: loading ? "default" : "pointer", fontWeight: 600 }}>
            {loading ? "⏳ 검색 중..." : "🔄 오늘 뉴스 가져오기"}
          </button>
        </div>
      </div>

      {news.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#444" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ color: "#888" }}>버튼을 눌러 오늘의 의료 뉴스를 가져오세요</div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>AI가 최신 의료 뉴스를 검색해 82초처방 소재로 정리해드립니다</div>
        </div>
      )}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#666" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🌐</div>
          <div>AI가 오늘의 의료 뉴스를 검색하고 있습니다...</div>
        </div>
      )}
      {news.map((item, i) => (
        <div key={i} style={{ background: "#1a1a24", border: "1px solid #2a2a38", borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ background: catColor[item.category] || "#495057", color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{item.category}</span>
            <span style={{ fontSize: 11, color: "#555" }}>{item.source}</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#fff", marginBottom: 6, lineHeight: 1.4 }}>{item.title}</div>
          <div style={{ fontSize: 13, color: "#999", lineHeight: 1.6, marginBottom: 10 }}>{item.summary}</div>
          <div style={{ background: "#12121c", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#7c6fff" }}>💡 {item.relevance}</div>
          <button onClick={() => makeDraft(item)} disabled={!!drafting}
            style={{ background: drafting === item.title ? "#2a2a3a" : "#1e1a40", color: drafting === item.title ? "#666" : "#c0baff", border: "1px solid " + (drafting === item.title ? "#2a2a3a" : "#4a4080"), borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: drafting === item.title ? "default" : "pointer", fontWeight: 600, width: "100%" }}>
            {drafting === item.title ? "⏳ 스크립트 생성 중..." : "✍️ 이 뉴스로 82초 스크립트 만들기"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("news");
  const [scripts, setScripts] = useState([]);
  const [current, setCurrent] = useState(null);
  const [activeChannel, setActiveChannel] = useState("전체");
  const [activeSection, setActiveSection] = useState("hook");
  const [aiLoading, setAiLoading] = useState(false);
  const [titleLoading, setTitleLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("scripts");
    if (saved) setScripts(JSON.parse(saved));
  }, []);

  const saveScripts = (updated) => {
    setScripts(updated);
    localStorage.setItem("scripts", JSON.stringify(updated));
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const newScript = (prefill = null) => {
    const s = {
      id: genId(), title: prefill?.title || "새 스크립트", channel: "82초처방",
      content: { hook: prefill?.hook || "", main: prefill?.main || "", cta: prefill?.cta || "" },
      thumbnail: prefill?.thumbnail || "",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    setCurrent(s); setActiveSection("hook"); setSuggestions(null);
    setShowAiPanel(false); setAiTopic(""); setTab("editor");
  };

  const openScript = (s) => {
    setCurrent({ ...s, content: { ...s.content } });
    setActiveSection("hook"); setSuggestions(null); setShowAiPanel(false); setTab("editor");
  };

  const saveScript = () => {
    if (!current) return;
    const updated = { ...current, updatedAt: new Date().toISOString() };
    const exists = scripts.find(s => s.id === updated.id);
    const next = exists ? scripts.map(s => s.id === updated.id ? updated : s) : [updated, ...scripts];
    saveScripts(next); showToast("저장되었습니다 ✓");
  };

  const deleteScript = (id) => { saveScripts(scripts.filter(s => s.id !== id)); showToast("삭제되었습니다"); };
  const updateContent = (field, val) => setCurrent(c => ({ ...c, content: { ...c.content, [field]: val } }));

  const generateDraft = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    try {
      const prompt = `채널: ${current?.channel || "82초처방"}\n주제: ${aiTopic}\nJSON만 응답:\n{"hook":"(15초 오프닝 1~2문장)","main":"(핵심 설명 3~5문장)","cta":"(구독/좋아요 유도 1문장)"}`;
      const text = await callClaude(prompt);
      const parsed = parseJSON(text);
      setCurrent(c => ({ ...c, title: aiTopic, content: { hook: parsed.hook || "", main: parsed.main || "", cta: parsed.cta || "" } }));
      showToast("AI 초안이 생성되었습니다 ✨"); setShowAiPanel(false);
    } catch { showToast("생성 중 오류가 발생했습니다"); }
    setAiLoading(false);
  };

  const generateTitles = async () => {
    if (!current) return;
    setTitleLoading(true);
    try {
      const prompt = `후크: ${current.content.hook}\n본론: ${current.content.main}\nJSON만 응답:\n{"titles":["제목1","제목2","제목3"],"thumbnails":["썸네일1","썸네일2","썸네일3"]}`;
      const text = await callClaude(prompt, "클릭률 높은 의학 유튜브 제목과 썸네일 문구 전문가입니다.");
      setSuggestions(parseJSON(text));
    } catch { showToast("제안 생성 중 오류가 발생했습니다"); }
    setTitleLoading(false);
  };

  const filtered = activeChannel === "전체" ? scripts : scripts.filter(s => s.channel === activeChannel);
  const sectionLabel = { hook: "🎣 후크", main: "📖 본론", cta: "📣 CTA" };
  const sectionPlaceholder = { hook: "시청자의 시선을 사로잡는 오프닝...", main: "핵심 정보와 설명...", cta: "구독, 좋아요, 다음 영상 유도..." };

  const navBtn = (id, icon, label) => (
    <button onClick={() => setTab(id)}
      style={{ flex: 1, background: tab === id ? "#6c63ff" : "transparent", color: tab === id ? "#fff" : "#666", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 12, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>{label}
    </button>
  );

  return (
    <>
      <Head>
        <title>Script Studio — 82초처방</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="82초처방 유튜브 스크립트 매니저" />
      </Head>
      <div style={{ background: "#0f0f13", minHeight: "100vh", color: "#e8e8f0", fontFamily: "'Segoe UI', sans-serif", paddingBottom: 72 }}>
        {toast && (
          <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#6c63ff", color: "#fff", padding: "8px 20px", borderRadius: 20, fontSize: 13, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(108,99,255,0.4)" }}>{toast}</div>
        )}

        {tab === "news" && <NewsPanel onUseNews={(data) => { newScript(data); showToast("뉴스 스크립트가 생성되었습니다 ✨"); }} />}

        {tab === "list" && (
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>✍️ 스크립트 보관함</div>
              <button onClick={() => newScript()} style={{ background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>+ 새 스크립트</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {["전체", ...CHANNELS].map(ch => (
                <button key={ch} onClick={() => setActiveChannel(ch)}
                  style={{ background: activeChannel === ch ? "#6c63ff" : "#1e1e2a", color: activeChannel === ch ? "#fff" : "#888", border: "none", borderRadius: 20, padding: "5px 13px", fontSize: 12, cursor: "pointer" }}>{ch}</button>
              ))}
            </div>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
                <div style={{ color: "#888" }}>아직 스크립트가 없습니다</div>
              </div>
            ) : filtered.map(s => (
              <div key={s.id} onClick={() => openScript(s)}
                style={{ background: "#1a1a24", borderRadius: 12, padding: "14px 16px", marginBottom: 10, cursor: "pointer", border: "1px solid #2a2a38", position: "relative" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#6c63ff"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a38"}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: "#555" }}>{(s.content?.hook || "").slice(0, 55)}...</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, marginLeft: 10 }}>
                    <span style={{ background: "#2a2a3a", color: "#aaa", fontSize: 11, padding: "2px 7px", borderRadius: 10 }}>{s.channel}</span>
                    <span style={{ fontSize: 11, color: "#555" }}>{fmtDate(s.updatedAt)}</span>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteScript(s.id); }}
                  style={{ position: "absolute", top: 8, right: 8, background: "transparent", border: "none", color: "#333", cursor: "pointer", fontSize: 16 }}
                  onMouseEnter={e => e.currentTarget.style.color = "#ff4466"}
                  onMouseLeave={e => e.currentTarget.style.color = "#333"}>×</button>
              </div>
            ))}
          </div>
        )}

        {tab === "editor" && current && (
          <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
              <button onClick={() => setTab("list")} style={{ background: "#1e1e2a", border: "none", color: "#888", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 12 }}>← 목록</button>
              <input value={current.title} onChange={e => setCurrent(c => ({ ...c, title: e.target.value }))}
                style={{ flex: 1, background: "#1a1a24", border: "1px solid #2a2a38", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 15, fontWeight: 600 }} />
              <select value={current.channel} onChange={e => setCurrent(c => ({ ...c, channel: e.target.value }))}
                style={{ background: "#1e1e2a", border: "1px solid #2a2a38", color: "#aaa", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>
                {CHANNELS.map(ch => <option key={ch}>{ch}</option>)}
              </select>
              <button onClick={saveScript} style={{ background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>저장</button>
            </div>

            {current.thumbnail && (
              <div style={{ background: "#1e0a30", border: "1px solid #4a2a5a", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#888" }}>썸네일 문구</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e0a0ff", marginTop: 2 }}>{current.thumbnail}</div>
              </div>
            )}

            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <button onClick={() => setShowAiPanel(p => !p)}
                style={{ background: showAiPanel ? "#3d3880" : "#1e1e2a", color: showAiPanel ? "#c0baff" : "#888", border: "1px solid " + (showAiPanel ? "#6c63ff" : "#2a2a38"), borderRadius: 8, padding: "7px 13px", fontSize: 12, cursor: "pointer" }}>✨ AI 초안</button>
              <button onClick={generateTitles} disabled={titleLoading}
                style={{ background: "#1e1e2a", color: "#888", border: "1px solid #2a2a38", borderRadius: 8, padding: "7px 13px", fontSize: 12, cursor: "pointer" }}>{titleLoading ? "생성 중..." : "🎯 제목/썸네일 제안"}</button>
            </div>

            {showAiPanel && (
              <div style={{ background: "#1a1a2e", border: "1px solid #3d3880", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#aaa", marginBottom: 7 }}>주제를 입력하면 AI가 섹션별 초안을 작성합니다</div>
                <div style={{ display: "flex", gap: 7 }}>
                  <input value={aiTopic} onChange={e => setAiTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && generateDraft()}
                    placeholder="예) 하지정맥류 방치하면 생기는 일 5가지"
                    style={{ flex: 1, background: "#12121c", border: "1px solid #3a3a52", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13 }} />
                  <button onClick={generateDraft} disabled={aiLoading}
                    style={{ background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>{aiLoading ? "⏳" : "생성"}</button>
                </div>
              </div>
            )}

            {suggestions && (
              <div style={{ background: "#1a1a2e", border: "1px solid #3d3880", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#c0baff", marginBottom: 8 }}>🎯 제목 & 썸네일 제안</div>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 5 }}>제목 후보 (클릭해서 적용)</div>
                {suggestions.titles?.map((t, i) => (
                  <div key={i} onClick={() => { setCurrent(c => ({ ...c, title: t })); showToast("제목이 적용되었습니다"); }}
                    style={{ background: "#12121c", border: "1px solid #2a2a3a", borderRadius: 6, padding: "7px 10px", marginBottom: 5, cursor: "pointer", fontSize: 13, color: "#ddd" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#6c63ff"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a3a"}>{t}</div>
                ))}
                <div style={{ fontSize: 11, color: "#555", marginBottom: 5, marginTop: 8 }}>썸네일 문구</div>
                {suggestions.thumbnails?.map((t, i) => (
                  <div key={i} style={{ background: "#1e0a30", border: "1px solid #4a2a5a", borderRadius: 6, padding: "7px 10px", marginBottom: 5, fontSize: 14, fontWeight: 700, color: "#e0a0ff" }}>{t}</div>
                ))}
                <button onClick={() => setSuggestions(null)} style={{ background: "transparent", border: "none", color: "#444", fontSize: 11, cursor: "pointer", marginTop: 3 }}>닫기</button>
              </div>
            )}

            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {["hook", "main", "cta"].map(s => (
                <button key={s} onClick={() => setActiveSection(s)}
                  style={{ background: activeSection === s ? "#6c63ff" : "#1e1e2a", color: activeSection === s ? "#fff" : "#888", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 14, cursor: "pointer", fontWeight: activeSection === s ? 600 : 400 }}>{sectionLabel[s]}</button>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              <textarea value={current.content[activeSection] || ""} onChange={e => updateContent(activeSection, e.target.value)}
                placeholder={sectionPlaceholder[activeSection]}
                style={{ width: "100%", minHeight: 300, background: "#1a1a24", border: "1px solid #2a2a38", borderRadius: 10, padding: 14, color: "#e0e0ee", fontSize: 15, lineHeight: 1.7, resize: "vertical", boxSizing: "border-box", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "#6c63ff"}
                onBlur={e => e.target.style.borderColor = "#2a2a38"} />
            </div>
            <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
              {["hook", "main", "cta"].map(s => (
                <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: (current.content?.[s]?.length || 0) > 10 ? "#6c63ff" : "#2a2a3a" }} />
              ))}
            </div>
          </div>
        )}

        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0f0f13", borderTop: "1px solid #1e1e2a", display: "flex", padding: "6px 20px", gap: 4 }}>
          {navBtn("news", "📰", "오늘 뉴스")}
          {navBtn("list", "📂", "보관함")}
          {navBtn("editor", "✍️", "에디터")}
        </div>
      </div>
    </>
  );
}
