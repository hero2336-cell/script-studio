import crypto from "crypto";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { password } = req.body;
  const correct = process.env.TEAM_PASSWORD;

  if (!correct) return res.status(500).json({ error: "서버 설정 오류" });

  if (password === correct) {
    const token = crypto
      .createHmac("sha256", process.env.TOKEN_SECRET || "fallback-secret")
      .update(password + "-" + process.env.TEAM_PASSWORD)
      .digest("hex");
    return res.status(200).json({ token });
  }

  return res.status(401).json({ error: "Unauthorized" });
}
