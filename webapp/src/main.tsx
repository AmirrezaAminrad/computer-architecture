import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/vazirmatn/arabic-400.css";
import "@fontsource/vazirmatn/arabic-500.css";
import "@fontsource/vazirmatn/arabic-600.css";
import "@fontsource/vazirmatn/arabic-700.css";
import "./index.css";
import { LanguageProvider } from "./lib/i18n";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>
);
