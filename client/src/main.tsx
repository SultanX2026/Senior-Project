import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import Dashboard from "./pages/Dashboard";
import Community from "./pages/Community";
import Stock from "./pages/Stock";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";

const router = createBrowserRouter([
  { path: "/", element: <App />, children: [
      { index: true, element: <Dashboard /> },
      { path: "community", element: <Community /> },
      { path: "stock/:symbol", element: <Stock /> },
      { path: "auth", element: <Auth /> },
      { path: "register", element: <Register /> },
      { path: "profile", element: <Profile /> },
      { path: "forgot-password", element: <ForgotPassword /> },
  ]}
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
