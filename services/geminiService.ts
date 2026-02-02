
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Safely accesses the API key from the environment.
 */
const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
};

export const getFieldAssistantAdvice = async (userName: string, role: string, locationContext?: string) => {
  const key = getApiKey();
  if (!key) return "জিপিএস অন রাখুন এবং হাইড্রেটেড থাকুন। (এপিআই কি পাওয়া যায়নি)";

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${userName} with role ${role} is asking for field management advice. Current location context: ${locationContext || 'unknown'}. 
      Provide 3 brief, actionable professional tips in Bengali for a field force officer or admin to improve efficiency or safety today.`,
      config: {
        temperature: 0.7,
      }
    });
    return response.text || "মাঠ পর্যায়ে সাবধানে কাজ করুন এবং নিয়মিত আপডেট দিন।";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "মাঠ পর্যায়ে সাবধানে কাজ করুন এবং নিয়মিত আপডেট দিন।";
  }
};

export const getAttendanceSummaryAI = async (attendanceData: any[]) => {
  const key = getApiKey();
  if (!key) return { summary: "ডেটা বিশ্লেষণ বর্তমানে অনুপলব্ধ। (এপিআই কি নেই)", punctualityRating: 0 };

  try {
    const ai = new GoogleGenAI({ apiKey: key });
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
    
    if (!response.text) throw new Error("Empty response from AI");
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    return { summary: "ডেটা বিশ্লেষণ বর্তমানে অনুপলব্ধ।", punctualityRating: 0 };
  }
};
