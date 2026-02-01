
import { GoogleGenAI, Type } from "@google/genai";

// Safely access API key for browser environments
const getApiKey = () => {
  try {
    return typeof process !== 'undefined' && process.env ? process.env.API_KEY || '' : '';
  } catch (e) {
    return '';
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const getFieldAssistantAdvice = async (userName: string, role: string, locationContext?: string) => {
  const key = getApiKey();
  if (!key) return "জিপিএস অন রাখুন এবং হাইড্রেটেড থাকুন। (API Key সেট করা নেই)";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${userName} with role ${role} is asking for field management advice. Current location context: ${locationContext || 'unknown'}. 
      Provide 3 brief, actionable professional tips in Bengali for a field force officer or admin to improve efficiency or safety today.`,
      config: {
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "মাঠ পর্যায়ে সাবধানে কাজ করুন এবং নিয়মিত আপডেট দিন।";
  }
};

export const getAttendanceSummaryAI = async (attendanceData: any[]) => {
  const key = getApiKey();
  if (!key) return { summary: "ডেটা বিশ্লেষণ বর্তমানে অনুপলব্ধ।", punctualityRating: 0 };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this attendance data: ${JSON.stringify(attendanceData)}. 
      Provide a one-sentence summary in Bengali of overall team punctuality and any concerns.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            punctualityRating: { type: Type.NUMBER }
          },
          required: ["summary", "punctualityRating"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return { summary: "ডেটা বিশ্লেষণ বর্তমানে অনুপলব্ধ।", punctualityRating: 0 };
  }
};
