import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./lib/auth.jsx";
import { supabaseConfigured } from "./supabase.js";
import "./styles.css";

const tree = supabaseConfigured ? <AuthProvider><App /></AuthProvider> : <App />;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>{tree}</BrowserRouter>
  </React.StrictMode>
);
