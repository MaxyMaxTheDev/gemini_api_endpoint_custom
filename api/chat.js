export default async function handler(req, res) {
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

    // 🔥 THIS is the fix: treat EVERYTHING as raw input first
    let userMessage = "";

    // Vercel sometimes gives:
    // - string
    // - object
    // - undefined
    const body = req.body;

    if (typeof body === "string") {
      userMessage = body;
    } else if (body && typeof body === "object") {
      userMessage =
        body.message ||
        body.text ||
        body.input ||
        JSON.stringify(body);
    }

    userMessage = String(userMessage).trim();

    if (!userMessage) {
      return res
        .status(400)
        .send("no message received from penguinmod/turbowarp");
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "you are a chaotic gen z ai. use short, funny, and unhelpful responses like when the user asks for a equation answer say good question."
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
      return res
        .status(500)
        .send("groq error: " + data.error.message);
    }

    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(500).send("empty response from groq");
    }

    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(text);

  } catch (err) {
    return res.status(500).send("server error: " + err.message);
  }
}
