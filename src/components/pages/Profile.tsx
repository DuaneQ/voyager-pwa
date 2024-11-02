import { useNavigate } from "react-router-dom";
import { ProfileForm } from "../forms/ProfileForm";

export const Profile = () => {
  const navigate = useNavigate();

  return (
    <div>
      <ProfileForm />
    </div>
  );
};
