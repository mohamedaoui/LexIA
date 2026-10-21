import { describe, expect, it } from "vitest";
import { createSseParser, type SseEvent } from "./sse";

function parseAll(chunks: string[]): SseEvent[] {
  const events: SseEvent[] = [];
  const feed = createSseParser((e) => events.push(e));
  chunks.forEach(feed);
  return events;
}

describe("createSseParser", () => {
  it("lit plusieurs événements d'un seul morceau", () => {
    const events = parseAll(['event: token\ndata: "Bonjour"\n\nevent: token\ndata: " monde"\n\n']);
    expect(events).toEqual([
      { event: "token", data: "Bonjour" },
      { event: "token", data: " monde" },
    ]);
  });

  it("recolle un événement coupé entre deux morceaux", () => {
    const events = parseAll(['event: sources\ndata: [{"num', 'ber": "14"}]\n', "\n"]);
    expect(events).toEqual([{ event: "sources", data: [{ number: "14" }] }]);
  });

  it("gère l'arabe et les fins de ligne Windows", () => {
    const events = parseAll(['event: token\r\ndata: "المادة 14"\r\n\r\n']);
    expect(events).toEqual([{ event: "token", data: "المادة 14" }]);
  });

  it("attend la fin de l'événement avant de le livrer", () => {
    expect(parseAll(['event: token\ndata: "incomplet"\n'])).toEqual([]);
  });
});
