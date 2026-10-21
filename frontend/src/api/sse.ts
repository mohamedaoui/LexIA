export interface SseEvent {
  event: string;
  data: unknown;
}

/**
 * Découpe un flux Server-Sent Events en événements. Les morceaux reçus du réseau peuvent
 * couper un événement en deux : on garde le reste incomplet dans `buffer`.
 */
export function createSseParser(onEvent: (event: SseEvent) => void) {
  let buffer = "";
  return (chunk: string) => {
    buffer += chunk.replace(/\r\n/g, "\n");
    let end: number;
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
      }
      if (data.length) onEvent({ event, data: JSON.parse(data.join("\n")) });
    }
  };
}
