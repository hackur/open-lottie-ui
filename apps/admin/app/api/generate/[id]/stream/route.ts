import { processRegistry } from "@open-lottie/claude-driver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const reg = processRegistry.get(id);
  if (!reg) {
    return new Response("not found", { status: 404 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const ev of reg.events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        }
        controller.enqueue(encoder.encode(`event: end\ndata: {}\n\n`));
      } catch (e) {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ message: String(e) })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
