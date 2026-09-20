"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      let refreshing = false;
      const refresh = () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener("controllerchange", refresh);
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => undefined);
      return () => navigator.serviceWorker.removeEventListener("controllerchange", refresh);
    }
  }, []);
  return null;
}
