
// Replaced Google GenAI with OpenRouter API (Access to DeepSeek/Gemini/etc)
// Since Google API is often blocked in Russia, OpenRouter is a better alternative.

const FALLBACK_MESSAGES = [
  "SECTOR SCAN COMPLETE // DATA FRAGMENTED",
  "URBAN DENSITY: HIGH // CAUTION ADVISED",
  "GRID REFERENCE: A-7 // SIGNAL INTERFERENCE",
  "LOCALE: UNMAPPED // MONITOR SENSORS",
  "ENVIRONMENT: HOSTILE // MAINTAIN BEARING",
  "TARGET ZONE IDENTIFIED // LOW VISIBILITY",
  "CIVILIAN SECTOR // RADIO SILENCE",
  "TERRAIN: PAVED // MOVEMENT SPEED: NORMAL"
];

export const getDestinationInfo = async (address: string): Promise<string> => {
  const OPENROUTER_API_KEY = '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'; 
  
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://giromap.vercel.app", // Required by OpenRouter
        "X-Title": "GiroMap"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat", // OpenRouter model ID
        messages: [
          {
            role: "system",
            content: "You are a tactical navigation assistant. Provide a very short, 1-sentence cryptic description of locations in Russian (Русский). Style: Cyberpunk/Military HUD. Keep it under 15 words."
          },
          {
            role: "user",
            content: `Describe location: ${address}`
          }
        ],
        stream: false
      })
    });

    // Handle 401 (Unauthorized) and 402 (Payment Required) gracefully
    if (response.status === 401 || response.status === 402) {
        console.warn(`AI Key Error (${response.status}). Switching to Tactical Simulation Mode.`);
        // Simulate network delay for realism
        await new Promise(r => setTimeout(r, 300));
        return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
    }

    if (!response.ok) {
        throw new Error(`OpenRouter API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();

  } catch (error) {
    console.warn("AI Connection Failed, using fallback.", error);
    // Return a random cool message instead of "Error" to maintain immersion
    return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
  }
};
