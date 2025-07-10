
import React from 'react';
import SignInForm from '../forms/SignInForm';
import { getAnalytics, logEvent } from "firebase/analytics";


export const Login = () => {
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      try {
        const analytics = getAnalytics();
        logEvent(analytics, "login_page_viewed");
      } catch (e) {}
    }
  }, []);
  return (
    <div>
      <SignInForm />
    </div>
  );
};
