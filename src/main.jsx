import React from "react";
import { createRoot } from "react-dom/client";
import ResumeGenerator from "./ResumeGenerator.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ResumeGenerator />
  </React.StrictMode>
);
