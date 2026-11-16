/**
 * Blocking and reporting, which answer different questions. A block is this
 * account's own remedy and takes effect at once; a report hands the matter to
 * someone else, either a space's owner or the operator. Neither tells the
 * other side anything.
 */
import { $http } from "../http";
import type { components } from "../types/api";

export type BlockedAccount = components["schemas"]["BlockedAccount"];

/**
 * Only the blocks this account made. Blocks against it are deliberately not
 * knowable: telling someone who blocked them is an invitation to go round it.
 */
export function getBlocks() {
  return $http.get<any, components["schemas"]["BlockListResponse"]>("account/blocks");
}

/**
 * Stops an account reaching this one, both ways and whoever asked for it: no
 * invites either direction, and in a space they already share neither sees the
 * other's clips. Nobody leaves a space over it, and the other side is not told.
 */
export function blockAccount(username: string) {
  return $http.post<any, components["schemas"]["MessageResponse"]>("account/blocks/add", { username });
}

/** Lifts this account's own block. One made the other way stands, and only its owner can lift it. */
export function unblockAccount(username: string) {
  return $http.post<any, components["schemas"]["MessageResponse"]>("account/blocks/remove", { username });
}

/**
 * Goes to the operator, not to another user: for an account, a space, or
 * someone's conduct in one. This is the route for a complaint no space owner
 * can answer, because the owner may be the problem.
 */
export function reportAccount(body: components["schemas"]["ReportAccountBody"]) {
  return $http.post<any, components["schemas"]["ReportResponse"]>("account/report", body);
}
