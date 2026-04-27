/**
 * User-scoped CSV export presets, stored in `user_export_presets` so they
 * follow a user across devices. Falls back to localStorage when the user
 * is signed out or the network is unavailable.
 *
 * `payload` is intentionally untyped (jsonb) — each page picks its own shape.
 * For the customer-update-requests page that's `{ statuses: UpdateRequestStatus[] }`.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ExportPreset<T = unknown> {
  id?: string;
  name: string;
  payload: T;
  /** From the DB — undefined when the preset only exists in localStorage. */
  updated_at?: string;
}

export interface PresetScope {
  userId: string | null;
  companyId: string | null;
  pageKey: string;
}

/** localStorage key — keeps offline cache scoped the same way as the DB row. */
function lsKey({ userId, companyId, pageKey }: PresetScope) {
  return `export-presets:${pageKey}:${userId ?? "anon"}:${companyId ?? "none"}`;
}

function readLocal<T>(scope: PresetScope): ExportPreset<T>[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(lsKey(scope));
    return raw ? (JSON.parse(raw) as ExportPreset<T>[]) : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(scope: PresetScope, presets: ExportPreset<T>[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(lsKey(scope), JSON.stringify(presets));
  } catch {
    // Storage quota exceeded / disabled — non-fatal.
  }
}

/**
 * Load presets for the current user/page. Tries the DB first; if that fails
 * (offline, signed out), returns whatever's in localStorage so the UI keeps
 * working. Always refreshes the local cache when DB returns successfully.
 *
 * When the DB request fails, `onDbError` is invoked with the error so callers
 * can surface a toast — the function still resolves with the local cache so
 * the UI keeps working offline.
 */
export async function loadPresets<T = unknown>(
  scope: PresetScope,
  options?: { onDbError?: (error: Error) => void },
): Promise<ExportPreset<T>[]> {
  if (!scope.userId) return readLocal<T>(scope);

  try {
    let q = supabase
      .from("user_export_presets")
      .select("id, name, payload, updated_at")
      .eq("user_id", scope.userId)
      .eq("page_key", scope.pageKey);
    q = scope.companyId
      ? q.eq("company_id", scope.companyId)
      : q.is("company_id", null);
    const { data, error } = await q.order("name");
    if (error) throw error;
    const presets: ExportPreset<T>[] = (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      payload: r.payload as T,
      updated_at: r.updated_at,
    }));
    writeLocal(scope, presets);
    return presets;
  } catch (err) {
    options?.onDbError?.(err instanceof Error ? err : new Error(String(err)));
    return readLocal<T>(scope);
  }
}

/**
 * Upsert a preset by (user, company, page, name). Updates the local cache
 * even when the network call fails so the user doesn't lose their work.
 */
export async function savePreset<T>(
  scope: PresetScope,
  preset: ExportPreset<T>,
): Promise<ExportPreset<T>> {
  const local = readLocal<T>(scope).filter((p) => p.name !== preset.name);
  const next = [...local, preset].sort((a, b) => a.name.localeCompare(b.name));
  writeLocal(scope, next);

  if (!scope.userId) return preset;

  const { data, error } = await supabase
    .from("user_export_presets")
    .upsert(
      {
        user_id: scope.userId,
        company_id: scope.companyId,
        page_key: scope.pageKey,
        name: preset.name,
        payload: preset.payload as never,
      },
      { onConflict: "user_id,company_id,page_key,name" },
    )
    .select("id, name, payload, updated_at")
    .single();
  if (error) throw error;
  const saved: ExportPreset<T> = {
    id: data.id,
    name: data.name,
    payload: data.payload as T,
    updated_at: data.updated_at,
  };
  writeLocal(
    scope,
    next.map((p) => (p.name === saved.name ? saved : p)),
  );
  return saved;
}

/** Delete by name. Removes from local cache regardless of network outcome. */
export async function deletePreset(
  scope: PresetScope,
  name: string,
): Promise<void> {
  const local = readLocal(scope).filter((p) => p.name !== name);
  writeLocal(scope, local);

  if (!scope.userId) return;

  let q = supabase
    .from("user_export_presets")
    .delete()
    .eq("user_id", scope.userId)
    .eq("page_key", scope.pageKey)
    .eq("name", name);
  q = scope.companyId
    ? q.eq("company_id", scope.companyId)
    : q.is("company_id", null);
  const { error } = await q;
  if (error) throw error;
}
