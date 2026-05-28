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
    // GET API KEY
    // =========================
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).send("missing GROQ_API_KEY");
    }

    // =========================
    // FORCE RAW BODY READ
    // =========================
    let rawBody = "";

    // if Vercel already parsed it
    if (typeof req.body === "string") {
      rawBody = req.body;
    }

    // if body became object
    else if (typeof req.body === "object" && req.body !== null) {
      rawBody =
        req.body.message ||
        req.body.text ||
        req.body.input ||
        JSON.stringify(req.body);
    }

    // fallback stream read
    else {
      rawBody = await new Promise((resolve) => {
        let data = "";

        req.on("data", chunk => {
          data += chunk;
        });

        req.on("end", () => {
          resolve(data);
        });

        req.on("error", () => {
          resolve("");
        });
      });
    }

    // =========================
    // CLEAN MESSAGE
    // =========================
    let userMessage = String(rawBody).trim();

    // remove accidental quotes
    if (
      userMessage.startsWith('"') &&
      userMessage.endsWith('"')
    ) {
      userMessage = userMessage.slice(1, -1);
    }

    // remove accidental JSON wrapping
    try {
      const parsed = JSON.parse(userMessage);

      if (typeof parsed === "string") {
        userMessage = parsed;
      }

      else if (parsed.message) {
        userMessage = parsed.message;
      }
    } catch {}

    userMessage = String(userMessage).trim();

    // =========================
    // LAST RESORT FIX
    // =========================
    if (!userMessage) {
      userMessage = "blank message";
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
