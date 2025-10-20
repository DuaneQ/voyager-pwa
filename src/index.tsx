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

// Unregister any old FCM service workers that might be causing issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      if (registration.active?.scriptURL?.includes('firebase-messaging-sw')) {
        console.log('[SW] Unregistering old FCM service worker:', registration.active.scriptURL);
        registration.unregister();
      }
    });
  });
}

// Suppress Google Maps API deprecation warnings
if (process.env.NODE_ENV === 'development') {
  const originalConsoleWarn = console.warn;
  console.warn = function(message, ...args) {
    // Filter out Google Maps Places API deprecation warnings
    if (typeof message === 'string' && (
      message.includes('AutocompleteService is not available to new customers') ||
      message.includes('google.maps.places.AutocompleteService') ||
      message.includes('google.maps.places.AutocompleteSuggestion is recommended') ||
      message.includes('developers.google.com/maps/legacy') ||
      message.includes('places-migration-overview')
    )) {
      return; // Suppress these warnings in development
    }
    originalConsoleWarn.apply(console, [message, ...args]);
  };
}

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
    // When a new service worker is available, show a single prompt and then
    // wait for the new worker to take control before reloading. This avoids
    // repeated prompts (user clicking OK but the reload happening before the
    // worker activates) and multiple confirmations across quick reloads.
    try {
      const swUrl = registration?.waiting?.scriptURL || 'unknown-sw';
      const promptKey = `sw-update-prompted:${swUrl}`;

      // Add cooldown period: don't show update prompt more than once every 30 minutes
      const lastPromptTimeKey = 'sw-update-last-prompt-time';
      const lastPromptTime = localStorage.getItem(lastPromptTimeKey);
      const now = Date.now();
      const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
      
      if (lastPromptTime && (now - parseInt(lastPromptTime)) < COOLDOWN_MS) {
        console.log('[SW] Update available but in cooldown period, skipping prompt');
        return;
      }

      // If we've already prompted for this exact waiting worker, don't prompt again
      if (localStorage.getItem(promptKey)) return;

      const confirmUpdate = window.confirm(
        'A new version of TravalPass is available. Would you like to update now?'
      );

      // Record that we showed the prompt (regardless of user choice)
      localStorage.setItem(lastPromptTimeKey, now.toString());

      if (!confirmUpdate) return;

      if (registration.waiting) {
        // mark that we've prompted for this worker so we don't show the dialog again
        localStorage.setItem(promptKey, '1');

        let reloaded = false;

        // When the new SW takes control (controllerchange), reload once.
        const onControllerChange = () => {
          if (reloaded) return;
          reloaded = true;
          try { localStorage.removeItem(promptKey); } catch (e) {}
          window.location.reload();
        };

        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        // Tell the waiting service worker to skip waiting and become active
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });

        // Fallback: if controllerchange doesn't fire within 5s, reload once.
        setTimeout(() => {
          if (!reloaded) {
            reloaded = true;
            try { localStorage.removeItem(promptKey); } catch (e) {}
            window.location.reload();
          }
        }, 5000);
      }
    } catch (e) {
      // Don't block the user on unexpected errors — at worst they will see
      // the original prompt behavior (reload immediately).
      console.error('Error handling SW update prompt', e);
      if (registration.waiting) {
        try { registration.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (err) {}
        window.location.reload();
      }
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
