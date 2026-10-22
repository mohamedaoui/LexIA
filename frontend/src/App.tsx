import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAdmin, RequireAuth } from "./auth";
import { ChatPage } from "./pages/ChatPage";
import { CategoriesPage } from "./pages/admin/CategoriesPage";
import { DashboardLayout } from "./pages/admin/DashboardLayout";
import { FaqPage } from "./pages/admin/FaqPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <ChatPage />
          </RequireAuth>
        }
      />
      <Route
        path="/c/:conversationId"
        element={
          <RequireAuth>
            <ChatPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAdmin>
            <DashboardLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="faq" element={<FaqPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
