import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";

const path = window.location.pathname;

let Component = App;
if (path === "/login") Component = Login;
if (path === "/dashboard" || path === "/onco_view") Component = Dashboard;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Component />
  </StrictMode>
);
