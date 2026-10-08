/**
 * Shared spaces. A space has one owner and any number of members, and every
 * member sees everything in it. Authorship decides who may change what: only
 * the member who added a clip can edit or delete it, and only the member who
 * made a folder can rename or delete it. The owner's powers are over the space
 * itself, not over other people's content.
 */
import { $http } from "../http";
import type { components } from "../types/api";

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

/** Author only, not even the owner. A file goes from storage too, so allow for that. */
export function deleteSpaceClip(spaceId: string, clipId: string) {
  return $http.post<any, MessageResponse>(`space/${spaceId}/clip/${clipId}/delete`, undefined, { timeout: 30_000 });
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

export async function getSpaceFileUrl(spaceId: string, clipId: string) {
  const { url } = await $http.get<any, components["schemas"]["FileUrlResponse"]>(
    `space/${spaceId}/clip/${clipId}/url`,
    { timeout: 30_000 }
  );
  return url;
}
