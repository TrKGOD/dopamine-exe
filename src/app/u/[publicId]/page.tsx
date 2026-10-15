import { DEMO_PLAYERS } from "@/lib/content/demo";
import { ProfileClient } from "./ProfileClient";

/** Pre-rendered ids for the static (GitHub Pages) build; the server build renders any id on demand. */
export function generateStaticParams() {
  return [...DEMO_PLAYERS.map((d) => ({ publicId: d.publicId })), { publicId: "me" }];
}

export default async function PublicProfilePage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return <ProfileClient publicId={publicId} />;
}
