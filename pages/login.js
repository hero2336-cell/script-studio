import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      const data = await res.json();
      document.cookie = `ss_token=${data.token}; path=/; SameSite=Strict`;
      router.push("/");
    } else {
      setError("비밀번호가 올바르지 않습니다.");
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "#0f0f13", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: "#1a1a24", border: "1px solid #2a2a38", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 360, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>✍️</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Script Studio</div>
        <div style={{ fontSize: 13, color: "#555", marginBottom: 32 }}>82초처방 팀 전용</div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="팀 비밀번호 입력" style={{ width: "100%", background: "#12121c", border: "1px solid " + (error ? "#ff4466" : "#2a2a38"), borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 15, boxSizing: "border-box", outline: "none", marginBottom: 8 }} autoFocus />
        {error && <div style={{ fontSize: 12, color: "#ff4466", marginBottom: 12, textAlign: "left" }}>{error}</div>}
        <button onClick={handleLogin} disabled={loading || !pw} style={{ width: "100%", background: loading || !pw ? "#2a2a3a" : "#6c63ff", color: loading || !pw ? "#555" : "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 15, fontWeight: 600, cursor: loading || !pw ? "default" : "pointer", marginTop: 4 }}>{loading ? "확인 중..." : "입장하기"}</button>
      </div>
    </div>
  );
}
