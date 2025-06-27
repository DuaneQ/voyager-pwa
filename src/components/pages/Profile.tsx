import { ProfileForm } from "../forms/ProfileForm";
import Stack from "@mui/material/Stack";
import { PhotoGrid } from "../forms/PhotoGrid";
import Box from "@mui/material/Box";
import React, { useContext, useEffect } from "react";
import { UserProfileContext } from "../../Context/UserProfileContext";
import { getMessaging, getToken } from "firebase/messaging";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { app } from "../../environments/firebaseConfig";

export const Profile = React.memo(() => {
  const { userProfile } = useContext(UserProfileContext);
  const messaging = getMessaging(app);

  useEffect(() => {
    if (!userProfile || !userProfile.username) return; // Only run if profile loaded

    if (typeof Notification !== "undefined") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          getToken(messaging, {
            vapidKey: process.env.REACT_APP_VAPID_KEY,
          }).then(async (currentToken) => {
            if (currentToken && userProfile && userProfile.uid) {
              const db = getFirestore();
              const userRef = doc(db, "users", userProfile.uid);
              await setDoc(
                userRef,
                { fcmToken: currentToken },
                { merge: true }
              );
            }
          });
        }
      });
    }
  }, [userProfile]);

  return (
    <>
      <Stack className="authFormContainer">
        <Box mb={10}>
          <ProfileForm />
        </Box>
        <Box mt={-10} mb={10}>
          <PhotoGrid />
        </Box>
        <Box mt={-10} mb={10}>
          {/* <Chips /> */}
        </Box>
      </Stack>
    </>
  );
});
