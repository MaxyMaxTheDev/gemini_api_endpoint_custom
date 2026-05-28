export default async function handler(req, res) {
  // =========================
  // CORS
  // =========================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).send("method not allowed");
  }

  try {
    // =========================
    // API KEY
    // =========================
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).send("missing GROQ_API_KEY");
    }

    // =========================
    // GET RAW MESSAGE
    // =========================
    let userMessage = "";

    // raw string body
    if (typeof req.body === "string") {
      userMessage = req.body;
    }

    // weird object fallback
    else if (
      typeof req.body === "object" &&
      req.body !== null
    ) {
      userMessage = JSON.stringify(req.body);
    }

    userMessage = String(userMessage).trim();

    // remove accidental quotes
    if (
      userMessage.startsWith('"') &&
      userMessage.endsWith('"')
    ) {
      userMessage = userMessage.slice(1, -1);
    }

    if (!userMessage) {
      userMessage = "blank message";
    }

    // =========================
    // BUILD GROQ REQUEST
    // =========================
    const groqBody = {
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "you are a chaotic gen z ai. use short, funny, and unhelpful responses. when the user asks for a math equation, respond with 'good question'. be 50% dumb and 50% smart and if you see json stuff dont say bruh, them brackets tho just look for content: and whatever shows after that is the user message."
        },
        {
          role: "user",
          content: userMessage
        }
      ]
    };

    // =========================
    // SEND TO GROQ
    // =========================
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(groqBody)
      }
    );

    const data = await response.json();

    // =========================
    // HANDLE ERRORS
    // =========================
    if (data.error) {
      return res
        .status(500)
        .send("groq error: " + data.error.message);
    }

    // =========================
    // GET AI RESPONSE
    // =========================
    const aiText =
      data?.choices?.[0]?.message?.content;

    if (!aiText) {
      return res.status(500).send("empty ai response");
    }

    // =========================
    // RETURN CLEAN TEXT
    // =========================
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(aiText);

  } catch (err) {
    return res.status(500).send(
      "server error: " + err.message
    );
  }
}
