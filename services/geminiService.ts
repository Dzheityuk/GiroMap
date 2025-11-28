
import { Language } from '../types';

// Replaced Google GenAI with OpenRouter API (Access to DeepSeek/Gemini/etc)
// Since Google API is often blocked in Russia, OpenRouter is a better alternative.

const FALLBACK_MESSAGES = {
  RU: [
    "Сканирование местности... Данные ограничены.",
    "Район с плотной застройкой. Обратите внимание на архитектуру.",
    "Сигнал GPS нестабилен, ориентируйтесь по заметным объектам.",
    "Загрузка исторической справки... Ошибка соединения.",
    "Движение по маршруту. Следите за окружением.",
    "Интересный факт: где-то здесь спрятан старый дворик.",
    "Зона повышенного пешеходного трафика.",
    "Покрытие стабильное. Продолжайте движение."
  ],
  EN: [
    "Scanning area... Data limited.",
    "Dense urban area. Note the architecture.",
    "GPS signal unstable, use landmarks.",
    "Loading historical data... Connection error.",
    "On route. Watch your surroundings.",
    "Fun fact: there is an old courtyard hidden nearby.",
    "High pedestrian traffic zone.",
    "Surface stable. Continue moving."
  ]
};

export const getDestinationInfo = async (address: string, lang: Language): Promise<string> => {
  const OPENROUTER_API_KEY = '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'; 
  
  const systemPrompt = lang === 'RU'
    ? "Ты знаток города и урбанист. Твоя задача — дать ОДИН краткий, но очень интересный и неочевидный факт об указанном месте или адресе (история, архитектура, легенда). Не пиши банальщины вроде 'это жилой дом'. Пиши живо и увлекательно. Максимум 2 предложения."
    : "You are an urban explorer and city guide. Provide ONE short, fascinating, and non-obvious fact about the location (history, architecture, local legend). Avoid cliches like 'this is a building'. Make it engaging. Max 2 sentences.";

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
            content: systemPrompt
          },
          {
            role: "user",
            content: `Location: ${address}`
          }
        ],
        stream: false
      })
    });

    // Handle 401 (Unauthorized) and 402 (Payment Required) gracefully
    if (response.status === 401 || response.status === 402) {
        console.warn(`AI Key Error (${response.status}). Switching to Offline Mode.`);
        // Simulate network delay for realism
        await new Promise(r => setTimeout(r, 300));
        const msgs = FALLBACK_MESSAGES[lang];
        return msgs[Math.floor(Math.random() * msgs.length)];
    }

    if (!response.ok) {
        throw new Error(`OpenRouter API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();

  } catch (error) {
    console.warn("AI Connection Failed, using fallback.", error);
    const msgs = FALLBACK_MESSAGES[lang];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
};
