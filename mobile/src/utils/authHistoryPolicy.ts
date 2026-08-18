export type AsyncStatus = "idle" | "loading" | "success" | "error" | "cancelled";
export type AsyncState = { status: AsyncStatus; operationId: number; consent: boolean };
export const initialAuthHistoryState: AsyncState = { status: "idle", operationId: 0, consent: false };
export type AsyncEvent =
  | { type: "START" | "RETRY"; operationId: number }
  | { type: "SUCCESS" | "FAILURE" | "CANCEL" | "LOGOUT"; operationId: number }
  | { type: "SET_CONSENT"; consent: boolean };

export function authHistoryReducer(state: AsyncState, event: AsyncEvent): AsyncState {
  if (event.type === "SET_CONSENT") return { ...state, consent: event.consent };
  if (event.type === "START" && state.status !== "loading") return { ...state, status: "loading", operationId: event.operationId };
  if (event.type === "RETRY" && state.status === "error") return { ...state, status: "loading", operationId: event.operationId };
  if ((event.type === "SUCCESS" || event.type === "FAILURE") && state.status === "loading" && state.operationId === event.operationId) return { ...state, status: event.type === "SUCCESS" ? "success" : "error" };
  if ((event.type === "CANCEL" || event.type === "LOGOUT") && state.operationId === event.operationId) return { ...state, status: event.type === "CANCEL" ? "cancelled" : "idle", operationId: event.operationId + 1 };
  return state;
}

export function maySaveSummary(consent: boolean, signedIn: boolean): boolean { return consent && signedIn; }
export function mayDeleteAccount(confirmed: boolean): boolean { return confirmed; }
