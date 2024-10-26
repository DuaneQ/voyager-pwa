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

function App() {
  const location = useLocation();
  const hideBottomNav = ["/", "/Register", "/reset"].includes(location.pathname);
  return (
    <AlertProvider>
      <Header />
      <div
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="Register" element={<Register />} />
            <Route path="Profile" element={<Profile />} />
            <Route path="Search" element={<Search />} />
            <Route path="Chat" element={<Chat />} />
            <Route path="Reset" element={<Reset />} />
          </Routes>
        </div>
        {!hideBottomNav && <BottomNav />}
      </div>
    </AlertProvider>
  );
}

export default App;
