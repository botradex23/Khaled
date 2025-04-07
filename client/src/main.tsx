import { createRoot } from "react-dom/client";
import React, { StrictMode } from "react";
import * as React from 'react';
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
