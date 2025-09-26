

import { GoogleGenAI, Type } from "@google/genai";
import { PredictionResult } from "../types";

// Ensure the API key is available in the environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey });

const getSystemInstruction = (pair: string) => `You are a professional crypto market analyst for a Decentralized Exchange (DEX). Your name is Gemini.
Provide concise, insightful, and data-driven analysis on cryptocurrencies, specifically focusing on the provided user prompt about the ${pair} pair.
Do not give financial advice.
Analyze based on common technical indicators, market sentiment, and recent news if applicable.
Keep your responses brief, professional, and formatted for easy reading in a small dashboard widget. Use markdown for formatting if necessary.`;


export const getMarketAnalysis = async (prompt: string, pair: string): Promise<string> => {
    try {
        const fullPrompt = `Analyze the ${pair} pair based on the following query: "${prompt}"`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                systemInstruction: getSystemInstruction(pair),
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
 * Fetches a short-term price prediction for a given pair.
 * @param timeframe The prediction timeframe (e.g., "1 hour").
 * @param currentPrice The current market price for context.
 * @param pair The trading pair (e.g., "BTC/USDT").
 * @returns A structured prediction object.
 */
export const getPricePrediction = async (timeframe: string, currentPrice: number, pair: string): Promise<PredictionResult> => {
    const prompt = `Given the current ${pair} price is approximately ${currentPrice.toFixed(2)}, predict the price in the next ${timeframe}.
Provide your analysis in a structured JSON format. Base your prediction on technical analysis, recent price action, and general market sentiment.
The 'confidence' should be one of 'Low', 'Medium', or 'High'.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            predictedPrice: { type: Type.NUMBER },
            confidence: { type: Type.STRING },
            analysis: { type: Type.STRING },
        },
        required: ["predictedPrice", "confidence", "analysis"],
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.3,
            }
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        
        if (
            typeof parsed.predictedPrice !== 'number' ||
            typeof parsed.confidence !== 'string' ||
            typeof parsed.analysis !== 'string'
        ) {
            throw new Error("Invalid JSON structure received from API.");
        }

        return parsed;

    } catch (error) {
        console.error("Gemini prediction call failed:", error);
        throw new Error("Failed to fetch price prediction from Gemini API.");
    }
};
