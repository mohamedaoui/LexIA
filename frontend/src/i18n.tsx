import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type UiLang = "fr" | "ar";

const fr = {
  appTagline: "Assistant juridique marocain",
  login: "Se connecter",
  logout: "Se déconnecter",
  register: "Créer un compte",
  email: "Email",
  password: "Mot de passe",
  firstName: "Prénom",
  lastName: "Nom",
  role: "Vous êtes",
  roles: { citizen: "Citoyen", student: "Étudiant", lawyer: "Avocat", judge: "Juge" },
  noAccount: "Pas encore de compte ?",
  haveAccount: "Déjà un compte ?",
  loginFailed: "Email ou mot de passe incorrect.",
  newChat: "Nouvelle conversation",
  history: "Historique",
  noConversations: "Aucune conversation pour l'instant.",
  deleteConversation: "Supprimer",
  confirmDelete: "Supprimer cette conversation ?",
  placeholder: "Posez votre question juridique… (FR, عربية, الدارجة)",
  send: "Envoyer",
  stop: "Arrêter",
  welcomeTitle: "Comment puis-je vous aider ?",
  welcomeText:
    "Posez une question sur le droit marocain en français, en arabe ou en darija. LexIA répond à partir des textes de loi officiels et cite ses sources.",
  suggestions: [
    "Quelles sont les conditions pour créer une coopérative ?",
    "Peut-on donner un organe à un membre de sa famille ?",
    "ما هي شروط تأسيس حزب سياسي؟",
    "واش نقدر نبني فوق أرض فلاحية بلا رخصة؟",
  ],
  searching: "Recherche dans les textes de loi…",
  sources: "Sources",
  article: "Article",
  relevance: "pertinence",
  showArticle: "Voir le texte",
  hideArticle: "Masquer",
  helpful: "Réponse utile",
  notHelpful: "Réponse pas utile",
  thanks: "Merci pour votre avis",
  errorGeneric: "Une erreur est survenue. Réessayez.",
  menu: "Menu",
};

const ar: typeof fr = {
  appTagline: "مساعد قانوني مغربي",
  login: "تسجيل الدخول",
  logout: "تسجيل الخروج",
  register: "إنشاء حساب",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  firstName: "الاسم الشخصي",
  lastName: "الاسم العائلي",
  role: "أنت",
  roles: { citizen: "مواطن", student: "طالب", lawyer: "محامٍ", judge: "قاضٍ" },
  noAccount: "ليس لديك حساب؟",
  haveAccount: "لديك حساب؟",
  loginFailed: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  newChat: "محادثة جديدة",
  history: "السجل",
  noConversations: "لا توجد محادثات بعد.",
  deleteConversation: "حذف",
  confirmDelete: "حذف هذه المحادثة؟",
  placeholder: "اكتب سؤالك القانوني… (عربية، الدارجة، Français)",
  send: "إرسال",
  stop: "إيقاف",
  welcomeTitle: "كيف يمكنني مساعدتك؟",
  welcomeText:
    "اطرح سؤالاً حول القانون المغربي بالعربية أو الدارجة أو الفرنسية. يجيب LexIA انطلاقاً من النصوص القانونية الرسمية ويذكر مصادره.",
  suggestions: [
    "ما هو الحد الأدنى لعدد الأعضاء لتأسيس تعاونية؟",
    "واش نقدر نتبرع بكلية لخويا؟",
    "ما هي شروط تأسيس حزب سياسي؟",
    "Quelles sont les conditions pour créer une coopérative ?",
  ],
  searching: "جارٍ البحث في النصوص القانونية…",
  sources: "المصادر",
  article: "المادة",
  relevance: "الملاءمة",
  showArticle: "عرض النص",
  hideArticle: "إخفاء",
  helpful: "إجابة مفيدة",
  notHelpful: "إجابة غير مفيدة",
  thanks: "شكراً على رأيك",
  errorGeneric: "حدث خطأ. حاول مرة أخرى.",
  menu: "القائمة",
};

const dictionaries = { fr, ar };
const STORAGE_KEY = "lexia.lang";

interface I18n {
  lang: UiLang;
  t: typeof fr;
  setLang: (lang: UiLang) => void;
}

const I18nContext = createContext<I18n | null>(null);

function initialLang(): UiLang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "fr" || saved === "ar") return saved;
  } catch {
    // stockage indisponible : langue par défaut
  }
  return navigator.language.startsWith("ar") ? "ar" : "fr";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<UiLang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (next: UiLang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignoré
    }
  };

  return <I18nContext.Provider value={{ lang, t: dictionaries[lang], setLang }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n doit être utilisé dans I18nProvider");
  return context;
}
