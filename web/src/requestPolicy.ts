export type RequestState = { busy: boolean; id: number };
export const initialRequestState: RequestState = { busy: false, id: 0 };
export function begin(state: RequestState): RequestState { return state.busy ? state : { busy: true, id: state.id + 1 }; }
export function settle(state: RequestState, id: number): RequestState { return state.id === id ? { ...state, busy: false } : state; }
export function cancel(state: RequestState): RequestState { return { busy: false, id: state.id + 1 }; }
