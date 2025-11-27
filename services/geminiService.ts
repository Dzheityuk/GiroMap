import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

// Robust check for API Key availability
const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined;

if (apiKey) {
  genAI = new GoogleGenAI({ apiKey });
}

export const getDestinationInfo = async (address: string): Promise<string> => {
  if (!genAI) return "СИСТЕМЫ ИИ ОТКЛЮЧЕНЫ";

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Provide a very short, 1-sentence cryptic or tactical description of this location in Russian (Русский). Style: Cyberpunk/Military HUD. Location: ${address}. Keep it under 15 words.`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "СВЯЗЬ ПОТЕРЯНА"; // Connection Lost
  }
};