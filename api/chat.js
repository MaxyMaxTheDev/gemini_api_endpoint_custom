export default async function handler(req, res) {
  // CORS
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

    // -----------------------------
    // extract message safely
    // -----------------------------
    let userMessage = "";

    const body = req.body;

    if (typeof body === "string") {
      userMessage = body;
    } else if (body && typeof body === "object") {
      userMessage =
        body.message ||
        body.text ||
        body.input ||
        "";
    }

    userMessage = String(userMessage).trim();

    // remove accidental wrapping quotes
    if (
      userMessage.startsWith('"') &&
      userMessage.endsWith('"')
    ) {
      userMessage = userMessage.slice(1, -1);
    }

    if (!userMessage) {
      return res.status(400).send("no message received from penguinmod");
    }

    // -----------------------------
    // call groq
    // -----------------------------
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "you are a chaotic gen z ai. use short, funny, and unhelpful responses. when the user asks for a math equation, respond with 'good question'. be 50% dumb and 50% smart."
            },
            {
              role: "user",
              content: userMessage
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(500).send("groq error: " + data.error.message);
    }

    const aiText = data?.choices?.[0]?.message?.content;

    if (!aiText) {
      return res.status(500).send("empty ai response");
    }

    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(aiText);

  } catch (err) {
    return res.status(500).send("server error: " + err.message);
  }
}
