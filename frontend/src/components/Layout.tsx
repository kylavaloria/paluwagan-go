import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import ToastContainer from "./Toast";

export default function Layout() {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout-main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">
          Paluwagan Go — Save together, grow together. Built on Stellar.
        </div>
      </footer>
      <ToastContainer />
    </div>
  );
}
