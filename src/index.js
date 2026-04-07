import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <title>Tracker20 - Tormenta20 RPG Tracker</title>
    <App />
  </StrictMode>
);
