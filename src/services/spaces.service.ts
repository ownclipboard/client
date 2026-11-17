/**
 * Shared spaces. A space has one owner and any number of members, and every
 * member sees everything in it. Authorship decides who may change what: only
 * the member who added a clip can edit it, and only the member who made a
 * folder can rename or delete it. The owner's powers are over the space
 * itself, with one reach into its content: they can delete any clip, which is
 * what makes a report they uphold mean anything.
 *
 * Every member sees everything in it *that reaches them*: clips by an account
 * either side has blocked are left out, with nothing to mark the gap, so two
 * members can be shown different lists of the same space.
 */
import { $http } from "../http";
import type { components } from "../types/api";
import type { ListFilesOptions } from "./files.service";

export type Space = components["schemas"]["SpaceSummary"];
export type SpaceDetail = components["schemas"]["SpaceDetail"];
export type SpaceInvite = components["schemas"]["SpaceInvite"];
export type SpaceMember = components["schemas"]["SpaceMemberInfo"];
export type SpaceFolder = components["schemas"]["SpaceFolderInfo"];
export type SpaceClip = components["schemas"]["SpaceClip"];
export type SpaceClipsPage = components["schemas"]["PaginatedSpaceClips"];

type MessageResponse = components["schemas"]["MessageResponse"];

/* ---------------- Spaces ---------------- */

/** Spaces the user owns or has joined, plus invites waiting for an answer. */
export function getSpaces() {
  return $http.get<any, components["schemas"]["SpacesListResponse"]>("spaces");
}

export function createSpace(name: string) {
  return $http.post<any, components["schemas"]["SpaceCreatedResponse"]>("spaces", { name });
}

/** The space with the owner's plan limits and how much storage it has used. */
export function getSpace(spaceId: string) {
  return $http.get<any, components["schemas"]["SpaceDetailResponse"]>(`space/${spaceId}`);
}

export function renameSpace(spaceId: string, name: string) {
  return $http.post<any, MessageResponse>(`space/${spaceId}/rename`, { name });
}

/** Owner only. Takes the clips, folders, files and memberships with it. */
export function deleteSpace(spaceId: string) {
  return $http.post<any, MessageResponse>(`space/${spaceId}/delete`, undefined, { timeout: 30_000 });
}

/* ---------------- Members ---------------- */

/** Owner first. Pending invites come back only for the owner. */
export function getSpaceMembers(spaceId: string) {
  return $http.get<any, components["schemas"]["SpaceMembersResponse"]>(`space/${spaceId}/members`);
}

export function inviteToSpace(spaceId: string, username: string) {
  return $http.post<any, MessageResponse>(`space/${spaceId}/invite`, { username });
}

export function acceptSpaceInvite(spaceId: string) {
  return $http.post<any, MessageResponse>(`space/${spaceId}/accept`);
}

export function declineSpaceInvite(spaceId: string) {
  return $http.post<any, MessageResponse>(`space/${spaceId}/decline`);
}

/** Owner only. Also cancels an invite that has not been answered. Their clips stay. */
export function removeSpaceMember(spaceId: string, username: string) {
  return $http.post<any, MessageResponse>(`space/${spaceId}/remove`, { username });
}

/** Members only. The owner deletes the space instead. Your clips stay behind. */
export function leaveSpace(spaceId: string) {
  return $http.post<any, MessageResponse>(`space/${spaceId}/leave`);
}

/* ---------------- Folders ---------------- */

export function getSpaceFolders(spaceId: string) {
  return $http.get<any, components["schemas"]["SpaceFoldersResponse"]>(`space/${spaceId}/folders`);
}

export function createSpaceFolder(spaceId: string, name: string) {
  return $http.post<any, components["schemas"]["SpaceFolderResponse"]>(`space/${spaceId}/folders/create`, { name });
}

/** Its author only, and never the default folder. */
export function renameSpaceFolder(spaceId: string, slug: string, name: string) {
  return $http.post<any, components["schemas"]["SpaceFolderResponse"]>(`space/${spaceId}/folder/${slug}/rename`, { name });
}

/** Its author only, and only while every clip in it is theirs. */
export function deleteSpaceFolder(spaceId: string, slug: string) {
  return $http.post<any, MessageResponse>(`space/${spaceId}/folder/${slug}/delete`, undefined, { timeout: 30_000 });
}

/* ---------------- Clips ---------------- */

export function getSpaceClips(spaceId: string, folder: string, params?: Record<string, any>) {
  return $http.get<any, components["schemas"]["SpaceClipsListResponse"]>(
    `space/${spaceId}/clips/${folder || "clipboard"}`,
    { params }
  );
}

export function searchSpaceClips(spaceId: string, params: Record<string, any>) {
  return $http.get<any, components["schemas"]["SpaceClipsListResponse"]>(`space/${spaceId}/clips/search`, { params });
}

export function pasteIntoSpace(spaceId: string, body: components["schemas"]["SpacePasteBody"]) {
  return $http.post<any, components["schemas"]["SpaceClipResponse"]>(`space/${spaceId}/clips/paste`, body);
}

/** Author only. A file clip has nothing but its title to change. */
export function updateSpaceClip(spaceId: string, clipId: string, body: components["schemas"]["UpdateClipBody"]) {
  return $http.post<any, MessageResponse>(`space/${spaceId}/clip/${clipId}/update`, body);
}

/**
 * The clip's author, or the space's owner. A file goes from storage too, so
 * allow for that. An owner deleting a reported clip closes the reports about it
 * as well, and `reportsResolved` says how many; deleting an unreported clip
 * leaves the field off.
 */
export function deleteSpaceClip(spaceId: string, clipId: string) {
  return $http.post<any, components["schemas"]["DeleteSpaceClipResponse"]>(
    `space/${spaceId}/clip/${clipId}/delete`,
    undefined,
    { timeout: 30_000 }
  );
}

/** Move clips into another folder of the same space. Only their author can. */
export function moveSpaceClips(spaceId: string, ids: string[], folder: string) {
  return $http.post<any, components["schemas"]["SpaceMoveClipsResponse"]>(
    `space/${spaceId}/clips/move`,
    { ids, folder },
    { timeout: 30_000 }
  );
}

/** Take a copy of someone's clip into your own folders. A file needs your own storage. */
export function transferSpaceClip(spaceId: string, clipId: string, folder?: string) {
  return $http.post<any, components["schemas"]["TransferToFolderResponse"]>(
    `space/${spaceId}/clip/${clipId}/transfer`,
    { folder },
    { timeout: 30_000 }
  );
}

/* ---------------- Reports ---------------- */

export type SpaceReport = components["schemas"]["SpaceReport"];

/**
 * Owner only, and a member who is not the owner gets a 404 rather than a 403,
 * so owning a space cannot be probed for. Defaults to the open ones, which is
 * the queue; `open` counts those whatever was asked for.
 */
export function getSpaceReports(spaceId: string, status?: SpaceReport["status"]) {
  return $http.get<any, components["schemas"]["SpaceReportsResponse"]>(`space/${spaceId}/reports`, {
    params: status ? { status } : undefined
  });
}

/**
 * Hands a clip to the space's owner. Any member can report any clip but their
 * own, and what it said is copied into the report, so the owner still sees the
 * complaint if the author edits or deletes it first. Reporting the same clip
 * twice adds nothing.
 */
export function reportSpaceClip(spaceId: string, clipId: string, body: components["schemas"]["ReportClipBody"]) {
  return $http.post<any, components["schemas"]["ReportResponse"]>(`space/${spaceId}/clip/${clipId}/report`, body);
}

/**
 * The owner's other answer: the clip stays and the report is closed. Deleting
 * the clip resolves its reports on its own, so this is for the other outcome.
 * A dismissed report is kept as the record of what was decided.
 */
export function dismissSpaceReport(spaceId: string, reportId: string) {
  return $http.post<any, MessageResponse>(`space/${spaceId}/report/${reportId}/dismiss`);
}

/* ---------------- Files ---------------- */

export function startSpaceUpload(spaceId: string, body: components["schemas"]["SpaceFileUploadBody"]) {
  return $http.post<any, components["schemas"]["SpaceFileUploadResponse"]>(`space/${spaceId}/files/upload`, body, {
    timeout: 30_000
  });
}

/** The clip stays invisible to the space until this confirms the bytes arrived. */
export function confirmSpaceUpload(spaceId: string, clipId: string) {
  return $http.post<any, components["schemas"]["SpaceClipResponse"]>(
    `space/${spaceId}/clip/${clipId}/confirm`,
    undefined,
    { timeout: 30_000 }
  );
}

/**
 * By clip, for a file shown as a clip of the space. `thumb` asks for the
 * 200x200 version, which exists only for images.
 */
export async function getSpaceClipFileUrl(spaceId: string, clipId: string, thumb = false) {
  const { url } = await $http.get<any, components["schemas"]["FileUrlResponse"]>(
    `space/${spaceId}/clip/${clipId}/url`,
    { timeout: 30_000, params: thumb ? { thumb: 1 } : undefined }
  );
  return url;
}

/* ---------------- Files ---------------- */

/**
 * Every file in the space, by any member, newest first. The same response the
 * personal `GET files` returns, so the same grid draws it, with two additions:
 * `author` says who uploaded each one and `mine` whether that is the caller.
 *
 * `preview` is the shared storage's key on the same terms as the personal
 * listing: present unless preview links are off, and the rows then carry urls
 * that need no authentication. Without it, ask per file with `getSpaceFileUrl`.
 */
export function listSpaceFiles(spaceId: string, options: ListFilesOptions = {}) {
  return $http.get<any, components["schemas"]["FileListResponse"]>(`space/${spaceId}/files`, { params: options });
}

/** By file, for the space's own storage. `thumb` asks for the 200x200 image. */
export async function getSpaceFileUrl(spaceId: string, fileId: string, thumb = false) {
  const { url } = await $http.get<any, components["schemas"]["FileUrlResponse"]>(
    `space/${spaceId}/file/${fileId}/url`,
    { timeout: 30_000, params: thumb ? { thumb: 1 } : undefined }
  );
  return url;
}

/* ---------------- Locking ---------------- */

export type SpaceLockState = components["schemas"]["SpaceLockState"];
export type SpaceFactor = components["schemas"]["SpaceFactor"];
export type SpaceRequirement = components["schemas"]["SpaceRequirement"];

/**
 * What this account must pass before the space opens. The only space route that
 * answers while the space is shut, which is what makes a gate possible.
 */
export function getSpaceLock(spaceId: string) {
  return $http.get<any, SpaceLockState>(`space/${spaceId}/lock`);
}

/** Opens the space for this session only, until the idle window runs out. */
export function unlockSpace(spaceId: string, body: components["schemas"]["SpaceUnlockBody"]) {
  return $http.post<any, components["schemas"]["SpaceUnlockResponse"]>(`space/${spaceId}/unlock`, body);
}

/**
 * This account's own password for this space, never shared with the space.
 * Hashed here, as folder passwords are. `current` is needed to change one
 * unless this session already holds the space open.
 */
export function setSpaceLockPassword(spaceId: string, password: string, current?: string) {
  return $http.post<any, MessageResponse>(`space/${spaceId}/lock/password`, { password, current });
}

/** Turns this account's authenticator requirement on or off here. A code is needed either way. */
export function setSpaceTotp(spaceId: string, enabled: boolean, code: string) {
  return $http.post<any, MessageResponse>(`space/${spaceId}/lock/totp`, { enabled, code });
}

/** Drops the factors this account chose, after passing them. What the owner demands stays. */
export function removeSpaceLock(spaceId: string, body: components["schemas"]["SpaceUnlockBody"]) {
  return $http.post<any, SpaceLockState>(`space/${spaceId}/lock/remove`, body);
}

/** Owner only: what everyone must pass, and how long an unlock survives idle. */
export function setSpaceSecurity(spaceId: string, require: SpaceRequirement, unlockMinutes?: number) {
  return $http.post<any, MessageResponse>(`space/${spaceId}/security`, { require, unlockMinutes });
}

/** Creator only: emails a recovery code to the account's verified address. */
export function requestSpaceRecoveryCode(spaceId: string) {
  return $http.post<any, MessageResponse>(`space/${spaceId}/lock/recover/code`, undefined, { timeout: 30_000 });
}

/** Creator only: clears their own factors here and opens the space for this session. */
export function recoverSpace(spaceId: string, code: string, password: string) {
  return $http.post<any, components["schemas"]["SpaceUnlockResponse"]>(`space/${spaceId}/lock/recover`, {
    code,
    password
  });
}
