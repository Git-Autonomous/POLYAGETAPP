import React from 'react';
import { BetHistoryEntry } from '../types';

interface HistoryTabProps {
    history: BetHistoryEntry[];
}

const HistoryTab: React.FC<HistoryTabProps> = ({ history }) => {
    
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    }
    
    const OutcomeBadge = ({ outcome }: { outcome: BetHistoryEntry['outcome'] }) => {
        const baseClasses = "px-2.5 py-0.5 text-xs font-semibold rounded-full";
        switch (outcome) {
            case 'Won':
                return <span className={`${baseClasses} bg-green-500/20 text-green-300`}>Won</span>;
            case 'Lost':
                return <span className={`${baseClasses} bg-red-500/20 text-red-300`}>Lost</span>;
            case 'Pending':
                return <span className={`${baseClasses} bg-yellow-500/20 text-yellow-300`}>Pending</span>;
            default:
                return null;
        }
    };
    
    return (
        <div className="bg-gray-800/50 rounded-lg p-6 shadow-lg border border-gray-700 animate-fade-in">
            <h2 className="text-xl font-bold mb-4 text-white">Betting History</h2>
            <div className="overflow-x-auto">
                 {history.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p>No history yet.</p>
                        <p className="text-sm">Start the bot to begin recording attempts.</p>
                    </div>
                ) : (
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Timestamp</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Bet Placed?</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Market Price</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Hourly Gain</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Outcome</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 bg-gray-900/50">
                        {history.map((entry) => (
                            <tr key={entry.id}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-300 sm:pl-6">{entry.timestamp}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    {entry.betPlaced ? 
                                     <span className="text-green-400 font-semibold">Yes</span> : 
                                     <span className="text-gray-400">No</span>
                                    }
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{(entry.yesPrice * 100).toFixed(2)}%</td>
                                <td className={`whitespace-nowrap px-3 py-4 text-sm font-mono ${entry.hourlyGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {entry.hourlyGain >= 0 ? '+' : ''}{formatCurrency(entry.hourlyGain)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300"><OutcomeBadge outcome={entry.outcome} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 )}
            </div>
        </div>
    );
};

export default HistoryTab;
