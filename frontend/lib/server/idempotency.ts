import { supabaseAdmin } from './supabase-admin';
import { NextResponse } from 'next/server';

/**
 * Wraps a sale operation with idempotency protection.
 * 
 * If an idempotency key is provided:
 * 1. Tries to INSERT the key into idempotency_keys (fails if key exists)
 * 2. If key already exists (PRIMARY KEY conflict) → returns cached result
 * 3. If key is new → runs the operation, stores the result
 * 
 * If no key provided → runs the operation normally (no protection)
 * 
 * The process callback can return either { data, status } or a NextResponse.
 */
export async function withIdempotency(
  key: string | null,
  process: () => Promise<NextResponse | { data: any; status?: number }>
): Promise<NextResponse> {
  if (!key) return await process() as NextResponse;

  // Try to claim the key — INSERT fails if key exists (PRIMARY KEY constraint)
  const { data: claimed, error: insertError } = await supabaseAdmin
    .from('idempotency_keys')
    .insert({ key, result: {} })
    .select('key')
    .single();

  if (insertError || !claimed) {
    // Key already exists — return cached result (idempotent replay)
    const { data: existing } = await supabaseAdmin
      .from('idempotency_keys')
      .select('result')
      .eq('key', key)
      .single();

    if (existing?.result) {
      return NextResponse.json(existing.result, { status: 200 });
    }
    // Fall through to processing if cached result is missing (shouldn't happen)
  }

  // Key is ours — run the sale
  try {
    const result = await process();
    const status = result instanceof NextResponse ? result.status : (result.status ?? 201);
    // Only cache successful results (2xx) — errors should be retriable
    if (status >= 200 && status < 300) {
      const responseBody = result instanceof NextResponse
        ? await result.clone().json()
        : result.data;
      await supabaseAdmin
        .from('idempotency_keys')
        .update({ result: responseBody })
        .eq('key', key);
    } else {
      // Error — clean up the claimed key so retry works
      await supabaseAdmin.from('idempotency_keys').delete().eq('key', key);
    }
    return result instanceof NextResponse ? result : NextResponse.json(result.data, { status });
  } catch (error) {
    await supabaseAdmin.from('idempotency_keys').delete().eq('key', key);
    throw error;
  }
}
