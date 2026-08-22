import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app.jsx";
import { SpeedInsights } from "@vercel/speed-insights/react";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <SpeedInsights />
  </React.StrictMode>
);