import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";

const ALLOWED_TYPES = ["ping", "traceroute", "mtr", "bgp"];

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  const { type } = params;

  if (!ALLOWED_TYPES.includes(type)) {
    return new NextResponse("Invalid type.", { status: 400 });
  }

  const ip = request.nextUrl.searchParams.get("ip");
  const backendName = request.nextUrl.searchParams.get("backend");

  if (!ip || !backendName) {
    return new NextResponse("Missing ip or backend parameter.", { status: 400 });
  }

  const config = JSON.parse(
    await fs.readFile(process.cwd() + "/config.json", "utf8")
  );

  // Resolve backend URL by name — prevents arbitrary URL proxying
  const backend = config.locations
    .flatMap((loc: any) => loc.backends)
    .find((b: any) => b.name === backendName);

  if (!backend) {
    return new NextResponse("Unknown backend.", { status: 400 });
  }

  try {
    const response = await fetch(
      `${backend.url}/lg/${type}?ip=${encodeURIComponent(ip)}`
    );
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "text/plain" },
    });
  } catch {
    return new NextResponse("Backend unreachable.", { status: 502 });
  }
}
