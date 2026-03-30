import React from "react";
import ReactDOM from "react-dom/client";
import "./style.css";
import AlbumLockPanel from "./components/AlbumLockPanel";

function App() {
  return <AlbumLockPanel />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
