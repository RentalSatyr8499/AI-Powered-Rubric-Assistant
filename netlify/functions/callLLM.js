const HF_API_URL = "https://router.huggingface.co/hf-inference/mistralai/Mistral-7B-Instruct-v0.2";

// Read the token at runtime from environment
const HF_TOKEN = process.env.HF_ACCESS_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!HF_TOKEN) {
    console.error("HF_ACCESS_TOKEN not set");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration error: HF_ACCESS_TOKEN missing" }),
    };
  }

  let prompt;
  try {
    const body = JSON.parse(event.body || "{}");
    prompt = body.prompt;
    if (!prompt || typeof prompt !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing or invalid prompt" }),
      };
    }
  } catch (err) {
    console.error("Error parsing request body:", err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  try {
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // You can include parameters here if desired: { inputs: prompt, parameters: { max_new_tokens: 256 } }
      body: JSON.stringify({ inputs: prompt }),
    });

    // Try to parse response as JSON, but fall back to text for diagnostics
    const contentType = hfResponse.headers.get("content-type") || "";
    let parsed;
    if (contentType.includes("application/json")) {
      parsed = await hfResponse.json();
    } else {
      parsed = await hfResponse.text();
    }

    if (!hfResponse.ok) {
      console.error("Hugging Face API returned error status", hfResponse.status, parsed);
      // Include parsed body (string or object) in the returned error for easier debugging
      return {
        statusCode: hfResponse.status,
        body: JSON.stringify({ error: typeof parsed === "string" ? parsed : parsed?.error || parsed }),
      };
    }

    // Normalise possible response shapes
    // HF sometimes returns [{generated_text: "..."}] or {generated_text: "..."}
    let generatedText = "";
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].generated_text) {
      generatedText = parsed[0].generated_text;
    } else if (parsed?.generated_text) {
      generatedText = parsed.generated_text;
    } else if (typeof parsed === "string") {
      // if HF returned plain text
      generatedText = parsed;
    } else {
      // As a last resort, stringify the parsed response
      generatedText = JSON.stringify(parsed);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ text: generatedText }),
    };
  } catch (error) {
    // Better error message for diagnostics
    console.error("Error calling Hugging Face API:", error && (error.stack || error.message || error));
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Internal server error: ${error && (error.message || String(error))}` }),
    };
  }
};
