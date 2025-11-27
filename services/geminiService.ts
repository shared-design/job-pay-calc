import { GoogleGenAI, Type } from "@google/genai";
import { TaxEstimateResponse, JobAdAnalysisResponse } from "../types";

const ESTIMATE_TAX_SYSTEM_PROMPT = `
You are a helpful tax estimation assistant. 
Your goal is to provide a conservative estimate of the "Effective Tax Rate" (percentage) for an individual based on their gross annual income and location.
The effective rate should include Federal/National taxes and State/Provincial taxes if applicable.
Do not calculate exact pennies, but give a solid estimate for planning purposes.
If the location is ambiguous, assume the most populous region for that name (e.g., "CA" -> "California, USA").
`;

const ANALYZE_JOB_SYSTEM_PROMPT = `
You are an Australian Payroll and Award Wage expert.
Your goal is to analyze job advertisement text and:
1. Categorize the job into one of: 'Retail', 'Hospitality', 'Transport', 'Warehouse', 'General'.
2. Suggest conservative, standard penalty rate percentages (integers) for Saturday, Sunday, and Overtime based on common Awards (like HIGA, Retail Award) or explicit text in the ad.
   - If the ad mentions specific rates (e.g., "time and a half"), use those (150).
   - If not, use typical Casual loading assumptions (e.g. Sat 150%, Sun 175% or 200%).
   - Return integers representing the percentage (e.g., 150 for 1.5x, 200 for 2.0x).
`;

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getTaxEstimate = async (
  annualIncome: number,
  location: string
): Promise<TaxEstimateResponse> => {
  const ai = getAiClient();

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
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as TaxEstimateResponse;

  } catch (error) {
    console.error("Error fetching tax estimate:", error);
    throw new Error("Failed to estimate tax.");
  }
};

export const analyzeJobAd = async (
  jobAdText: string
): Promise<JobAdAnalysisResponse> => {
  const ai = getAiClient();

  const prompt = `
    Job Ad Text: "${jobAdText.slice(0, 1000)}"
    
    Analyze this text. 
    1. Identify the industry category.
    2. Extract or estimate Saturday, Sunday, and Overtime penalty percentages.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: ANALYZE_JOB_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              enum: ['Retail', 'Hospitality', 'Transport', 'Warehouse', 'General'],
            },
            rates: {
              type: Type.OBJECT,
              properties: {
                saturday: { type: Type.INTEGER },
                sunday: { type: Type.INTEGER },
                overtime: { type: Type.INTEGER }
              }
            },
            reasoning: {
              type: Type.STRING,
            },
          },
          required: ["category", "rates", "reasoning"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as JobAdAnalysisResponse;
  } catch (error) {
    console.error("Error analyzing job ad:", error);
    throw new Error("Failed to analyze job ad.");
  }
};