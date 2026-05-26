export default async function handler(req, res) {
  // CORS support for penguinmod/browser requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // POST only
  if (req.method !== "POST") {
    return res.status(405).send("method not allowed");
  }

  try {
    // parse body safely
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    // get groq key from vercel env
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).send("missing GROQ_API_KEY");
    }

    // send ENTIRE incoming body directly to groq
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();

    // if groq errors, show the actual error
    if (data.error) {
      return res
        .status(500)
        .send(
          "groq error: " +
          (data.error.message || JSON.stringify(data.error))
        );
    }

    // extract ai response text
    const text =
      data?.choices?.[0]?.message?.content || "";

    if (!text) {
      return res
        .status(500)
        .send(
          "empty ai response: " +
          JSON.stringify(data)
        );
    }

    // return ONLY plain text
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(text);

  } catch (err) {
    return res
      .status(500)
      .send("server error: " + err.message);
  }
}
