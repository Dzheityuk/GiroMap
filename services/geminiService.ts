
import { Language } from '../types';

const FALLBACK_MESSAGES = {
  RU: [
    "Сканирование местности... Данные ограничены.",
    "Район с плотной застройкой. Обратите внимание на архитектуру.",
    "Сигнал GPS нестабилен, ориентируйтесь по заметным объектам.",
    "Движение по маршруту. Следите за окружением.",
    "Интересный факт: где-то здесь спрятан старый дворик.",
    "Зона повышенного пешеходного трафика.",
    "Покрытие стабильное. Продолжайте движение."
  ],
  EN: [
    "Scanning area... Data limited.",
    "Dense urban area. Note the architecture.",
    "GPS signal unstable, use landmarks.",
    "On route. Watch your surroundings.",
    "Fun fact: there is an old courtyard hidden nearby.",
    "High pedestrian traffic zone.",
    "Surface stable. Continue moving."
  ]
};

/**
 * Получает интересную справку через OpenRouter (DeepSeek).
 * БЕЗОПАСНОСТЬ: Ключ API берется из process.env.API_KEY (не храните его в коде!).
 */
export const getDestinationInfo = async (address: string, lang: Language): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  // Если ключа нет, сразу выдаем заглушку, чтобы не тратить время на ошибку
  if (!apiKey) {
    console.warn("API Key is missing in environment variables.");
    return FALLBACK_MESSAGES[lang][Math.floor(Math.random() * FALLBACK_MESSAGES[lang].length)];
  }

  const systemInstruction = lang === 'RU'
    ? "Ты знаток города. Дай ОДИН краткий, неочевидный факт об этом месте (история, архитектура). Максимум 2 предложения."
    : "City guide mode. Provide ONE short, fascinating fact about this location. Max 2 sentences.";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://giromap.ru", // Рекомендуется OpenRouter
        "X-Title": "GiroMap",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "tngtech/deepseek-r1t2-chimera:free",
        "messages": [
          { "role": "system", "content": systemInstruction },
          { "role": "user", "content": `Location: ${address}` }
        ],
        "temperature": 0.7,
        "max_tokens": 100
      })
    });

    if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (text) {
      return text.trim();
    }
    throw new Error("Empty response from AI");

  } catch (error) {
    console.warn("AI Service unavailable (OpenRouter/DeepSeek). Using fallback.", error);
    const msgs = FALLBACK_MESSAGES[lang];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
};
