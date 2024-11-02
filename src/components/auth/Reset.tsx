import { Box, Button, Input } from "@mui/material";
import { EMAIL_PLACEHOLDER, EMAIL_REQUIRED } from "../shared-strings/constants";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

export const Reset = () => {
  type FormValues = {
    email: string;
  };
  const navigate = useNavigate();
  const form = useForm<FormValues>();
  const { register, handleSubmit, formState } = form;
  const { errors } = formState;

  const onSubmit = (data: FormValues) => {
    console.log("Submitted", data);

    navigate("/Profile");
  };

  return (
    <div className="authFormContainer">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        data-testid="login-form"
      >
        <Box>
          <Input
            required
            data-testid="email"
            type="text"
            id="email"
            sx={{ width: "100%", maxWidth: 300, mx: "auto" }}
            placeholder={EMAIL_PLACEHOLDER}
            {...register("email", {
              required: {
                value: true,
                message: EMAIL_REQUIRED,
              },
            })}
          />
          <p className="error" data-testid="emailErr">
            {errors.email?.message}
          </p>
        </Box>
        <div>
          <p style={{ color: "white" }}>
            Already have an account? <Link to="/">Sign in</Link>
          </p>
        </div>
        <Button type="submit" data-testid="login-button" variant="contained">
          Submit
        </Button>
      </form>
    </div>
  );
};
