export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).send("This URL is for POST APIs only.");
  }

  try {
    let body = req.body;

    // handle broken penguinmod payloads
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = { message: body }; // raw text fallback
      }
    }

    // support multiple possible formats
    const message =
      body?.message ||
      body?.text ||
      body?.input ||
      body;

    if (!message) {
      return res.status(400).send(
        "missing message (debug: " + JSON.stringify(req.body) + ")"
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: String(message) }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(p => p.text || "")
        .join("") || "";

    if (!text) {
      return res.status(500).send(
        "empty gemini response (debug: " + JSON.stringify(data) + ")"
      );
    }

    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(text);

  } catch (err) {
    return res.status(500).send("server error: " + err.message);
  }
}
