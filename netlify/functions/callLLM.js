const fetch = require('node-fetch');

const HF_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';
const HF_TOKEN = process.env.HF_ACCESS_TOKEN;

exports.handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Parse request body
  let prompt;
  try {
    const body = JSON.parse(event.body);
    prompt = body.prompt;
    
    if (!prompt || typeof prompt !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing or invalid "prompt" field' }),
      };
    }
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  // Validate token
  if (!HF_TOKEN) {
    console.error('HF_ACCESS_TOKEN environment variable not set');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  try {
    // Call Hugging Face Inference API
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    const data = await response.json();

    // Handle API errors
    if (!response.ok) {
      console.error('Hugging Face API error:', data);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: data.error || 'Hugging Face API error',
        }),
      };
    }

    // Extract generated text from response
    // Hugging Face returns an array with generated_text field
    const generatedText = data[0]?.generated_text || '';

    return {
      statusCode: 200,
      body: JSON.stringify({ text: generatedText }),
    };
  } catch (error) {
    console.error('Error calling Hugging Face API:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
