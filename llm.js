// llm.js
// Frontend module to call Hugging Face Inference API and render output as PDF

// 1) Hugging Face config
const HF_API_URL =
  "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

// ❗ Replace this with your real HF token for testing/demo.
// For production, move this to a backend.
const HF_ACCESS_TOKEN = "access_token";

/**
 * Call the Hugging Face Inference API with a text prompt.
 *
 * @param {string} prompt - Text you want to send to the model.
 * @returns {Promise<string>} - Generated text from the model.
 */
export async function callLLM(prompt) {
  if (!HF_ACCESS_TOKEN || HF_ACCESS_TOKEN === "access_token") {
    throw new Error(
      "Hugging Face access token is missing. Set HF_ACCESS_TOKEN in llm.js."
    );
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

  // Most text-generation models return an array like:
  // [ { generated_text: "..." } ]
  const generatedText =
    Array.isArray(data) && data[0] && typeof data[0].generated_text === "string"
      ? data[0].generated_text
      : JSON.stringify(data);

  return generatedText;
}

/**
 * Render given text into a PDF, show it in an iframe, and wire up download link.
 *
 * Requires jsPDF UMD build loaded on the page:
 * <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
 *
 * And the following HTML elements:
 *   <iframe id="pdfPreview"></iframe>
 *   <a id="pdfDownload">Download PDF</a>
 *
 * @param {string} text - The text content to put into the PDF.
 */
export function renderPdfFromText(text) {
  const jsPDFLib = window.jspdf;
  if (!jsPDFLib || !jsPDFLib.jsPDF) {
    console.error("jsPDF is not loaded. Make sure the jsPDF script tag is included.");
    return;
  }

  const { jsPDF } = jsPDFLib;
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;

  const lines = doc.splitTextToSize(text, maxWidth);
  let y = margin;

  lines.forEach((line) => {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 14;
  });

  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);

  // Show in iframe
  const iframe = document.getElementById("pdfPreview");
  if (iframe) {
    iframe.src = pdfUrl;
    iframe.style.display = "block";
  }

  // Make the PDF container visible
  const pdfContainer = document.getElementById("pdfContainer");
  if (pdfContainer) {
    pdfContainer.classList.add("show");
  }

  // Set up download link
  const downloadLink = document.getElementById("pdfDownload");
  if (downloadLink) {
    downloadLink.href = pdfUrl;
    downloadLink.download = "feedback.pdf";
    downloadLink.style.display = "inline-block";
  }
}