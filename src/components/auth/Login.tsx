
import React from 'react';
import SignInForm from '../forms/SignInForm';
import { getAnalytics, logEvent } from "firebase/analytics";


export const Login = () => {
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      const analytics = getAnalytics();
      logEvent(analytics, "login_page_viewed");
    }
  }, []);
  return (
    <div>
      <SignInForm />
    </div>
  );
};
