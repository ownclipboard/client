import { reactive } from "vue";
import { nanoid } from "nanoid";

export type WS_Alert = {
  id: string;
  type: string;
  icon: string;
  message: string;
  timeout?: number | false;
};

export const Alerts = reactive<WS_Alert[]>([]);

export function closeAlert(id: string) {
  const index = Alerts.findIndex((a) => a.id === id);
  if (index > -1) Alerts.splice(index, 1);
}

function alert(data: Omit<WS_Alert, "id">) {
  const newAlert = {
    id: nanoid(5),
    timeout: 5000,
    ...data
  };

  if (Alerts.length) {
    const findAlert = Alerts.findIndex((a) => {
      return a.type === data.type && a.message === data.message;
    });

    if (findAlert > -1) return;
  }

  Alerts.push(newAlert);

  if (newAlert.timeout) {
    setTimeout(() => closeAlert(newAlert.id), newAlert.timeout);
  }
}

export const $alert = {
  success(message: string, options?: WS_Alert) {
    alert({
      type: "success",
      icon: "fa fa-check-circle",
      message,
      ...(options || {})
    });
    return this;
  },

  info(message: string, options?: WS_Alert) {
    alert({
      type: "info",
      icon: "fa fa-info-circle",
      message,
      ...(options || {})
    });
    return this;
  },

  warning(message: string, options?: WS_Alert) {
    alert({
      type: "warning",
      icon: "fa fa-exclamation-triangle",
      message,
      ...(options || {})
    });

    return this;
  },

  error(message: string, options?: WS_Alert) {
    alert({
      type: "error",
      icon: "fa fa-bomb",
      message,
      ...(options || {})
    });
    return this;
  }
};
