import { $http } from "../http";
import type { components } from "../types/api";

export type Device = components["schemas"]["Device"];
export type DeviceList = components["schemas"]["DeviceListResponse"];
type DeviceResponse = components["schemas"]["DeviceResponse"];
type CreateDeviceResponse = components["schemas"]["CreateDeviceResponse"];
type MessageResponse = components["schemas"]["MessageResponse"];

/** Every device of the account, newest first, plus how much of the plan's allowance is used. */
export function getDevices() {
  return $http.get<any, DeviceList>("devices");
}

/**
 * Create a device. The api key comes back once and is never retrievable again,
 * so the caller has to show it before dropping the response.
 */
export function createDevice(name: string, folder?: string) {
  return $http.post<any, CreateDeviceResponse>("devices", { name, folder });
}

export function renameDevice(publicId: string, name: string) {
  return $http.post<any, DeviceResponse>(`device/${publicId}/rename`, { name });
}

/** The folder the device reads from and writes to. Encrypted folders are refused by the API. */
export function setDeviceFolder(publicId: string, folder: string) {
  return $http.post<any, DeviceResponse>(`device/${publicId}/folder`, { folder });
}

/** Replaces the api key and returns the new one once. The old key stops working immediately. */
export function rotateDeviceKey(publicId: string) {
  return $http.post<any, CreateDeviceResponse>(`device/${publicId}/rotate-key`);
}

export function setDeviceEnabled(publicId: string, enabled: boolean) {
  return $http.post<any, DeviceResponse>(`device/${publicId}/${enabled ? "enable" : "disable"}`);
}

export function deleteDevice(publicId: string) {
  return $http.delete<any, MessageResponse>(`device/${publicId}`);
}
