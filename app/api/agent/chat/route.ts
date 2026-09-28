import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";
import { askAgent, askAgentStream, type AgentMessage } from "@/lib/agent";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Ask the broker agent a question." }, { status: 400 });
    if (text.length > 4000) return NextResponse.json({ error: "Keep the request under 4,000 characters." }, { status: 400 });
    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const history: AgentMessage[] = [];
    for (const item of rawHistory.slice(-8)) {
      if (item && typeof item === "object" && "role" in item && "text" in item) {
        const role = (item as { role?: unknown }).role;
        const text = (item as { text?: unknown }).text;
        if ((role === "user" || role === "agent") && typeof text === "string") {
          history.push({ role, text: text.slice(0, 2000) });
        }
      }
    }
    if (body.stream === true) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (payload: Record<string, unknown>) => {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            } catch {
              // Client disconnected mid-answer; nothing left to write to.
            }
          };
          try {
            const result = await askAgentStream(text, history, {
              onReasoning: (chunk) => send({ type: "reasoning", text: chunk }),
              onDelta: (chunk) => send({ type: "delta", text: chunk }),
              onReset: () => send({ type: "reset" }),
            });
            send({ type: "done", reply: result.reply });
          } catch (error) {
            send({ type: "error", message: error instanceof Error ? error.message : "Chariot agent unavailable" });
          } finally {
            try {
              controller.close();
            } catch {
              // Already closed by the client going away.
            }
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-store, no-transform",
          Connection: "keep-alive",
          // Stops the reverse proxy from buffering the whole answer before
          // forwarding it, which would defeat streaming entirely.
          "X-Accel-Buffering": "no",
        },
      });
    }

    return NextResponse.json(await askAgent(text, history));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Chariot agent unavailable" }, { status: 502 });
  }
}
