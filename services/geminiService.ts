import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateLessonContent = async (
  focusKeys: string[],
  difficulty: string,
  topic: string = "technology"
): Promise<string> => {
  try {
    const prompt = `
      Create a typing practice text (plain text only, no markdown formatting).
      Difficulty: ${difficulty}.
      Topic: ${topic}.
      Focus heavily on using these keys: ${focusKeys.join(', ')}.
      Length: Approximately 40-60 words.
      Make it coherent and engaging.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    return response.text?.trim() || "The quick brown fox jumps over the lazy dog.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The quick brown fox jumps over the lazy dog.";
  }
};

export const generateTypingAdvice = async (
  wpm: number,
  accuracy: number,
  weakKeys: string[]
): Promise<string> => {
  try {
    const prompt = `
      You are a typing coach. Analyze these stats:
      WPM: ${wpm}
      Accuracy: ${accuracy}%
      Weak Keys: ${weakKeys.join(', ') || 'None'}
      
      Give a very short (max 2 sentences), funny, and constructive tip to improve.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "Keep practicing! Accuracy is key to speed.";
  } catch (error) {
    return "Great job! Keep typing every day.";
  }
};

export const generateGameWords = async (count: number = 20): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a list of ${count} random words for a typing game. Varying lengths. Return only the words separated by spaces or newlines. No numbering.`,
        });
        const text = response.text || "";
        return text.split(/\s+/).filter(w => w.length > 0).slice(0, count);
    } catch (e) {
        return ["space", "galaxy", "rocket", "planet", "star", "comet", "orbit", "laser", "alien", "moon"];
    }
}