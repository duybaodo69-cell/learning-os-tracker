/**
 * main.tsx — điểm khởi động của ứng dụng.
 * Tìm thẻ <div id="root"> trong index.html rồi vẽ <App /> vào đó.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
