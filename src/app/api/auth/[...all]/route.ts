import { getAuth } from "@/lib/auth";

async function handler(request: Request): Promise<Response> {
  const auth = getAuth();
  return auth.handler(request);
}

export const GET = handler;
export const POST = handler;
