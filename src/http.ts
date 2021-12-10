import axios from "axios";
import config from "./config";
import { $alert } from "./components/ws-alert/ws-alert";
import { $localStorage } from "./stores/native";

export const $http = axios.create({
  baseURL: config.baseUrl,
  timeout: 1000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    oc_token: $localStorage.get("token")
  }
});

$http.interceptors.response.use((response) => {
  if (response.data && response.data.info) {
    $alert.info(response.data.info);
  }

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
