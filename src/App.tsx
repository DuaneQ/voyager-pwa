import "./App.css";
import { Route, Routes, useLocation } from "react-router-dom";
import { Search } from "./components/pages/Search";
import { Profile } from "./components/pages/Profile";
import { Login } from "./components/auth/Login";
import { Register } from "./components/auth/Register";
import { Chat } from "./components/pages/Chat";
import { AlertProvider } from "./Context/AlertContext";
import BottomNav from "./components/layout/BottomNavigation";
import { Reset } from "./components/auth/Reset";
import Header from "./components/layout/Header";
import { Protected } from "./Context/Protected";
import { ResendEmail } from "./components/auth/ResendEmail";

function App() {
  const location = useLocation();
  const hideBottomNav = ["/Login", "/Register", "/reset", "/ResendEmail"].includes(
    location.pathname
  );
  return (
    <AlertProvider>
      <Header />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}>
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/Login" element={<Login />} />
            <Route path="/Register" element={<Register />} />
            <Route path="/ResendEmail" element={<ResendEmail />} />
            <Route
              path="/"
              element={
                <Protected>
                  <Profile />
                </Protected>
              }
            />
            <Route
              path="/Search"
              element={
                <Protected>
                  <Search />
                </Protected>
              }
            />
            <Route
              path="/Chat"
              element={
                <Protected>
                  <Chat />
                </Protected>
              }
            />

            <Route path="/Reset" element={<Reset />} />
          </Routes>
        </div>
        {!hideBottomNav && <BottomNav />}
      </div>
    </AlertProvider>
  );
}

export default App;
