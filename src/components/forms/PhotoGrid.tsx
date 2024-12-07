import Box from "@mui/material/Box";
import profilePlaceholder from "../../assets/images/imagePH.png";

export const PhotoGrid = () => {
  return (
    <>
      <Box display="flex" flexWrap="wrap" justifyContent="center" mt={2} width="100%">
        <Box m={1}>
          <img
            src={profilePlaceholder}
            alt="Image 1"
            style={{ width: "160px", height: "160px" }}
          />
        </Box>
        <Box m={1}>
          <img
            src={profilePlaceholder}
            alt="Image 2"
            style={{ width: "160px", height: "160px" }}
          />
        </Box>
        <Box m={1}>
          <img
            src={profilePlaceholder}
            alt="Image 3"
            style={{ width: "160px", height: "160px" }}
          />
        </Box>
        <Box m={1}>
          <img
            src={profilePlaceholder}
            alt="Image 4"
            style={{ width: "160px", height: "160px" }}
          />
        </Box>
      </Box>
    </>
  );
};
