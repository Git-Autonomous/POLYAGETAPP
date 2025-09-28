// File: services/marketService.ts
// This is the updated frontend service that talks to your proxy.

export interface MarketData {
    marketId: string;
    yesPrice: number;
    currentBtcPrice: number;
    priceToBeat: number;
}

export const getHourlyBitcoinMarketData = async (): Promise<MarketData> => {
    try {
        // Call your local proxy server
        const response = await fetch('http://localhost:3001/api/market-data');
        if (!response.ok) {
            throw new Error(`Proxy server error: ${response.statusText}`);
        }
        const data = await response.json();

        if (data.errors || !data.data.marketBySlug) {
            throw new Error('Invalid data from Polymarket API');
        }

        const market = data.data.marketBySlug;
        const yesOutcome = market.outcomes.find((o: any) => o.title.toLowerCase() === 'yes');

        if (!yesOutcome || market.strikePrice === null || market.referenceAsset === null) {
            throw new Error("Required market data not found in API response.");
        }

        const marketData: MarketData = {
            marketId: market.clobTokenId,
            yesPrice: parseFloat(yesOutcome.price),
            currentBtcPrice: parseFloat(market.referenceAsset),
            priceToBeat: parseFloat(market.strikePrice),
        };
        return marketData;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error("Failed to fetch from proxy:", errorMessage);
        throw new Error(`Failed to fetch live market data:\n${errorMessage}`);
    }
};