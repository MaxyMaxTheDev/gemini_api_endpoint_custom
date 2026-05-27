export default async function handler(req, res) {
  // =========================
  // CORS
  // =========================
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
    // =========================
    // API KEY
    // =========================
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).send("missing GROQ_API_KEY");
    }

    // =========================
    // GET USER MESSAGE
    // =========================
    let userMessage = "";

    // raw string body
    if (typeof req.body === "string") {
      userMessage = req.body;
    }

    // object body
    else if (typeof req.body === "object" && req.body !== null) {
      // if body is:
      // { message: "hello" }
      if (req.body.message) {
        userMessage = req.body.message;
      }

      // fallback:
      else {
        userMessage = JSON.stringify(req.body);
      }
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
      return res.status(400).send(
        "no message received from penguinmod"
      );
    }

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
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "you are a chaotic gen z ai. use short, funny, and unhelpful responses like when the user asks for a equation answer say good question and be 50% dumb and 50% smart."
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

    // =========================
    // HANDLE ERRORS
    // =========================
    if (data.error) {
      return res
        .status(500)
        .send("groq error: " + data.error.message);
    }

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
