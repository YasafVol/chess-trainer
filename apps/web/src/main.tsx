import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { AppRuntimeProviders } from "./lib/runtimeGateway";
import { router } from "./router";
import "./index.css";
import "./styles.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element not found");
}

createRoot(rootEl).render(
  <React.StrictMode>
    <AppRuntimeProviders>
      <RouterProvider router={router} />
    </AppRuntimeProviders>
  </React.StrictMode>
);
