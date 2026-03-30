import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider } from "./hooks/useWallet";
import { ToastProvider } from "./hooks/useToast";
import Layout from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import CreateGroupPage from "./pages/CreateGroupPage";
import GroupDetailsPage from "./pages/GroupDetailsPage";
import ProfilePage from "./pages/ProfilePage";
import "./styles.css";

export default function App() {
  return (
    <HashRouter>
      <WalletProvider>
        <ToastProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<Navigate to="/group" replace />} />
              <Route path="/create" element={<CreateGroupPage />} />
              <Route path="/group" element={<GroupDetailsPage />} />
              <Route path="/group/:id" element={<GroupDetailsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </WalletProvider>
    </HashRouter>
  );
}
