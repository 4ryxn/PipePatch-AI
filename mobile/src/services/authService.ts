import * as SecureStore from "expo-secure-store";
import { apiBaseUrl } from "../config/api";
import type { Account, HistoryEntry, HistorySummary } from "../types/auth";
const TOKEN_KEY = "pipepatch_access_token";
export async function token(): Promise<string | null> { return SecureStore.getItemAsync(TOKEN_KEY); }
export async function clearToken(): Promise<void> { await SecureStore.deleteItemAsync(TOKEN_KEY); }
async function request(path: string, init: RequestInit = {}): Promise<Response> { const value = await token(); const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(value ? { Authorization: `Bearer ${value}` } : {}), ...init.headers } }); if (response.status === 401) await clearToken(); return response; }
export async function authenticate(path: "/api/v1/auth/login" | "/api/v1/auth/register", email: string, password: string): Promise<void> { const response = await request(path, { method: "POST", body: JSON.stringify({ email, password }) }); if (!response.ok) throw new Error("Authentication unavailable"); const body = await response.json() as { access_token: string }; await SecureStore.setItemAsync(TOKEN_KEY, body.access_token); }
export async function currentAccount(): Promise<Account> { const response = await request("/api/v1/auth/me"); if (!response.ok) throw new Error("Account unavailable"); return await response.json() as Account; }
export async function signOut(): Promise<void> { await clearToken(); }
export async function deleteAccount(): Promise<void> { const response = await request("/api/v1/auth/me", { method: "DELETE" }); if (!response.ok) throw new Error("Account deletion unavailable"); await clearToken(); }
export async function listHistory(): Promise<HistoryEntry[]> { const response = await request("/api/v1/history"); if (!response.ok) throw new Error("History unavailable"); return await response.json() as HistoryEntry[]; }
export async function saveHistory(title: string, summary: HistorySummary): Promise<HistoryEntry> { const response = await request("/api/v1/history", { method: "POST", body: JSON.stringify({ title, summary }) }); if (!response.ok) throw new Error("History could not be saved"); return await response.json() as HistoryEntry; }
export async function removeHistory(id: string): Promise<void> { const response = await request(`/api/v1/history/${id}`, { method: "DELETE" }); if (!response.ok) throw new Error("History could not be deleted"); }
