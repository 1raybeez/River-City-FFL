import HomeClient from "@/app/HomeClient";
import {
  anonymousCurrentMember,
  getCurrentMember,
} from "@/lib/auth/currentMember";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let member = anonymousCurrentMember;
  try {
    member = await getCurrentMember();
  } catch {
    // Public Home remains available when the optional session cannot be read.
  }
  return <HomeClient initialMember={member} />;
}
