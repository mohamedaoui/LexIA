import axios from "axios";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { errorMessage } from "../api/client";
import { useAuth } from "../auth";
import { ErrorBox, TextField } from "../components/Field";
import { useI18n } from "../i18n";
import { AuthLayout } from "./AuthLayout";

export function LoginPage() {
  const { t } = useI18n();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(axios.isAxiosError(err) && err.response?.status === 401 ? t.loginFailed : errorMessage(err, t.errorGeneric));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title={t.login}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <TextField label={t.email} type="email" autoComplete="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label={t.password} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          {t.login}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        {t.noAccount}{" "}
        <Link to="/register" className="font-semibold text-brand-600 hover:underline">
          {t.register}
        </Link>
      </p>
    </AuthLayout>
  );
}
