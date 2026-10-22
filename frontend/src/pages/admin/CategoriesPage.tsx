import { useCallback, useEffect, useState, type FormEvent } from "react";
import { deleteCategory, listCategories, saveCategory, type CategoryInput, type CategoryWithStats } from "../../api/admin";
import { errorMessage } from "../../api/client";
import { Modal } from "../../components/admin/Modal";
import { Notice, type NoticeState } from "../../components/admin/Notice";
import { ErrorBox, TextField } from "../../components/Field";
import { useI18n } from "../../i18n";

const EMPTY: CategoryInput = { slug: "", name_fr: "", name_ar: "", description: "" };
const small = "rounded-md border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-50";

function CategoryForm({
  initial,
  onSaved,
  onClose,
}: {
  initial: CategoryWithStats | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const c = t.admin.categories;
  const [form, setForm] = useState<CategoryInput>(initial ? { ...initial } : EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveCategory(form, initial?.id);
      onSaved();
    } catch (err) {
      setError(errorMessage(err, t.errorGeneric));
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof CategoryInput) => (e: { target: { value: string } }) => setForm({ ...form, [field]: e.target.value });

  return (
    <Modal title={initial ? c.editTitle : c.new} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <div>
          <TextField label={c.slug} required pattern="[a-z0-9-]+" dir="ltr" value={form.slug} onChange={set("slug")} />
          <p className="mt-1 text-xs text-slate-500">{c.slugHint}</p>
        </div>
        <TextField label={c.nameFr} required value={form.name_fr} onChange={set("name_fr")} />
        <TextField label={c.nameAr} dir="rtl" value={form.name_ar} onChange={set("name_ar")} />
        <label className="block text-sm font-medium text-slate-700">
          {c.description}
          <textarea
            rows={3}
            dir="auto"
            value={form.description}
            onChange={set("description")}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
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

export function CategoriesPage() {
  const { t, lang } = useI18n();
  const c = t.admin.categories;
  const [categories, setCategories] = useState<CategoryWithStats[] | null>(null);
  const [editing, setEditing] = useState<CategoryWithStats | "new" | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const clearNotice = useCallback(() => setNotice(null), []);

  const load = useCallback(() => {
    listCategories()
      .then((list) => setCategories([...list].sort((a, b) => b.question_count - a.question_count || a.name_fr.localeCompare(b.name_fr))))
      .catch((err) => setNotice({ kind: "error", text: errorMessage(err, t.errorGeneric) }));
  }, [t.errorGeneric]);

  useEffect(load, [load]);

  const remove = async (category: CategoryWithStats) => {
    const name = lang === "ar" && category.name_ar ? category.name_ar : category.name_fr;
    if (!window.confirm(c.confirmDelete(name, category.faq_count))) return;
    try {
      await deleteCategory(category.id);
      setNotice({ kind: "success", text: t.admin.deleted });
      load();
    } catch (err) {
      setNotice({ kind: "error", text: errorMessage(err, t.errorGeneric) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{c.title}</h2>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + {c.new}
        </button>
      </div>

      <Notice notice={notice} onDone={clearNotice} />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-start font-medium">{t.dashboard.domain}</th>
              <th className="px-4 py-2.5 text-end font-medium">{c.laws}</th>
              <th className="px-4 py-2.5 text-end font-medium">{c.faqs}</th>
              <th className="px-4 py-2.5 text-end font-medium">{c.questions}</th>
              <th className="px-4 py-2.5 text-end font-medium">{t.admin.actions}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {categories?.map((category) => (
              <tr key={category.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{lang === "ar" && category.name_ar ? category.name_ar : category.name_fr}</div>
                  <div className="text-xs text-slate-500">
                    <span dir="ltr">{category.slug}</span>
                    {lang === "fr" && category.name_ar && <span> · {category.name_ar}</span>}
                    {lang === "ar" && <span> · {category.name_fr}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-end text-slate-700">{category.law_count}</td>
                <td className="px-4 py-3 text-end text-slate-700">{category.faq_count}</td>
                <td className="px-4 py-3 text-end text-slate-700">{category.question_count}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button type="button" className={small} onClick={() => setEditing(category)}>
                      {t.admin.edit}
                    </button>
                    <button type="button" className={`${small} border-red-200 text-red-700 hover:bg-red-50`} onClick={() => remove(category)}>
                      {t.admin.delete}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <CategoryForm
          initial={editing === "new" ? null : editing}
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
