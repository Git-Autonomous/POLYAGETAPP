

import React, { useState, useCallback, useEffect } from 'react';
import { ActionType, LogEntry, BetHistoryEntry } from './types';
import { generatePolymarketCode } from './services/geminiService';
import { getHourlyBitcoinMarketData, MarketData } from './services/marketService';
import Header from './components/Header';
import CodeBlock from './components/CodeBlock';
import { SpinnerIcon } from './components/icons/SpinnerIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import HistoryTab from './components/HistoryTab';
import { HistoryIcon } from './components/icons/HistoryIcon';
import { BotIcon } from './components/icons/BotIcon';

const MIN_YES_PRICE = 0.6666;
const MAX_YES_PRICE = 0.875;
const MIN_PROFIT_USD = 19;

// Fix: Moved helper component outside the App component to prevent re-creation on re-renders and fix potential parsing issues.
const Condition = ({ label, met }: { label: string, met: boolean }) => (
    <li className={`flex items-center transition-colors duration-300 ${met ? 'text-green-400' : 'text-gray-400'}`}>
        <CheckIcon className={`w-5 h-5 mr-2 p-0.5 rounded-full ${met ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/30 text-gray-500'}`} />
        {label}
    </li>
);

// Fix: Moved helper function outside the App component.
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

// Fix: Moved helper component outside the App component to prevent re-creation on re-renders and fix potential parsing issues.
// FIX: Refactored TabButton props to a dedicated interface to resolve a potential type inference issue causing a spurious error about the 'children' prop being missing.
interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

// FIX: Explicitly typing the component with React.FC ensures TypeScript correctly recognizes the 'children' prop passed via JSX, resolving the spurious type error.
const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, children }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
      {children}
  </button>
);

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'bot' | 'history'>('bot');
    const [isBotRunning, setIsBotRunning] = useState<boolean>(false);
    const [betSize, setBetSize] = useState<string>('10');
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [marketData, setMarketData] = useState<MarketData | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [history, setHistory] = useState<BetHistoryEntry[]>([]);
    const [generatedCode, setGeneratedCode] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [lastAttemptHour, setLastAttemptHour] = useState<number | null>(null);

    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('betHistory');
            if (savedHistory) {
                setHistory(JSON.parse(savedHistory));
            }
        } catch (error) {
            console.error("Failed to parse history from localStorage", error);
        }
    }, []);

    const updateHistory = useCallback((newHistory: BetHistoryEntry[]) => {
        setHistory(newHistory);
        localStorage.setItem('betHistory', JSON.stringify(newHistory));
    }, []);

    const addLog = useCallback((message: string, type: LogEntry['type']) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [{ timestamp, message, type }, ...prev].slice(0, 100));
    }, []);

    const fetchMarketData = useCallback(async () => {
        try {
            const data = await getHourlyBitcoinMarketData();
            setMarketData(data);
        } catch (error) {
            addLog(error instanceof Error ? error.message : 'Failed to fetch market data.', 'ERROR');
        }
    }, [addLog]);

    const handleBetCheck = useCallback(async () => {
        addLog("21 minute mark reached. Checking conditions...", 'INFO');
        setIsGenerating(true);

        const currentMarketData = await getHourlyBitcoinMarketData();
        setMarketData(currentMarketData);

        const { yesPrice, marketId, currentBtcPrice, priceToBeat } = currentMarketData;
        
        const hourlyGain = currentBtcPrice - priceToBeat;
        const isPriceConditionMet = yesPrice >= MIN_YES_PRICE && yesPrice <= MAX_YES_PRICE;
        const isProfitConditionMet = hourlyGain >= MIN_PROFIT_USD;
        const shouldPlaceBet = isPriceConditionMet && isProfitConditionMet;

        const newHistoryEntry: BetHistoryEntry = {
            id: new Date().toISOString(),
            timestamp: new Date().toLocaleString(),
            yesPrice: yesPrice,
            hourlyGain: hourlyGain,
            betPlaced: shouldPlaceBet,
            outcome: 'Pending'
        };
        updateHistory([newHistoryEntry, ...history]);

        if (shouldPlaceBet) {
            addLog(`Conditions met! Market Price: ${(yesPrice * 100).toFixed(2)}%, Hourly Gain: $${hourlyGain.toFixed(2)}. Generating transaction...`, 'SUCCESS');
            try {
                const code = await generatePolymarketCode(ActionType.CREATE_ORDER, { marketId, price: yesPrice.toString(), size: betSize, side: 'BUY' });
                setGeneratedCode(code);
                addLog('Code generated successfully.', 'SUCCESS');
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                addLog(errorMessage, 'ERROR');
                setGeneratedCode(`// Error generating code: ${errorMessage}`);
            }
        } else {
            let reasons: string[] = [];
            if (!isPriceConditionMet) reasons.push(`Market price out of range (${(yesPrice * 100).toFixed(2)}%)`);
            if (!isProfitConditionMet) reasons.push(`Hourly gain too low ($${hourlyGain.toFixed(2)})`);
            addLog(`Bet not placed. Reasons: ${reasons.join(', ')}.`, 'INFO');
        }

        setIsGenerating(false);
    }, [addLog, betSize, history, updateHistory]);
    
    const handleEndOfHourCheck = useCallback(async () => {
        const latestEntry = history[0];
        if (latestEntry && latestEntry.outcome === 'Pending') {
            addLog('Hour ended. Determining outcome for the last attempt...', 'INFO');
            const finalMarketData = await getHourlyBitcoinMarketData();
            const finalOutcome = finalMarketData.currentBtcPrice > finalMarketData.priceToBeat ? 'Won' : 'Lost';
            
            const updatedEntry = { ...latestEntry, outcome: finalOutcome };
            const newHistory = [...history];
            newHistory[0] = updatedEntry;
            updateHistory(newHistory);
            
            addLog(`Last attempt result: ${finalOutcome}. Bet was ${latestEntry.betPlaced ? 'PLACED' : 'NOT PLACED'}.`, finalOutcome === 'Won' ? 'SUCCESS' : 'ERROR');
        }
    }, [history, addLog, updateHistory]);


    useEffect(() => {
        fetchMarketData();
        const marketDataInterval = setInterval(fetchMarketData, 30000);

        const timer = setInterval(() => {
            const now = new Date();
            const endOfHour = new Date(now);
            endOfHour.setMinutes(59, 59, 999);
            const secondsToEndOfHour = Math.round((endOfHour.getTime() - now.getTime()) / 1000);
            setTimeLeft(secondsToEndOfHour);

            const currentHour = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            if (minutes === 59 && seconds === 59) {
                handleEndOfHourCheck();
            }

            if (minutes === 0 && seconds < 5 && lastAttemptHour !== null && lastAttemptHour !== currentHour) {
                setLastAttemptHour(null);
                setGeneratedCode('');
                addLog('New hour started. Ready for next cycle.', 'INFO');
            }
            
            if (isBotRunning && minutes === 21 && lastAttemptHour !== currentHour) {
                setLastAttemptHour(currentHour);
                handleBetCheck();
            }
        }, 1000);

        return () => {
            clearInterval(timer);
            clearInterval(marketDataInterval);
        };
    }, [isBotRunning, lastAttemptHour, handleBetCheck, fetchMarketData, addLog, handleEndOfHourCheck]);
    
    const minutesLeft = Math.floor(timeLeft / 60);
    const priceDifference = marketData ? marketData.currentBtcPrice - marketData.priceToBeat : 0;
    const isTimeConditionMet = minutesLeft === 21;
    const isPriceInRange = marketData ? (marketData.yesPrice >= MIN_YES_PRICE && marketData.yesPrice <= MAX_YES_PRICE) : false;
    const isProfitConditionMet = priceDifference >= MIN_PROFIT_USD;
    
    const toggleBot = () => {
        setIsBotRunning(prev => {
            if (!prev) {
                addLog('Bot started. Waiting for conditions to be met.', 'INFO');
                setGeneratedCode('');
                setLastAttemptHour(new Date().getHours() === 0 ? 23 : new Date().getHours() -1);
            } else {
                addLog('Bot stopped.', 'INFO');
            }
            return !prev;
        });
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-200 font-sans">
            <Header />
            <main className="container mx-auto p-4 md:p-8">
                <div className="mb-6 flex items-center gap-2">
                    <TabButton isActive={activeTab === 'bot'} onClick={() => setActiveTab('bot')}>
                        <BotIcon className="w-5 h-5" /> Bot Dashboard
                    </TabButton>
                    <TabButton isActive={activeTab === 'history'} onClick={() => setActiveTab('history')}>
                        <HistoryIcon className="w-5 h-5" /> History
                    </TabButton>
                </div>

                {activeTab === 'bot' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                        <div className="space-y-8">
                            <div className="bg-gray-800/50 rounded-lg p-6 shadow-lg border border-gray-700">
                                <h2 className="text-xl font-bold mb-4 text-white">1. Bot Controls</h2>
                                 <div className="space-y-4 mb-6">
                                    <div>
                                        <label htmlFor="betSize" className="block text-sm font-medium text-gray-400">Bet Size (USDC)</label>
                                        <input type="number" name="betSize" id="betSize" value={betSize} onChange={(e) => setBetSize(e.target.value)} disabled={isBotRunning} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2 disabled:opacity-50" placeholder="e.g., 10" />
                                    </div>
                                </div>
                                <button onClick={toggleBot} className={`w-full font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 ${isBotRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                    {isBotRunning ? 'Stop Bot' : 'Start Bot'}
                                </button>
                            </div>

                            <div className="bg-gray-800/50 rounded-lg p-6 shadow-lg border border-gray-700">
                                 <h2 className="text-xl font-bold mb-1 text-white">2. Live Status</h2>
                                 <p className="text-sm text-gray-400 mb-4">Bot is currently <span className={isBotRunning ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{isBotRunning ? 'RUNNING' : 'STOPPED'}</span>.</p>
                                 
                                 <div className="grid grid-cols-2 gap-4 text-center bg-gray-900/50 rounded-lg p-4 mb-6">
                                     <div>
                                         <div className="text-gray-400 text-sm">Time Until Close</div>
                                         <div className="text-4xl font-mono font-bold text-white tracking-wider">{formatTime(timeLeft)}</div>
                                     </div>
                                     <div>
                                        <div className="text-gray-400 text-sm">Market Price (YES)</div>
                                        <div className="text-4xl font-mono font-bold text-white tracking-wider">{marketData ? `${(marketData.yesPrice * 100).toFixed(2)}%` : '...'}</div>
                                     </div>
                                 </div>

                                 <div className="grid grid-cols-3 gap-2 text-center bg-gray-900/50 rounded-lg p-4 mb-6">
                                    <div>
                                         <div className="text-gray-400 text-xs">Price to Beat</div>
                                         <div className="text-xl font-mono font-semibold text-gray-300">
                                             {marketData ? formatCurrency(marketData.priceToBeat) : '...'}
                                         </div>
                                     </div>
                                     <div>
                                         <div className="text-gray-400 text-xs">Current Price</div>
                                         <div className="text-xl font-mono font-semibold text-white">
                                             {marketData ? formatCurrency(marketData.currentBtcPrice) : '...'}
                                         </div>
                                     </div>
                                     <div>
                                         <div className="text-gray-400 text-xs">Hourly Gain</div>
                                         <div className={`text-xl font-mono font-semibold ${priceDifference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                             {marketData ? `${priceDifference >= 0 ? '+' : ''}${formatCurrency(priceDifference)}` : '...'}
                                         </div>
                                     </div>
                                 </div>
                                 
                                 <h3 className="text-lg font-semibold mb-2 text-white">Bet Conditions</h3>
                                 <ul className="space-y-2 text-sm">
                                     <Condition label={`Time until close is 21:xx`} met={isTimeConditionMet} />
                                     <Condition label={`Market price is 66.66% - 87.5%`} met={isPriceInRange} />
                                     <Condition label={`Hourly price gain >= ${formatCurrency(MIN_PROFIT_USD)}`} met={isProfitConditionMet} />
                                 </ul>
                            </div>
                             <div className="bg-gray-800/50 rounded-lg p-6 shadow-lg border border-gray-700">
                                <h2 className="text-xl font-bold mb-4 text-white">3. Activity Log</h2>
                                <div className="h-48 overflow-y-auto bg-black/50 p-3 rounded-md text-sm font-mono space-y-2">
                                    {logs.length === 0 && <p className="text-gray-500">Logs will appear here...</p>}
                                    {logs.map((log, i) => (
                                        <p key={i} className={`whitespace-pre-wrap ${log.type === 'SUCCESS' ? 'text-green-400' : log.type === 'ERROR' ? 'text-red-400' : 'text-gray-400'}`}>
                                            <span className="text-gray-500 mr-2">{log.timestamp}</span>{log.message}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-900/80 rounded-lg shadow-lg border border-gray-700 min-h-[400px] flex flex-col">
                             <div className="flex-grow p-6">
                                <h2 className="text-xl font-bold mb-4 text-white">4. Generated Transaction Code</h2>
                                 {(isGenerating) && (
                                    <div className="flex items-center justify-center h-full text-gray-400">
                                        <div className="text-center">
                                            <SpinnerIcon className="h-8 w-8 mx-auto mb-2" />
                                            <p>Checking conditions and generating code...</p>
                                        </div>
                                    </div>
                                )}
                                {generatedCode && !isGenerating && (
                                    <CodeBlock code={generatedCode} />
                                )}
                                {!generatedCode && !isGenerating && (
                                    <div className="flex items-center justify-center h-full text-gray-500 text-center px-4">
                                        <p>When all conditions are met, the ethers.js code to execute the bet will appear here.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'history' && <HistoryTab history={history} />}
            </main>
        </div>
    );
};

export default App;