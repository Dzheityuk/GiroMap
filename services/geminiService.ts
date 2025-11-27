
// Replaced Google GenAI with DeepSeek API (OpenAI Compatible)
// Since Google API is often blocked in Russia, DeepSeek is a better alternative.

export const getDestinationInfo = async (address: string): Promise<string> => {
  const DEEPSEEK_API_KEY = 'sk-50962383827d498aa29352e698884949'; // Placeholder: User needs to provide valid key if not using proxy
  // Note: In production, do not expose keys in frontend code. Use a backend proxy.
  
  // If no key provided (or default), return fallback
  // if (!DEEPSEEK_API_KEY) return "AI KEY MISSING";

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

    if (!response.ok) {
        throw new Error(`DeepSeek API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();

  } catch (error) {
    console.error("AI Error:", error);
    // Silent fail or return generic message
    return "СВЯЗЬ ПОТЕРЯНА"; // Connection Lost
  }
};
