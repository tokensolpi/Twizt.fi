
import React, { useState, useCallback } from 'react';
import { getMarketAnalysis } from '../services/geminiService';

const AIAnalysis: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysis = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setAnalysis('');

    try {
      const result = await getMarketAnalysis(prompt);
      setAnalysis(result);
    } catch (e) {
      setError('Failed to get analysis. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [prompt]);

  return (
    <>
      <h3 className="text-white font-semibold mb-2 text-base">AI Market Analysis</h3>
      <p className="text-sm text-brand-secondary mb-4">
        Ask Gemini about market trends, sentiment, or technical indicators for BTC/USDT.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAnalysis()}
          placeholder="e.g., What's the short-term outlook for Bitcoin?"
          className="flex-grow bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-white placeholder-brand-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          disabled={isLoading}
        />
        <button
          onClick={handleAnalysis}
          disabled={isLoading}
          className="bg-brand-primary text-white font-semibold px-4 py-2 rounded-md hover:bg-opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Thinking...' : 'Analyze'}
        </button>
      </div>
      
      {error && <p className="text-brand-red mt-4 text-sm">{error}</p>}
      
      {analysis && (
        <div className="mt-4 p-4 bg-brand-bg rounded-md border border-brand-border">
          <p className="text-white whitespace-pre-wrap text-sm">{analysis}</p>
        </div>
      )}
    </>
  );
};

export default AIAnalysis;
