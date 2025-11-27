import { GoogleGenAI, Type } from "@google/genai";
import { TaxEstimateResponse } from "../types";

const ESTIMATE_TAX_SYSTEM_PROMPT = `
You are a helpful tax estimation assistant. 
Your goal is to provide a conservative estimate of the "Effective Tax Rate" (percentage) for an individual based on their gross annual income and location.
The effective rate should include Federal/National taxes and State/Provincial taxes if applicable.
Do not calculate exact pennies, but give a solid estimate for planning purposes.
If the location is ambiguous, assume the most populous region for that name (e.g., "CA" -> "California, USA").
`;

export const getTaxEstimate = async (
  annualIncome: number,
  location: string
): Promise<TaxEstimateResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Annual Income: $${annualIncome.toLocaleString()}
    Location: ${location}
    
    Please estimate the total effective income tax rate (percentage) for this person.
    Return the rate as a number (e.g., 22.5 for 22.5%) and a very brief explanation (max 1 sentence) citing the approximate breakdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: ESTIMATE_TAX_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rate: {
              type: Type.NUMBER,
              description: "The estimated effective tax rate as a percentage (0-100).",
            },
            explanation: {
              type: Type.STRING,
              description: "A brief 1-sentence explanation of the estimate.",
            },
          },
          required: ["rate", "explanation"],
        },
      },
    });

    const text = response.text;
    if (!text) {
        throw new Error("No response from AI");
    }
    
    const result = JSON.parse(text) as TaxEstimateResponse;
    return result;

  } catch (error) {
    console.error("Error fetching tax estimate:", error);
    throw new Error("Failed to estimate tax. Please try again or enter manually.");
  }
};