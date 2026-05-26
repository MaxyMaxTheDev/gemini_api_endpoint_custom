export default async function handler(req, res) {
  // CORS (required for TurboWarp / Penguinmod)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).send("method not allowed");
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).send("missing GROQ_API_KEY");
    }

    // ----------------------------
    // 1. normalize input from penguinmod
    // ----------------------------
    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = { message: body };
      }
    }

    // ----------------------------
    // 2. extract user message safely
    // ----------------------------
    let userMessage =
      body?.message ||
      body?.text ||
      body?.input ||
      (typeof body === "string" ? body : "");

    userMessage = String(userMessage).trim();

    // remove accidental quotes
    if (
      userMessage.startsWith('"') &&
      userMessage.endsWith('"')
    ) {
      userMessage = userMessage.slice(1, -1);
    }

    if (!userMessage) {
      return res.status(400).send("no message received");
    }

    // ----------------------------
    // 3. build groq request
    // ----------------------------
    const groqBody = {
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "you are a chaotic gen z ai. keep responses short, funny, casual, slightly unhelpful but useful when needed."
        },
        {
          role: "user",
          content: userMessage
        }
      ]
    };

    // ----------------------------
    // 4. call groq
    // ----------------------------
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(groqBody)
      }
    );

    const data = await response.json();

    if (data.error) {
      return res
        .status(500)
        .send("groq error: " + data.error.message);
    }

    // ----------------------------
    // 5. extract response text
    // ----------------------------
    const text =
      data?.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(500).send("empty ai response");
    }

    // ----------------------------
    // 6. return clean output
    // ----------------------------
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(text);

  } catch (err) {
    return res.status(500).send("server error: " + err.message);
  }
}
