import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import {
  EMAIL_INVALID,
  EMAIL_PLACEHOLDER,
  EMAIL_REQUIRED,
  PASSWORD_PLACEHOLDER,
  PASSWORD_REQUIRED,
} from "../shared-strings/constants";
import { Box, Button, Input } from "@mui/material";
import { useNavigate } from "react-router-dom";

export const LoginForm = () => {
  type FormValues = {
    email: string;
    password: string;
  };

  const navigate = useNavigate();

  const onSubmit = (data: FormValues) => {
    console.log("Submitted", data);

    navigate("/Profile");
  };

  const form = useForm<FormValues>();
  const { register, handleSubmit, formState } = form;
  const { errors } = formState;

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
              pattern: {
                value:
                  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
                message: EMAIL_INVALID,
              },
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
        <Box>
          <Input
            data-testid="password"
            type="password"
            id="password"
            required
            sx={{ width: "100%", maxWidth: 300, mx: "auto" }}
            placeholder={PASSWORD_PLACEHOLDER}
            {...register("password", {
              required: {
                value: true,
                message: PASSWORD_REQUIRED,
              },
            })}
          />
          <p className="error" data-testid="passErr">
            {errors.password?.message}
          </p>
        </Box>
        <div>
          <p style={{ color: "white" }}>
            Don't have an account? <Link to="/Register">Register here</Link>
          </p>
        </div>
        <div className="w-100 text-center mt-2">
          <p style={{ color: "white" }}>
            Forgot your password? click here to <Link to="/reset">Reset</Link>
          </p>
        </div>
        <Button type="submit" data-testid="login-button" variant="contained">
          Submit
        </Button>
      </form>
    </div>
  );
};
