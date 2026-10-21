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
  category: "Domaine juridique détecté",
  article: "Article",
  relevance: "pertinence",
  showArticle: "Voir le texte",
  hideArticle: "Masquer",
  helpful: "Réponse utile",
  notHelpful: "Réponse pas utile",
  thanks: "Merci pour votre avis",
  errorGeneric: "Une erreur est survenue. Réessayez.",
  menu: "Menu",
  dashboard: {
    link: "Tableau de bord",
    title: "Tableau de bord",
    subtitle: "Utilisation de LexIA et qualité des réponses",
    backToChat: "Retour au chat",
    period: "Période",
    periods: { "7": "7 jours", "30": "30 jours", "90": "90 jours", all: "Tout" },
    exportQuestions: "Exporter les questions (CSV)",
    exportFeedback: "Exporter les avis (CSV)",
    exporting: "Export…",
    questions: "Questions posées",
    inConversations: (n: number) => `dans ${n} conversation${n > 1 ? "s" : ""}`,
    activeUsers: "Utilisateurs actifs",
    registered: (total: number, fresh: number) => `${total} inscrits · ${fresh} nouveaux`,
    satisfaction: "Satisfaction",
    noFeedback: "Aucun avis sur la période",
    unclassified: "Questions non classées",
    unclassifiedHint: (pct: string) => `${pct} des questions, hors domaine juridique`,
    perDay: "Questions par jour",
    perCategory: "Questions par domaine juridique",
    domain: "Domaine",
    questionsShort: "Questions",
    feedbackShort: "Avis",
    languages: "Langue des questions",
    roles: "Profils des utilisateurs inscrits",
    topLaws: "Textes de loi les plus cités",
    law: "Texte de loi",
    citations: "Citations",
    answers: "Réponses",
    negative: "Avis négatifs récents",
    noNegative: "Aucun avis négatif sur la période.",
    question: "Question",
    answer: "Réponse",
    comment: "Commentaire",
    showAnswer: "Voir la réponse",
    hideAnswer: "Masquer la réponse",
    showTable: "Voir le tableau",
    showChart: "Voir le graphique",
    date: "Date",
    empty: "Aucune donnée sur la période.",
    forbidden: "Cette page est réservée aux administrateurs.",
  },
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
  category: "المجال القانوني المرصود",
  article: "المادة",
  relevance: "الملاءمة",
  showArticle: "عرض النص",
  hideArticle: "إخفاء",
  helpful: "إجابة مفيدة",
  notHelpful: "إجابة غير مفيدة",
  thanks: "شكراً على رأيك",
  errorGeneric: "حدث خطأ. حاول مرة أخرى.",
  menu: "القائمة",
  dashboard: {
    link: "لوحة القيادة",
    title: "لوحة القيادة",
    subtitle: "استعمال LexIA وجودة الأجوبة",
    backToChat: "العودة إلى المحادثة",
    period: "الفترة",
    periods: { "7": "7 أيام", "30": "30 يوماً", "90": "90 يوماً", all: "الكل" },
    exportQuestions: "تصدير الأسئلة (CSV)",
    exportFeedback: "تصدير التقييمات (CSV)",
    exporting: "جارٍ التصدير…",
    questions: "الأسئلة المطروحة",
    inConversations: (n: number) => `في ${n} محادثة`,
    activeUsers: "المستخدمون النشطون",
    registered: (total: number, fresh: number) => `${total} مسجل · ${fresh} جدد`,
    satisfaction: "نسبة الرضا",
    noFeedback: "لا توجد تقييمات في هذه الفترة",
    unclassified: "أسئلة غير مصنفة",
    unclassifiedHint: (pct: string) => `${pct} من الأسئلة، خارج المجال القانوني`,
    perDay: "الأسئلة حسب اليوم",
    perCategory: "الأسئلة حسب المجال القانوني",
    domain: "المجال",
    questionsShort: "الأسئلة",
    feedbackShort: "التقييمات",
    languages: "لغة الأسئلة",
    roles: "فئات المستخدمين المسجلين",
    topLaws: "النصوص القانونية الأكثر استشهاداً",
    law: "النص القانوني",
    citations: "الاستشهادات",
    answers: "الأجوبة",
    negative: "آخر التقييمات السلبية",
    noNegative: "لا توجد تقييمات سلبية في هذه الفترة.",
    question: "السؤال",
    answer: "الجواب",
    comment: "التعليق",
    showAnswer: "عرض الجواب",
    hideAnswer: "إخفاء الجواب",
    showTable: "عرض الجدول",
    showChart: "عرض الرسم البياني",
    date: "التاريخ",
    empty: "لا توجد بيانات في هذه الفترة.",
    forbidden: "هذه الصفحة مخصصة للمشرفين.",
  },
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
