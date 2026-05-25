export default async function handler(req, res) {
  // only allow POST
  if (req.method !== "POST") {
    return res.status(405).send("method not allowed");
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    const message = body?.message;

    if (!message) {
      return res.status(400).send("missing message");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: message }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    const output =
      data?.candidates?.[0]?.content?.parts
        ?.map(p => p.text || "")
        .join("") || "";

    if (!output) {
      return res
        .status(500)
        .send("no ai response (empty output from gemini)");
    }

    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(output);

  } catch (err) {
    // THIS is the important part
    return res
      .status(500)
      .send("server error: " + (err?.message || String(err)));
  }
}
