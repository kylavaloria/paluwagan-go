import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import ToastContainer from "./Toast";
import { useTranslation } from "react-i18next";

export default function Layout() {
  const { t } = useTranslation();
  return (
    <div className="layout">
      <Navbar />
      <main className="layout-main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">
          {t("footer.tagline")}
        </div>
      </footer>
      <ToastContainer />
    </div>
  );
}
