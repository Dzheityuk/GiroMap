
// Replaced Google GenAI with DeepSeek API (OpenAI Compatible)
// Since Google API is often blocked in Russia, DeepSeek is a better alternative.

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
  const DEEPSEEK_API_KEY = 'sk-46efe655b9d84c489865bf369892a107'; 
  
  // Return simulated data immediately if key is obviously a placeholder to save network request
  // or if you want to force simulation, just uncomment next line:
  // return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
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

    if (response.status === 401) {
        console.warn("AI Key Invalid. Switching to Tactical Simulation Mode.");
        return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
    }

    if (!response.ok) {
        throw new Error(`DeepSeek API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();

  } catch (error) {
    console.error("AI Error:", error);
    // Return a random cool message instead of "Error" to maintain immersion
    return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
  }
};
