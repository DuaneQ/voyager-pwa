/**
 * The root component for the Voyager PWA.
 * Sets up routing, global providers, and Firebase Cloud Messaging for notifications.
 *
 * - Registers the user's FCM token in Firestore on permission grant.
 * - Displays foreground notifications using notistack snackbars.
 * - Provides context for alerts, user profiles, and new connections.
 *
 * @component
 * @returns {JSX.Element} The main application layout and routes.
 */

import { SnackbarProvider, useSnackbar } from "notistack";
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
import { getMessaging, onMessage } from "firebase/messaging";
import { Suspense, useEffect } from "react";
import { app } from "./environments/firebaseConfig";
import { BetaBanner } from "./components/utilities/BetaBanner";
import { FeedbackButton } from "./components/utilities/FeedbackButton";
import { TermsGuard } from "./components/auth/TermsGuard";
const messaging = getMessaging(app);

function App() {
  const { enqueueSnackbar } = useSnackbar();
  const location = useLocation();
  const hideBottomNav = [
    "/Login",
    "/Register",
    "/reset",
    "/ResendEmail",
  ].includes(location.pathname);

  useEffect(() => {
    // Handle foreground notifications globally
    const unsubscribe = onMessage(messaging, (payload) => {
      enqueueSnackbar(
        (payload.notification?.title || "Notification") +
          ": " +
          (payload.notification?.body || "")
      );
      console.log("Foreground FCM message received:", payload);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [enqueueSnackbar]);

  return (
    <SnackbarProvider
      maxSnack={2}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
      <AlertProvider>
        <Header />
        <NewConnectionProvider>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: "100vh",
            }}>
            <div style={{ flex: 1, paddingBottom: hideBottomNav ? 0 : 56, paddingTop: 56 }}>
              <Suspense fallback={<div>Loading...</div>}>
                <Routes>
                  <Route path="/Login" element={<Login />} />
                  <Route path="/Register" element={<Register />} />
                  <Route path="/ResendEmail" element={<ResendEmail />} />
                  <Route
                    path="/"
                    element={
                      <Protected>
                        <TermsGuard>
                          <UserProfileProvider>
                            <Profile />
                          </UserProfileProvider>
                        </TermsGuard>
                      </Protected>
                    }
                  />
                  <Route
                    path="/Search"
                    element={
                      <Protected>
                        <TermsGuard>
                          <UserProfileProvider>
                            <Search />
                          </UserProfileProvider>
                        </TermsGuard>
                      </Protected>
                    }
                  />
                  <Route
                    path="/Chat"
                    element={
                      <Protected>
                        <TermsGuard>
                          <UserProfileProvider>
                            <Chat />
                          </UserProfileProvider>
                        </TermsGuard>
                      </Protected>
                    }
                  />
                  <Route path="/Reset" element={<Reset />} />
                </Routes>
              </Suspense>
            </div>
            {!hideBottomNav && <BottomNav />}
          </div>
        </NewConnectionProvider>
        
        {/* Floating Feedback Button - shows on all pages except login/register */}
        {!hideBottomNav && <FeedbackButton position="bottom-right" />}
      </AlertProvider>
    </SnackbarProvider>
  );
}

export default App;
