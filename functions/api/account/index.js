// GET /api/account  -> { account } | { account: null }
// Returns the public account view (including current pass status) for the
// session bearer token. Used by the client to refresh pass state.
import { json, accountFromSession, publicAccount } from "../_shared.js";

export async function onRequestGet({ request, env }) {
  const account = await accountFromSession(env, request);
  return json({ account: publicAccount(account) });
}
