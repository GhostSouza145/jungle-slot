// ==========================================
// SÍMBOLOS DO JOGO
// ==========================================

export type SymbolType =
  | "🍒"
  | "🍋"
  | "⭐";

export const SYMBOLS: SymbolType[] = [
  "🍒",
  "🍋",
  "⭐",
];

// ==========================================
// RESULTADO DO GIRO
// ==========================================

export type SpinResult = [
  SymbolType,
  SymbolType,
  SymbolType
];

// ==========================================
// RESPOSTA DA API REST
// ==========================================

export interface SpinResponse {
  result: SpinResult;
  bet: number;
  win: number;
}

// ==========================================
// EVENTOS WEBSOCKET
// ==========================================

export interface WebSocketConnectedEvent {
  type: "connected";
  message: string;
  timestamp: number;
}

export interface WebSocketRoundEvent {
  type: "round_update";
  round: number;
  message: string;
  timestamp: number;
}

export interface WebSocketSpinEvent {
  type: "spin_completed";
  result: SpinResult;
  bet: number;
  win: number;
  timestamp: number;
}

export type GameWebSocketEvent =
  | WebSocketConnectedEvent
  | WebSocketRoundEvent
  | WebSocketSpinEvent;