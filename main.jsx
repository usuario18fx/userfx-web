import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app.jsx";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "./global.css";
import "./restricted-type.css";
import "./protocol-premium.css";
import "./protocol-selection.js";
import "./private-room-friend.js";
import "./robot-bubble.css";
import "./private-room-plans-height-fix.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <SpeedInsights />
  </React.StrictMode>,
);
