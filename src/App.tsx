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
import { getAnalytics, logEvent } from "firebase/analytics";
import { getMessaging, onMessage } from "firebase/messaging";
import { Suspense, useEffect } from "react";
import "./App.css";
import { Route, Routes, useLocation } from "react-router-dom";
import { Search } from "./components/pages/Search";
import { Profile } from "./components/pages/Profile";
import { VideoFeedPage } from "./components/pages/VideoFeedPage";
import { VideoPage } from "./components/pages/VideoPage";
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
import { app } from "./environments/firebaseConfig";
import { FeedbackButton } from "./components/utilities/FeedbackButton";
import { SimpleTermsGuard } from "./components/auth/SimpleTermsGuard";

// AnalyticsTracker logs a page_view event on every route change
function AnalyticsTracker() {
  const location = useLocation();
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      try {
        const analytics = getAnalytics();
        logEvent(analytics, "page_view", { page_path: location.pathname });
      } catch (e) {
        // Analytics not initialized or not supported
      }
    }
  }, [location]);
  return null;
}

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
        <UserProfileProvider>
          <Header />
          <NewConnectionProvider>
            <AnalyticsTracker />
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
                        <SimpleTermsGuard>
                          <Profile />
                        </SimpleTermsGuard>
                      </Protected>
                    }
                  />
                  <Route
                    path="/Search"
                    element={
                      <Protected>
                        <SimpleTermsGuard>
                          <Search />
                        </SimpleTermsGuard>
                      </Protected>
                    }
                  />
                  <Route
                    path="/Videos"
                    element={
                      <Protected>
                        <SimpleTermsGuard>
                          <VideoFeedPage />
                        </SimpleTermsGuard>
                      </Protected>
                    }
                  />
                  <Route
                    path="/video/:videoId"
                    element={
                      <Protected>
                        <SimpleTermsGuard>
                          <VideoPage />
                        </SimpleTermsGuard>
                      </Protected>
                    }
                  />
                  <Route
                    path="/Chat"
                    element={
                      <Protected>
                        <SimpleTermsGuard>
                          <Chat />
                        </SimpleTermsGuard>
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
        </UserProfileProvider>
      </AlertProvider>
    </SnackbarProvider>
  );
}

export default App;
