
import { ActionType } from './types';

export const ACTIONS = [
  { id: ActionType.CREATE_ORDER, label: 'Create Order' },
  { id: ActionType.CANCEL_ORDER, label: 'Cancel Order' },
  { id: ActionType.GET_ORDERBOOK, label: 'Get Order Book' },
];

export const POLYMARKET_CLOB_ADDRESS = '0x538d5a1e2E463a521A5319200424A7F7a0A2A12a'; // Example address

export const POLYMARKET_CLOB_ABI_FRAGMENTS = {
  [ActionType.CREATE_ORDER]: 'function createOrder(uint256 marketId, int128 price, int128 size, uint8 side) returns (bytes32 orderId)',
  [ActionType.CANCEL_ORDER]: 'function cancelOrder(bytes32 orderId)',
  [ActionType.GET_ORDERBOOK]: 'function getOrderBook(uint256 marketId) view returns (tuple(int128 price, int128 size)[] asks, tuple(int128 price, int128 size)[] bids)',
};
