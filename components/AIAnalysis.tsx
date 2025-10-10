import React, { useState, useCallback } from 'react';
import { getMarketAnalysis, getPricePrediction } from '../services/geminiService';
import { useMarketData } from '../contexts/MarketDataContext';
import { PredictionResult } from '../types';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';

const AIAnalysis: React.FC = () => {
  const { marketData, currentPair } = useMarketData();
  
  // State for general analysis
  const [prompt, setPrompt] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for price prediction
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [activeTimeframe, setActiveTimeframe] = useState<string | null>(null);


  const handleAnalysis = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setAnalysis('');

    try {
      const result = await getMarketAnalysis(prompt, currentPair);
      setAnalysis(result);
    } catch (e) {
      setError('Failed to get analysis. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, currentPair]);

  const handlePrediction = useCallback(async (timeframe: string) => {
    setIsPredicting(true);
    setPredictionError(null);
    setPrediction(null);
    setActiveTimeframe(timeframe);

    try {
      const result = await getPricePrediction(timeframe, marketData.price, currentPair);
      setPrediction(result);
    } catch (e) {
      setPredictionError('Failed to get prediction. Please try again.');
      console.error(e);
    } finally {
      setIsPredicting(false);
    }
  }, [marketData.price, currentPair]);
  
  const PredictionDisplay: React.FC<{ result: PredictionResult }> = ({ result }) => {
    const priceChange = result.predictedPrice - marketData.price;
    const priceChangePercent = (priceChange / marketData.price) * 100;
    const isPositive = priceChange >= 0;
    const priceDecimalPlaces = marketData.price > 10 ? 2 : 6;

    return (
       <div className="mt-4 p-4 bg-brand-bg rounded-md border border-brand-border animate-fade-in">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-brand-secondary">Predicted Price ({activeTimeframe})</p>
              <p className="text-xl font-mono text-brand-text-primary">{result.predictedPrice.toFixed(priceDecimalPlaces)} USDT</p>
              <p className={`text-sm flex items-center font-semibold ${isPositive ? 'text-brand-green' : 'text-brand-red'}`}>
                {isPositive ? <ArrowUpIcon /> : <ArrowDownIcon />} 
                {isPositive ? '+' : ''}{priceChange.toFixed(priceDecimalPlaces)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </p>
            </div>
            <div className="text-right">
                <p className="text-xs text-brand-secondary">Confidence</p>
                <p className="text-sm font-semibold text-brand-text-primary">{result.confidence}</p>
            </div>
          </div>
          <div className="mt-3 border-t border-brand-border pt-3">
            <p className="text-xs text-brand-secondary">Analysis:</p>
            <p className="text-brand-text-primary whitespace-pre-wrap text-sm">{result.analysis}</p>
          </div>
       </div>
    );
  };

  return (
    <>
      <div>
        <h3 className="text-brand-text-primary font-semibold mb-2 text-base">AI Market Analysis</h3>
        <p className="text-sm text-brand-secondary mb-4">
          Ask Gemini about market trends, sentiment, or technical indicators for {currentPair}.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalysis()}
            placeholder="e.g., What's the short-term outlook?"
            className="flex-grow bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-brand-text-primary placeholder-brand-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
            <p className="text-brand-text-primary whitespace-pre-wrap text-sm">{analysis}</p>
          </div>
        )}
      </div>

      <div className="border-t border-brand-border my-6"></div>

      <div>
        <h3 className="text-brand-text-primary font-semibold mb-2 text-base">AI Price Prediction ({currentPair})</h3>
        <p className="text-sm text-brand-secondary mb-4">
          Select a timeframe to get a short-term price forecast from Gemini.
        </p>
        <div className="flex gap-2">
          {['1 Hour', '4 Hours', '24 Hours'].map(tf => (
            <button
              key={tf}
              onClick={() => handlePrediction(tf)}
              disabled={isPredicting}
              className={`flex-1 px-3 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-brand-text-secondary hover:text-brand-text-primary ${
                activeTimeframe === tf && !isPredicting
                  ? 'bg-brand-primary text-white'
                  : 'bg-brand-bg border border-brand-border hover:bg-brand-border'
              }`}
            >
              {isPredicting && activeTimeframe === tf ? 'Predicting...' : tf}
            </button>
          ))}
        </div>

        {predictionError && <p className="text-brand-red mt-4 text-sm">{predictionError}</p>}
        {prediction && <PredictionDisplay result={prediction} />}
      </div>
    </>
  );
};

export default AIAnalysis;
