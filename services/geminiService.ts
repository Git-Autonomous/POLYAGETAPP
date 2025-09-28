
import { GoogleGenAI } from "@google/genai";
import { ActionType, OrderParams, CancelParams, OrderbookParams } from '../types';
import { POLYMARKET_CLOB_ADDRESS, POLYMARKET_CLOB_ABI_FRAGMENTS } from '../constants';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function createPrompt(action: ActionType, params: any): string {
    const commonSystemInstruction = `You are an expert blockchain developer specializing in DeFi and the Polymarket CLOB. Your task is to generate a clear, correct, and copy-pasteable TypeScript code snippet using the ethers.js v6 library for interacting with the Polymarket CLOB smart contract.

- The code should be a self-contained async function.
- It must be well-commented to explain each step, especially the conversion of price and size to fixed-point numbers.
- Use BigInt for all numerical conversions and calculations involving contract arguments to avoid precision errors.
- The Polymarket CLOB contract address is: ${POLYMARKET_CLOB_ADDRESS}.
- USDC and outcome tokens on Polymarket use 6 decimal places.

Do not wrap the code in a markdown block (e.g., \`\`\`typescript ... \`\`\`). Only return the raw code.`;

    switch (action) {
        case ActionType.CREATE_ORDER: {
            const p = params as OrderParams;
            return `${commonSystemInstruction}

Generate a TypeScript function named \`createPolymarketOrder\`.
This function should accept an \`ethers.Signer\` object and an order details object as arguments.

The function should perform the following steps:
1. Define the Polymarket CLOB contract ABI for the 'createOrder' function.
2. Create a contract instance using the address, ABI, and the signer.
3. Convert the price ('${p.price}') and size ('${p.size}') into their fixed-point representations (6 decimals). Price is scaled by 1e6. Size is also scaled by 1e6 (representing USDC amount).
4. Determine the side integer (0 for BUY, 1 for SELL) from the input string '${p.side}'.
5. Call the \`createOrder\` method on the contract with marketId: ${p.marketId}, and the converted price, size, and side.
6. Wait for the transaction to be mined and get the receipt.
7. Log the transaction hash and the returned orderId from the event logs. The event is \`OrderCreated(bytes32 indexed orderId, ...)\`.
8. Return the transaction receipt.

Example order parameters:
- Market ID: ${p.marketId}
- Price: ${p.price}
- Size: ${p.size}
- Side: ${p.side}
`;
        }
        case ActionType.CANCEL_ORDER: {
             const p = params as CancelParams;
            return `${commonSystemInstruction}

Generate a TypeScript function named \`cancelPolymarketOrder\`.
This function should accept an \`ethers.Signer\` object and an orderId string as arguments.

The function should perform the following steps:
1. Define the Polymarket CLOB contract ABI for the 'cancelOrder' function.
2. Create a contract instance using the address, ABI, and the signer.
3. Call the \`cancelOrder\` method on the contract with the provided orderId.
4. Wait for the transaction to be mined.
5. Log the transaction hash.
6. Return the transaction receipt.

Example order ID: '${p.orderId}'
`;
        }
        case ActionType.GET_ORDERBOOK: {
            const p = params as OrderbookParams;
            return `${commonSystemInstruction}

Generate a TypeScript function named \`getPolymarketOrderBook\`.
This function should accept an \`ethers.Provider\` object and a marketId string as arguments. This is a read-only operation and does not require a signer.

The function should perform the following steps:
1. Define the Polymarket CLOB contract ABI for the 'getOrderBook' function.
2. Create a contract instance using the address, ABI, and the provider.
3. Call the \`getOrderBook\` view function with the provided marketId.
4. The result will contain asks and bids. Each order in the array is a struct with price and size.
5. Convert the price and size BigInt values from their fixed-point representation back to decimal strings for readability (divide by 1e6).
6. Log the formatted asks and bids.
7. Return the formatted order book.

Example market ID: '${p.marketId}'
`;
        }
        default:
            throw new Error("Invalid action type");
    }
}


export const generatePolymarketCode = async (
    action: ActionType,
    params: Partial<OrderParams & CancelParams & OrderbookParams>
): Promise<string> => {
    
    const prompt = createPrompt(action, params);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        if (!response.text) {
             throw new Error("Received an empty response from the AI model.");
        }
        
        // Clean up the response, removing potential markdown backticks
        const cleanedCode = response.text.replace(/^```(typescript|javascript)?\s*|```\s*$/g, '').trim();

        return cleanedCode;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to generate code. Please check your API key and network connection.");
    }
};
