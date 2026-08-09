import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

/**
 * The upstream model occasionally returns a 200 stream that carries no content
 * at all (`finish_reason: "no_content"`, zero tokens). The AI SDK treats that as
 * a legitimate empty step, so the agent loop stops mid-run and the user sees a
 * conversation that halts after a tool call. Peek at the stream: if the whole
 * response turns out to be empty, transparently re-issue the request.
 */
const EMPTY_COMPLETION_RETRIES = 1;

function isMeaningfulEvent(payload: string): boolean {
  if (!payload || payload === "[DONE]") return false;
  try {
    const parsed = JSON.parse(payload) as {
      choices?: {
        delta?: { content?: string | null; tool_calls?: unknown; reasoning_details?: unknown };
      }[];
    };
    for (const choice of parsed.choices ?? []) {
      const delta = choice.delta;
      if (!delta) continue;
      if (typeof delta.content === "string" && delta.content.length > 0) return true;
      if (delta.tool_calls) return true;
      if (delta.reasoning_details) return true;
    }
  } catch {
    // Ignore malformed events.
  }
  return false;
}

/**
 * Reads from the stream until it sees real content. Returns the buffered chunks
 * plus the reader when the response is usable, or `null` when it was empty.
 * SSE events can be split across network chunks, so frame them on blank lines
 * before parsing.
 */
async function peekForContent(response: Response): Promise<
  | { buffered: Uint8Array[]; reader: ReadableStreamDefaultReader<Uint8Array> }
  | null
> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const buffered: Uint8Array[] = [];
  let pending = "";

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) return null;
    buffered.push(chunk.value);

    pending += decoder.decode(chunk.value, { stream: true });
    const events = pending.split("\n\n");
    pending = events.pop() ?? "";

    for (const event of events) {
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        if (isMeaningfulEvent(line.slice(5).trim())) {
          return { buffered, reader };
        }
      }
    }
  }
}


function replayStream(
  buffered: Uint8Array[],
  reader: ReadableStreamDefaultReader<Uint8Array>,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const chunk of buffered) controller.enqueue(chunk);
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          controller.enqueue(chunk.value);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason?: unknown) {
      return reader.cancel(reason);
    },
  });
}


export function createLovableAiGatewayRunIdFetch(
  initialRunId?: string,
  extraBody?: Record<string, unknown>,
) {
  let runId = initialRunId?.trim() || undefined;
  let resolveRunId: (value: string | undefined) => void = () => {};
  let runIdResolved = false;
  const runIdReady = new Promise<string | undefined>((resolve) => {
    resolveRunId = resolve;
  });

  const publishRunId = (value?: string) => {
    const nextRunId = value?.trim() || undefined;
    if (!runId && nextRunId) {
      runId = nextRunId;
    }
    if (!runIdResolved) {
      runIdResolved = true;
      resolveRunId(runId);
    }
  };
  if (runId) publishRunId(runId);

  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }

      let body = init?.body;
      if (extraBody && typeof body === "string") {
        try {
          body = JSON.stringify({ ...(JSON.parse(body) as object), ...extraBody });
        } catch {
          // Leave the body untouched if it isn't JSON.
        }
      }

      const isRetryable = typeof body === "string";

      for (let attempt = 0; ; attempt++) {
        try {
          const response = await fetch(input, { ...init, body: body ?? null, headers });
          publishRunId(response.headers.get(LOVABLE_AIG_RUN_ID_HEADER) ?? undefined);

          if (!isRetryable || !response.ok || !response.body) return response;


          const peeked = await peekForContent(response);
          if (peeked) {
            return new Response(replayStream(peeked.buffered, peeked.reader), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          }

          if (attempt >= EMPTY_COMPLETION_RETRIES) {
            console.warn("[ai-gateway] empty completion after retries; returning empty stream");
            return new Response("data: [DONE]\n\n", {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          }
          console.warn("[ai-gateway] empty completion from model, retrying");
        } catch (error) {
          publishRunId(undefined);
          throw error;
        }
      }
    },
    getRunId: () => runId,

    waitForRunId: () => (runId ? Promise.resolve(runId) : runIdReady),
  };
}

export function createLovableAiGatewayProvider(
  lovableApiKey: string,
  initialRunId?: string,
  extraBody?: Record<string, unknown>,
) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId, extraBody);

  const provider = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch as typeof fetch,
  });

  return Object.assign(provider, {
    getRunId: runIdFetch.getRunId,
    waitForRunId: runIdFetch.waitForRunId,
  });
}

export function getLovableAiGatewayRunId(request: Request) {
  return request.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined;
}

export function getLovableAiGatewayResponseHeaders(
  providerHeaders: HeadersInit | undefined,
  init?: HeadersInit,
) {
  const headers = new Headers(init);
  const exposedHeaders = new Set(
    (headers.get("Access-Control-Expose-Headers") ?? "")
      .split(",")
      .map((header) => header.trim())
      .filter(Boolean),
  );

  new Headers(providerHeaders).forEach((value, name) => {
    if (name.toLowerCase().startsWith("x-lovable-aig-")) {
      headers.set(name, value);
      exposedHeaders.add(name);
    }
  });

  headers.forEach((_, name) => {
    if (name.toLowerCase().startsWith("x-lovable-aig-")) {
      exposedHeaders.add(name);
    }
  });

  if (exposedHeaders.size > 0) {
    headers.set("Access-Control-Expose-Headers", Array.from(exposedHeaders).join(", "));
  }

  return headers;
}

export async function withLovableAiGatewayRunIdHeader(
  response: Response,
  gateway: {
    getRunId: () => string | undefined;
    waitForRunId: () => Promise<string | undefined>;
  },
  init?: HeadersInit,
) {
  if (!response.body) {
    const runId = gateway.getRunId();
    const headers = getLovableAiGatewayResponseHeaders(undefined, response.headers);
    new Headers(init).forEach((value, name) => headers.set(name, value));
    if (runId) headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: getLovableAiGatewayResponseHeaders(undefined, headers),
    });
  }

  const reader = response.body.getReader();
  const firstChunk = reader.read();
  const runId = await gateway.waitForRunId();
  const headers = getLovableAiGatewayResponseHeaders(undefined, response.headers);
  new Headers(init).forEach((value, name) => headers.set(name, value));
  if (runId) headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);

  const body = new ReadableStream({
    async start(controller) {
      try {
        const first = await firstChunk;
        if (first.done) {
          controller.close();
          return;
        }
        controller.enqueue(first.value);
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          controller.enqueue(chunk.value);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason?: unknown) {
      return reader.cancel(reason);
    },
  });

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: getLovableAiGatewayResponseHeaders(undefined, headers),
  });
}
