import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { registerPwaUpdate } from "./pwaUpdate";
import "./styles/global.scss";

registerPwaUpdate();

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
