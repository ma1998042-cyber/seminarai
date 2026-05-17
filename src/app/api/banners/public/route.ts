import { NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { getActiveBanners } from "@/lib/db/queries/banners";

export async function GET() {
  const db = getDbFromContext();
  const bannersList = await getActiveBanners(db);
  return NextResponse.json(bannersList);
}
