// llm.js
// Frontend helper to call Hugging Face Inference API

// 1) Hugging Face config
const HF_API_URL =
  "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

// ❗ Replace this with your real HF token for testing/demo.
// For production, move this to a backend.
const HF_ACCESS_TOKEN = "hf_your_real_token_here";

/**
 * Call the Hugging Face Inference API with a text prompt.
 *
 * @param {string} prompt - Text you want to send to the model.
 * @returns {Promise<string>} - Generated text from the model.
 */
async function callLLM(prompt) {
  if (!HF_ACCESS_TOKEN) {
    throw new Error("Hugging Face access token is missing. Set HF_ACCESS_TOKEN in llm.js.");
  }

  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Prompt must be a non-empty string.");
  }

  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 512,
        temperature: 0.7,
        top_p: 0.95,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("HF API error:", response.status, errorText);
    throw new Error(`HF API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  // Most text-generation models return an array like: [ { generated_text: "..." } ]
  const generatedText =
    Array.isArray(data) && data[0] && typeof data[0].generated_text === "string"
      ? data[0].generated_text
      : JSON.stringify(data);

  return generatedText;
}

// expose globally so gradeAssignments.js can use it
window.callLLM = callLLM;
