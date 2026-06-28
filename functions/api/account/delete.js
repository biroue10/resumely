// POST /api/account/delete
// Deletes the account, its cloud Master Profile, and the current session.
// Mirrors the client-side "Delete local data" feature for saved cloud data.
import { json, kv, getBearer, accountFromSession } from "../_shared.js";

export async function onRequestPost({ request, env }) {
  const store = kv(env);
  if (!store) return json({ ok: true, configured: false });

  const account = await accountFromSession(env, request);
  const session = getBearer(request);
  if (session) await store.delete(`session:${session}`);

  if (account?.email) {
    await store.delete(`account:${account.email}`);
    await store.delete(`master:${account.email}`);
  }
  return json({ ok: true });
}
