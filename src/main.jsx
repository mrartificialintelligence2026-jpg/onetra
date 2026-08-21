/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";
import Doctor1Vnext from "./Doctor1Vnext.jsx";
import Legal from "./Legal.jsx";
import Admin from "./Admin.jsx";
import { AuthProvider } from "./AuthProvider.jsx";

const path = window.location.pathname.replace(/\/$/, "") || "/";

let Component = App;
if (path === "/login") Component = Login;
if (path === "/dashboard" || path === "/doctor1-vnext") Component = Doctor1Vnext;
if (path === "/onco_view") Component = Dashboard;
if (path === "/admin") Component = Admin;
if (path === "/privacy") Component = function Privacy() { return <Legal kind="privacy" />; };
if (path === "/terms") Component = function Terms() { return <Legal kind="terms" />; };

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <Component />
    </AuthProvider>
  </StrictMode>
);
