
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Get the API key from environment variables
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, currentField, fieldContext, tableName } = await req.json();

    if (!audio) {
      throw new Error('No audio data provided');
    }

    // Check if API key is available
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set in environment variables");
      throw new Error("API key not configured");
    }

    // Create a prompt that helps Gemini understand the context
    let prompt = `You are a helpful assistant for data entry. `;
    
    if (tableName && currentField) {
      prompt += `I need you to extract the ${currentField} for a ${tableName} entry from the following speech. `;
      
      if (fieldContext) {
        prompt += `Context about this field: ${fieldContext}. `;
      }
      
      prompt += `If the user says they don't know, don't have the information, or similar, respond with "NULL_VALUE". Only respond with the exact answer without any additional text.`;
    } else {
      prompt += `Please transcribe this audio exactly as spoken.`;
    }

    console.log("Calling Gemini API with prompt:", prompt);
    console.log("API Key available:", GEMINI_API_KEY ? "Yes" : "No");

    // Call the Gemini API for speech-to-text conversion with the correct model name
    const response = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=" + GEMINI_API_KEY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "audio/webm",
                  data: audio
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Gemini API response:", JSON.stringify(result));
    
    let transcribedText = "";
    
    // Extract the text from the Gemini response
    if (result.candidates && 
        result.candidates[0] && 
        result.candidates[0].content && 
        result.candidates[0].content.parts && 
        result.candidates[0].content.parts.length > 0) {
      transcribedText = result.candidates[0].content.parts[0].text;
    }
    
    // Handle null responses
    if (transcribedText.toLowerCase().includes("null_value") || 
        transcribedText.toLowerCase().includes("i don't know") ||
        transcribedText.toLowerCase().includes("i don't have") ||
        transcribedText.toLowerCase().includes("not available")) {
      transcribedText = "NULL_VALUE";
    }

    console.log("Transcribed text:", transcribedText);

    return new Response(
      JSON.stringify({ 
        text: transcribedText, 
        field: currentField,
        tableName: tableName
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error("Error in speech-to-text function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unexpected error occurred" 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});
