import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import type { RegisterData } from "../api/auth";
import { errorMessage } from "../api/client";
import type { Role } from "../api/types";
import { useAuth } from "../auth";
import { ErrorBox, SelectField, TextField } from "../components/Field";
import { useI18n } from "../i18n";
import { AuthLayout } from "./AuthLayout";

export function RegisterPage() {
  const { t, lang } = useI18n();
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "", role: "citizen" as Role });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const update = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm({ ...form, [field]: event.target.value });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data: RegisterData = { ...form, preferred_language: lang };
      await register(data);
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err, t.errorGeneric));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title={t.register}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label={t.firstName} required autoComplete="given-name" value={form.first_name} onChange={update("first_name")} />
          <TextField label={t.lastName} required autoComplete="family-name" value={form.last_name} onChange={update("last_name")} />
        </div>
        <TextField label={t.email} type="email" required autoComplete="email" dir="ltr" value={form.email} onChange={update("email")} />
        <TextField label={t.password} type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={update("password")} />
        <SelectField label={t.role} value={form.role} onChange={update("role")}>
          {(Object.keys(t.roles) as Role[]).map((role) => (
            <option key={role} value={role}>
              {t.roles[role]}
            </option>
          ))}
        </SelectField>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          {t.register}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        {t.haveAccount}{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          {t.login}
        </Link>
      </p>
    </AuthLayout>
  );
}
