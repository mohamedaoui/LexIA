import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { MessageBubble, type DisplayMessage } from "./MessageBubble";

// Une réponse du LLM ou une question d'utilisateur peut contenir du HTML ou des liens piégés
// (injection de prompt, copier-coller malveillant) : rien ne doit devenir exécutable.
const ATTACKS = [
  '<script>alert("xss")</script>',
  '<img src="x" onerror="alert(1)">',
  '[clique ici](javascript:alert(document.cookie))',
  '<a href="javascript:alert(1)">lien</a>',
  '![image](javascript:alert(1))',
  '<iframe src="https://pirate.example"></iframe>',
];

function render(role: "user" | "assistant", content: string) {
  const message: DisplayMessage = {
    id: "1",
    role,
    content,
    sources: [],
    category: null,
    feedback: null,
    created_at: "2026-10-22T10:00:00Z",
    local: true,
  };
  return renderToStaticMarkup(
    <I18nProvider>
      <MessageBubble message={message} />
    </I18nProvider>,
  );
}

describe("MessageBubble — protection XSS", () => {
  for (const role of ["assistant", "user"] as const) {
    for (const attack of ATTACKS) {
      it(`${role} : ${attack}`, () => {
        const html = render(role, attack);
        expect(html).not.toMatch(/<script/i);
        expect(html).not.toMatch(/<iframe/i);
        expect(html).not.toMatch(/<img[^>]+onerror/i);
        expect(html).not.toMatch(/(href|src)="javascript:/i);
      });
    }
  }

  it("garde le Markdown utile des réponses", () => {
    const html = render("assistant", "**Loi applicable**\n\n- [مدونة الشغل — Article 6]\n\n[Source](https://cspj.ma)");
    expect(html).toContain("<strong>Loi applicable</strong>");
    expect(html).toContain('href="https://cspj.ma"');
  });
});
