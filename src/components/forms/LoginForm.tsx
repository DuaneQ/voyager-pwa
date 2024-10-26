import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import {
  EMAIL_INVALID,
  EMAIL_PLACEHOLDER,
  EMAIL_REQUIRED,
  PASSWORD_PLACEHOLDER,
  PASSWORD_REQUIRED,
  PASSWORD_VALIDATION,
} from "../shared-strings/constants";
import { Button, TextField } from "@mui/material";
import { useNavigate } from "react-router-dom";
import styles from './LoginForm.module.css';

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
    <div className={styles.loginFormContainer}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div>
          <TextField
            required
            data-testid="email"
            type="text"
            id="email"
            label="Email"
            style={{ width: 400 }}
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
            sx={{
              backgroundColor: 'white',
            }}
          />
          <p className="error" data-testid="emailErr">
            {errors.email?.message}
          </p>
        </div>
        <div>
          <TextField
            data-testid="password"
            type="password"
            id="password"
            required
            label="Password"
            style={{ width: 400 }}
            placeholder={PASSWORD_PLACEHOLDER}
            {...register("password", {
              required: {
                value: true,
                message: PASSWORD_REQUIRED,
              },
              minLength: {
                value: 10,
                message: PASSWORD_VALIDATION,
              },
            })}
            sx={{
              backgroundColor: 'white',
            }}
          />
          <p className="error" data-testid="passErr">{errors.password?.message}</p>
        </div>
        <div>
          <p style={{ color: 'white' }}>
            Don't have an account? <Link to="/Register">Register here</Link>
          </p>
        </div>
        <div className="w-100 text-center mt-2">
          <p style={{ color: 'white' }}>
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
