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
import { UserProfileProvider } from "./Context/UserProfileContext";
import { NewConnectionProvider } from "./Context/NewConnectionContext";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { useEffect } from "react";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { auth } from "./environments/firebaseConfig";
import { app } from "./environments/firebaseConfig";
const messaging = getMessaging(app);

function App() {
  const location = useLocation();
  const hideBottomNav = [
    "/Login",
    "/Register",
    "/reset",
    "/ResendEmail",
  ].includes(location.pathname);

  useEffect(() => {
    const db = getFirestore();

    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        getToken(messaging, {
          vapidKey:
            "BFXokQ9ogHw5nCPp6cLcB7vSJiuImIgHy2yadISEdZw6gxVqczqK_RxqmsaJBU0E780-4TV1ZmgfLK_TWNg_2cs",
        }).then(async (currentToken) => {
          if (currentToken && auth.currentUser) {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await setDoc(userRef, { fcmToken: currentToken }, { merge: true });
          }
        });
      }
    });

    // Handle foreground notifications
    onMessage(messaging, (payload) => {
      // You can customize this (toast, alert, etc.)
      alert(
        (payload.notification?.title || "Notification") +
          ": " +
          (payload.notification?.body || "")
      );
      // Or use a custom UI/toast here
      console.log("Foreground FCM message received:", payload);
    });
  }, []);
  return (
    <AlertProvider>
      <Header />
      <NewConnectionProvider>
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
                    <UserProfileProvider>
                      <Profile />
                    </UserProfileProvider>
                  </Protected>
                }
              />
              <Route
                path="/Search"
                element={
                  <Protected>
                    <UserProfileProvider>
                      <Search />
                    </UserProfileProvider>
                  </Protected>
                }
              />
              <Route
                path="/Chat"
                element={
                  <Protected>
                    <UserProfileProvider>
                      <Chat />
                    </UserProfileProvider>
                  </Protected>
                }
              />
              <Route path="/Reset" element={<Reset />} />
            </Routes>
          </div>
          {!hideBottomNav && <BottomNav />}
        </div>
      </NewConnectionProvider>
    </AlertProvider>
  );
}

export default App;
