
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getFieldAssistantAdvice = async (userName: string, role: string, locationContext?: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${userName} with role ${role} is asking for field management advice. Current location context: ${locationContext || 'unknown'}. 
      Provide 3 brief, actionable professional tips for a field force officer or admin to improve efficiency or safety today.`,
      config: {
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ensure your GPS is on and stay hydrated during field visits.";
  }
};

export const getAttendanceSummaryAI = async (attendanceData: any[]) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this attendance data: ${JSON.stringify(attendanceData)}. 
      Provide a one-sentence summary of overall team punctuality and any concerns.`,
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
    return { summary: "Data analysis unavailable at the moment.", punctualityRating: 0 };
  }
};
