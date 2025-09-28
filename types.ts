export enum ActionType {
  CREATE_ORDER = 'CREATE_ORDER',
  CANCEL_ORDER = 'CANCEL_ORDER',
  GET_ORDERBOOK = 'GET_ORDERBOOK',
}

export interface OrderParams {
  marketId: string;
  price: string;
  size: string;
  side: 'BUY' | 'SELL';
}

export interface CancelParams {
  orderId: string;
}

export interface OrderbookParams {
    marketId: string;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'ERROR';
}

export interface BetHistoryEntry {
  id: string; // Unique ID, can be ISO timestamp
  timestamp: string; // Human-readable timestamp
  yesPrice: number;
  hourlyGain: number;
  betPlaced: boolean;
  outcome: 'Pending' | 'Won' | 'Lost';
}
