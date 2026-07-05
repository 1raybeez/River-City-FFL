import { redirect } from "next/navigation";

import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import AuctionWarRoomClient from "./AuctionWarRoomClient";

export default async function AuctionWarRoomPage() {
  try {
    await requireAuctionAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      redirect("/commish/auction/login");
    }

    throw error;
  }

  return <AuctionWarRoomClient />;
}
