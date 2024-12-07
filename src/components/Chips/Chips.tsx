import Chip from "@mui/material/Chip";

export const Chips = () => {
  return (
    <div>
      <Chip label="Basic Chip" sx={{ backgroundColor: "white" }} />
      <Chip
        label="Clickable Chip"
        onClick={() => console.log("Clicked!")}
        sx={{ backgroundColor: "white" }}
      />
      <Chip
        label="Deletable Chip"
        onDelete={() => console.log("Deleted!")}
        sx={{ backgroundColor: "white" }}
      />
    </div>
  );
};
