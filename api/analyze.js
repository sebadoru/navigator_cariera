// api/analyze.js — Vercel Serverless Function
// Proxiază cererea către Anthropic API (cheia e ascunsă pe server)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { riasec, values, workstyle, skills } = req.body;
  if (!riasec) return res.status(400).json({ error: "Missing riasec data" });

  const ALL_IDS = [
    "software_dev","data_scientist","ux_designer","medic","psychologist",
    "architect","lawyer","marketing","teacher","financial_analyst",
    "civil_engineer","graphic_designer","cybersecurity","ai_engineer",
    "pharmacist","biologist","social_worker","environmental","journalist"
  ];

  const DOMAIN_CAT = {
    software_dev:"IT", data_scientist:"IT", cybersecurity:"IT", ai_engineer:"IT",
    ux_designer:"Design", graphic_designer:"Design",
    medic:"Sanatate", psychologist:"Sanatate", pharmacist:"Sanatate",
    architect:"Arhitectura", civil_engineer:"Inginerie",
    lawyer:"Drept", marketing:"Business", financial_analyst:"Business",
    teacher:"Educatie", social_worker:"Educatie",
    journalist:"Media", biologist:"Stiinta", environmental:"Stiinta",
  };

  const prompt = `Career advisor Romania. Reply ONLY with valid JSON, no text before/after, no backticks.
RIASEC: R${riasec.R} I${riasec.I} A${riasec.A} S${riasec.S} E${riasec.E} C${riasec.C}
Values: ${(values||[]).join(",")} | Style: ${(workstyle||[]).join("|")} | Skills: ${(skills||[]).slice(0,6).join(",")}
Available IDs: ${ALL_IDS.join(",")}
{"summary":"max 1 sentence in Romanian","traits":["T1","T2","T3"],"matches":[{"id":"id1","pct":95,"fit":"max 6 words in Romanian why"},{"id":"id2","pct":88,"fit":"..."},{"id":"id3","pct":82,"fit":"..."},{"id":"id4","pct":76,"fit":"..."},{"id":"id5","pct":70,"fit":"..."}]}
Pick exactly 5 IDs from available list. Keep ALL string values SHORT.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);

    // Add domain category for roadmap selection (done client-side)
    const enriched = {
      profile_summary: parsed.summary || parsed.profile_summary || "",
      dominant_traits: parsed.traits || parsed.dominant_traits || [],
      matches: parsed.matches || [],
      riasec_profile: riasec,
      isOffline: false,
    };

    return res.status(200).json(enriched);
  } catch (err) {
    console.error("API Error:", err.message);
    // Return 500 so client falls back to offline algorithm
    return res.status(500).json({ error: err.message });
  }
}
