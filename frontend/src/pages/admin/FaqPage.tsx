import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  deleteFaq,
  listCategories,
  listFaqs,
  saveFaq,
  type CategoryWithStats,
  type Faq,
  type FaqInput,
} from "../../api/admin";
import { errorMessage } from "../../api/client";
import { Modal } from "../../components/admin/Modal";
import { Notice, type NoticeState } from "../../components/admin/Notice";
import { Pagination } from "../../components/admin/Pagination";
import { ErrorBox, SelectField, TextField } from "../../components/Field";
import { useI18n } from "../../i18n";

const control =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const small = "rounded-md border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-50";

function FaqForm({
  initial,
  categories,
  onSaved,
  onClose,
}: {
  initial: Faq | null;
  categories: CategoryWithStats[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const f = t.admin.faq;
  const [form, setForm] = useState<FaqInput>(
    initial
      ? { category: initial.category, question: initial.question, answer: initial.answer, language: initial.language, is_published: initial.is_published }
      : { category: categories[0]?.id ?? 0, question: "", answer: "", language: lang, is_published: true },
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveFaq(form, initial?.id);
      onSaved();
    } catch (err) {
      setError(errorMessage(err, t.errorGeneric));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={initial ? f.editTitle : f.new} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label={f.category} value={form.category} onChange={(e) => setForm({ ...form, category: Number(e.target.value) })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {lang === "ar" && c.name_ar ? c.name_ar : c.name_fr}
              </option>
            ))}
          </SelectField>
          <SelectField
            label={f.language}
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value as Faq["language"] })}
          >
            <option value="fr">{f.languages.fr}</option>
            <option value="ar">{f.languages.ar}</option>
          </SelectField>
        </div>
        <TextField
          label={f.question}
          required
          maxLength={500}
          dir={form.language === "ar" ? "rtl" : "ltr"}
          value={form.question}
          onChange={(e) => setForm({ ...form, question: e.target.value })}
        />
        <label className="block text-sm font-medium text-slate-700">
          {f.answer}
          <textarea
            required
            rows={5}
            dir={form.language === "ar" ? "rtl" : "ltr"}
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            className={`${control} mt-1 block w-full`}
          />
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-brand-600"
          />
          <span>
            <span className="font-medium">{f.published}</span>
            <span className="block text-xs text-slate-500">{f.publishedHint}</span>
          </span>
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            {t.admin.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {t.admin.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function FaqPage() {
  const { t, lang } = useI18n();
  const f = t.admin.faq;
  const [filters, setFilters] = useState({ category: "", language: "", page: 1 });
  const [data, setData] = useState<{ count: number; results: Faq[] } | null>(null);
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [editing, setEditing] = useState<Faq | "new" | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const clearNotice = useCallback(() => setNotice(null), []);

  const load = useCallback(() => {
    listFaqs(filters)
      .then(setData)
      .catch((err) => setNotice({ kind: "error", text: errorMessage(err, t.errorGeneric) }));
  }, [filters, t.errorGeneric]);

  useEffect(load, [load]);
  useEffect(() => {
    listCategories()
      .then((list) => setCategories([...list].sort((a, b) => a.name_fr.localeCompare(b.name_fr))))
      .catch(() => {});
  }, []);

  const categoryName = (faq: Faq) => (lang === "ar" && faq.category_name_ar ? faq.category_name_ar : faq.category_name_fr);

  const togglePublished = async (faq: Faq) => {
    try {
      await saveFaq({ ...faq, is_published: !faq.is_published }, faq.id);
      setNotice({ kind: "success", text: t.admin.saved });
      load();
    } catch (err) {
      setNotice({ kind: "error", text: errorMessage(err, t.errorGeneric) });
    }
  };

  const remove = async (faq: Faq) => {
    if (!window.confirm(f.confirmDelete)) return;
    try {
      await deleteFaq(faq.id);
      setNotice({ kind: "success", text: t.admin.deleted });
      load();
    } catch (err) {
      setNotice({ kind: "error", text: errorMessage(err, t.errorGeneric) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{f.title}</h2>
        <button
          type="button"
          disabled={categories.length === 0}
          title={categories.length === 0 ? f.noCategory : undefined}
          onClick={() => setEditing("new")}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          + {f.new}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          aria-label={f.category}
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
          className={control}
        >
          <option value="">{f.category} : {t.admin.all}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {lang === "ar" && c.name_ar ? c.name_ar : c.name_fr}
            </option>
          ))}
        </select>
        <select
          aria-label={f.language}
          value={filters.language}
          onChange={(e) => setFilters({ ...filters, language: e.target.value, page: 1 })}
          className={control}
        >
          <option value="">{f.language} : {t.admin.all}</option>
          <option value="fr">{f.languages.fr}</option>
          <option value="ar">{f.languages.ar}</option>
        </select>
      </div>

      <Notice notice={notice} onDone={clearNotice} />

      {data && data.results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">{f.empty}</p>
      ) : (
        <ul className="space-y-3">
          {data?.results.map((faq) => (
            <li key={faq.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{categoryName(faq)}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{f.languages[faq.language]}</span>
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    faq.is_published ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {faq.is_published ? f.published : f.draft}
                </span>
                <div className="ms-auto flex gap-1.5">
                  <button type="button" className={small} onClick={() => togglePublished(faq)}>
                    {faq.is_published ? f.draft : f.published}
                  </button>
                  <button type="button" className={small} onClick={() => setEditing(faq)}>
                    {t.admin.edit}
                  </button>
                  <button type="button" className={`${small} border-red-200 text-red-700 hover:bg-red-50`} onClick={() => remove(faq)}>
                    {t.admin.delete}
                  </button>
                </div>
              </div>
              <p dir="auto" className="font-medium text-slate-900">
                {faq.question}
              </p>
              <p dir="auto" className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                {faq.answer}
              </p>
            </li>
          ))}
        </ul>
      )}

      {data && <Pagination page={filters.page} count={data.count} onChange={(page) => setFilters({ ...filters, page })} />}

      {editing && (
        <FaqForm
          initial={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setNotice({ kind: "success", text: t.admin.saved });
            load();
          }}
        />
      )}
    </div>
  );
}
