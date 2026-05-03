import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ChatPage         from "./pages/ChatPage";
import KeyManagementPage from "./pages/KeyManagementPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"      element={<ChatPage />} />
        <Route path="/chat"  element={<ChatPage />} />
        <Route path="/keys"  element={<KeyManagementPage />} />
        <Route path="*"      element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}