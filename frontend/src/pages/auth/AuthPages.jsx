import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../../store/authContext.js";
import { demoLoginOptions, roleHome } from "../../constants/auth.js";
import { authApi } from "../../services/api/auth.js";
import { Button } from "../../components/ui/button.jsx";
import { Card, CardContent } from "../../components/ui/card.jsx";
import { Input } from "../../components/ui/input.jsx";

const loginSchema = z.object({
  email: z.string().email("Use a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
    email: z.string().email("Use a valid email"),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Add a lowercase letter")
      .regex(/[A-Z]/, "Add an uppercase letter")
      .regex(/\d/, "Add a number"),
  })
  .extend({
    address: z.string().optional(),
    businessName: z.string().optional(),
    confirmPassword: z.string().min(8, "Confirm your password"),
    name: z.string().min(2, "Name is required"),
    phone: z.string().optional(),
    role: z.enum(["user", "owner"]),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
    if (values.role === "owner") {
      [
        ["businessName", "Business name is required"],
        ["phone", "Phone is required"],
        ["address", "Address is required"],
      ].forEach(([field, message]) => {
        if (!values[field]?.trim()) {
          context.addIssue({ code: z.ZodIssueCode.custom, message, path: [field] });
        }
      });
    }
  });

const forgotSchema = z.object({
  email: z.string().email("Use a valid email"),
});

function Field({ label, error, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <Input className="mt-2" {...props} />
      {error && <span className="mt-1 block text-xs font-bold text-danger">{error.message}</span>}
    </label>
  );
}

function AuthCard({ title, subtitle, mode }) {
  const schema = mode === "register" ? registerSchema : mode === "forgot" ? forgotSchema : loginSchema;
  const { login, register: registerAccount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [selectedDemoRole, setSelectedDemoRole] = useState("");
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues:
      mode === "register"
        ? {
            address: "",
            businessName: "",
            confirmPassword: "",
            email: "",
            name: "",
            password: "",
            phone: "",
            role: "user",
          }
        : { email: "", password: "" },
  });
  const selectedRole = watch("role");
  const selectedDemo = demoLoginOptions.find((option) => option.role === selectedDemoRole);

  function destinationFor(user) {
    const requestedRoute = location.state?.from;
    if (typeof requestedRoute === "string") {
      return requestedRoute;
    }
    if (requestedRoute?.pathname) {
      return `${requestedRoute.pathname}${requestedRoute.search || ""}${requestedRoute.hash || ""}`;
    }
    return roleHome[user.role] || "/dashboard";
  }

  function selectDemoAccount(option) {
    setSelectedDemoRole(option.role);
    setMessage("");
    reset({ email: option.email, password: option.password });
  }

  async function onSubmit(values) {
    if (mode === "forgot") {
      try {
        const response = await authApi.forgotPassword(values);
        const isSimulated = response.data?.data?.simulated;
        setMessageTone("success");
        setMessage(
          isSimulated
            ? "Password reset emails are simulated in this demo environment."
            : response.data?.message || "Reset link queued for secure delivery.",
        );
      } catch (error) {
        setMessageTone("error");
        setMessage(error.response?.data?.message || error.message);
      }
      return;
    }

    try {
      const session =
        mode === "register"
          ? await registerAccount(values)
          : await login({ email: values.email, password: values.password });

      if (!session.token) {
        setMessageTone("success");
        setMessage(session.message);
        reset();
        return;
      }

      navigate(destinationFor(session.user), { replace: true });
    } catch (error) {
      setMessageTone("error");
      setMessage(typeof error === "string" ? error : error.message);
    }
  }

  return (
    <Card className="mt-8">
      <CardContent className="p-7">
        <p className="muted-label text-primary">TURFX account</p>
        <h1 className="mt-3 text-3xl font-black tracking-normal">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
        {mode === "login" && (
          <div className="mt-6">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {demoLoginOptions.map((option) => {
                const isSelected = option.role === selectedDemoRole;

                return (
                  <Button
                    aria-label={option.ariaLabel}
                    aria-pressed={isSelected}
                    className="min-w-0 w-full px-2"
                    key={option.role}
                    onClick={() => selectDemoAccount(option)}
                    size="sm"
                    type="button"
                    variant={isSelected ? "primary" : "outline"}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
            <div className="mt-3 space-y-1 text-xs leading-5 text-ink-muted sm:text-center">
              {selectedDemo ? (
                <p aria-live="polite">{selectedDemo.helperText}</p>
              ) : (
                <>
                  <p><span className="font-bold text-ink">Platform Admin</span> = Website Administrator</p>
                  <p><span className="font-bold text-ink">Turf Owner</span> = Venue Manager</p>
                  <p><span className="font-bold text-ink">User</span> = Customer / Player</p>
                </>
              )}
            </div>
          </div>
        )}
        <form className="mt-7 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          {mode === "register" && (
            <Field
              error={errors.name}
              label={selectedRole === "owner" ? "Owner name" : "Full name"}
              placeholder="Alex Thompson"
              {...register("name")}
            />
          )}
          <Field error={errors.email} label="Email" placeholder="alex@turfx.app" type="email" {...register("email")} />
          {mode !== "forgot" && (
            <Field error={errors.password} label="Password" placeholder="********" type="password" {...register("password")} />
          )}
          {mode === "register" && (
            <>
              <Field
                error={errors.confirmPassword}
                label="Confirm password"
                placeholder="********"
                type="password"
                {...register("confirmPassword")}
              />
              <label className="block">
                <span className="text-sm font-bold text-ink">Account type</span>
                <select className="focus-ring mt-2 h-11 w-full rounded-lg border border-surface-outline bg-white px-3 text-sm" {...register("role")}>
                  <option value="user">User (Customer / Player)</option>
                  <option value="owner">Turf Owner (Venue Owner)</option>
                </select>
              </label>
              {selectedRole === "owner" && (
                <>
                  <Field error={errors.businessName} label="Business name" {...register("businessName")} />
                  <Field error={errors.phone} label="Phone" type="tel" {...register("phone")} />
                  <Field error={errors.address} label="Business address" {...register("address")} />
                </>
              )}
            </>
          )}
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Please wait..." : mode === "register" ? "Create Account" : mode === "forgot" ? "Send Reset Link" : "Sign In"}
          </Button>
        </form>
        {message && (
          <p
            className={`mt-4 rounded-lg px-3 py-2 text-sm font-bold ${
              messageTone === "error" ? "bg-red-50 text-danger" : "bg-accent-soft text-accent-deep"
            }`}
          >
            {message}
          </p>
        )}
        <div className="mt-5 text-center text-sm text-ink-muted">
          {mode === "login" && (
            <>
              <Link className="font-bold text-primary" to="/forgot-password">
                Forgot password?
              </Link>
              <span className="mx-2">/</span>
              <Link className="font-bold text-primary" to="/register">
                Register
              </Link>
            </>
          )}
          {mode === "register" && (
            <Link className="font-bold text-primary" to="/login">
              Already have an account? Sign in
            </Link>
          )}
          {mode === "forgot" && (
            <Link className="font-bold text-primary" to="/login">
              Back to sign in
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function LoginPage() {
  return <AuthCard mode="login" subtitle="Choose your TURFX workspace or sign in with your account credentials." title="Welcome back" />;
}

export function RegisterPage() {
  return <AuthCard mode="register" subtitle="Create a player account or register as a TURFX venue partner." title="Join TURFX" />;
}

export function ForgotPasswordPage() {
  return <AuthCard mode="forgot" subtitle="We will send a secure recovery link to your registered email." title="Reset password" />;
}
