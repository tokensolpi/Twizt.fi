
import { GoogleGenAI } from "@google/genai";

// Ensure the API key is available in the environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey });

const systemInstruction = `You are a professional crypto market analyst for a Decentralized Exchange (DEX). Your name is Gemini.
Provide concise, insightful, and data-driven analysis on cryptocurrencies, specifically focusing on the provided user prompt about the BTC/USDT pair.
Do not give financial advice.
Analyze based on common technical indicators, market sentiment, and recent news if applicable.
Keep your responses brief, professional, and formatted for easy reading in a small dashboard widget. Use markdown for formatting if necessary.`;


export const getMarketAnalysis = async (prompt: string): Promise<string> => {
    try {
        const fullPrompt = `Analyze the BTC/USDT pair based on the following query: "${prompt}"`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                systemInstruction,
                temperature: 0.5,
                topP: 0.9,
                topK: 40,
            }
        });
        
        return response.text;

    } catch (error) {
        console.error("Gemini API call failed:", error);
        throw new Error("Failed to fetch analysis from Gemini API.");
    }
};

/**
 * Fetches the current BTC/USDT price using Gemini with Google Search grounding.
 * @returns The current price as a number, or a fallback on failure.
 */
export const getInitialBtcPrice = async (): Promise<number> => {
    try {
        const prompt = "What is the current price of BTC/USDT? Respond with only the numerical value, like '69123.45'. Do not include currency symbols, commas, or any other text.";
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0, // We want a factual, deterministic answer
            }
        });

        const priceText = response.text.trim();
        // Remove any commas that might be in the response, e.g., "68,517.34"
        const price = parseFloat(priceText.replace(/,/g, ''));

        if (!isNaN(price) && price > 0) {
            return price;
        } else {
            console.warn("Failed to parse price from Gemini response:", priceText);
            // Return a realistic fallback if parsing fails
            return 68500.00;
        }

    } catch (error) {
        console.error("Gemini API call for initial price failed:", error);
        // Return a realistic fallback price if the API call itself fails
        return 68500.00;
    }
};
