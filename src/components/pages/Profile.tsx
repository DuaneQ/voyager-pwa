import { ProfileForm } from "../forms/ProfileForm";
import Stack from "@mui/material/Stack";
import { PhotoGrid } from "../forms/PhotoGrid";
import Box from "@mui/material/Box";
import { Chips } from "../Chips/Chips";

export const Profile = () => {
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
          <Chips />
        </Box>
      </Stack>
    </>
  );
};
