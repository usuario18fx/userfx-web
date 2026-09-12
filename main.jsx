import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app.jsx";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "./global.css";
import "./components/FxAccess/FxAccessModal/FxAccessTabs.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <SpeedInsights />
  </React.StrictMode>
);