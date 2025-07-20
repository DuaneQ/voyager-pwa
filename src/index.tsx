import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import reportWebVitals from "./reportWebVitals";
import { BrowserRouter } from "react-router-dom";
import { UserAuthContextProvider } from "./Context/UserAuthContext";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { getPerformance } from "firebase/performance";
import { getAnalytics, logEvent } from "firebase/analytics";
import { app } from "./environments/firebaseConfig";

let analytics: ReturnType<typeof getAnalytics> | undefined;
if (process.env.NODE_ENV === "production") {
  getPerformance(app);
  analytics = getAnalytics(app);
  // Example: log a page view
  logEvent(analytics, "page_view", { page_path: window.location.pathname });
}

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <UserAuthContextProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </UserAuthContextProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    // When a new service worker is available, show a notification to users
    const confirmUpdate = window.confirm(
      'A new version of TravalPass is available. Would you like to update now?'
    );
    
    if (confirmUpdate && registration.waiting) {
      // Tell the waiting service worker to skip waiting and become active
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page to get the new version
      window.location.reload();
    }
  },
  onSuccess: (registration) => {
    console.log('TravalPass is ready for offline use.');
  }
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
