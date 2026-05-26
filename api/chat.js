export default async function handler(req, res) {
  // CORS (required for browser + penguinmod)
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

    // =========================
    // STEP 1: normalize input
    // =========================
    let body = req.body;

    // handle stringified JSON
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = { message: body };
      }
    }

    // handle completely empty body
    if (!body) {
      return res.status(400).send("empty request body");
    }

    // =========================
    // STEP 2: extract message safely
    // =========================
    let messages = null;

    // already correct format
    if (Array.isArray(body.messages)) {
      messages = body.messages;
    }

    // single message format
    else if (body.message) {
      messages = [
        {
          role: "user",
          content: String(body.message)
        }
      ];
    }

    // fallback text field
    else if (body.text) {
      messages = [
        {
          role: "user",
          content: String(body.text)
        }
      ];
    }

    // last fallback: raw object string
    else {
      messages = [
        {
          role: "user",
          content: JSON.stringify(body)
        }
      ];
    }

    // safety check
    if (!messages) {
      return res.status(400).send("could not parse messages");
    }

    // =========================
    // STEP 3: call groq
    // =========================
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
          messages
        })
      }
    );

    const data = await response.json();

    // groq error handling
    if (data.error) {
      return res.status(500).send("groq error: " + data.error.message);
    }

    // =========================
    // STEP 4: extract output
    // =========================
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(500).send("empty response from groq");
    }

    // return clean text for penguinmod
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(text);

  } catch (err) {
    return res.status(500).send("server error: " + err.message);
  }
}
