import { supabase } from '../supabase/client';

const HEARTBEAT_INTERVAL = 5 * 60 * 1000;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let visibilityHandler: (() => void) | null = null;

async function pingSupabase() {
  try {
    await supabase.from('settings').select('value').limit(1);
  } catch {
    // Heartbeat is best effort and must not affect normal app use.
  }
}

export function startHeartbeat() {
  if (heartbeatTimer) return;

  void pingSupabase();
  heartbeatTimer = setInterval(pingSupabase, HEARTBEAT_INTERVAL);
  visibilityHandler = () => {
    if (document.visibilityState === 'visible') void pingSupabase();
  };
  document.addEventListener('visibilitychange', visibilityHandler);
}

export function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
}
