import axios from "axios";
import config from "./config";
import { $alert } from "./components/ws-alert/ws-alert";

export const $http = axios.create({
  baseURL: config.baseUrl,
  timeout: 1000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  }
});

$http.interceptors.response.use((response) => {
  return response.data;
});

export function alertRequestError(res: any) {
  if (res.response) {
    const { data } = res.response;
    if (typeof data === "object" && data.error) {
      $alert.error(data.error);
    }
  }
}
