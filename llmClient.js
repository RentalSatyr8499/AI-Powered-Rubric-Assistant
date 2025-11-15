/**
 * Frontend helper to call the Netlify serverless function
 * This module provides utilities for calling the LLM API
 */

/**
 * Calls the LLM serverless function with a prompt
 * @param {string} prompt - The prompt to send to the LLM
 * @returns {Promise<string>} - The generated text from the model
 */
async function callLLM(prompt) {
  try {
    const response = await fetch('/.netlify/functions/callLLM', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();

    // Check for HTTP errors
    if (!response.ok) {
      throw new Error(data.error || `HTTP Error: ${response.status}`);
    }

    return data.text;
  } catch (error) {
    console.error('Error calling LLM API:', error);
    throw error;
  }
}

/**
 * Example usage in your code:
 * 
 * try {
 *   const result = await callLLM("Generate a rubric for grading essays");
 *   console.log("Generated text:", result);
 * } catch (error) {
 *   console.error("Failed to generate text:", error.message);
 *   alert("Error: " + error.message);
 * }
 */

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { callLLM };
}
