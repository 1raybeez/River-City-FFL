import {
  StaffManager,
  ManagerStatus,
  DraftPreference,
  ValuePosition,
  TeamCode
} from "@/lib/types/Manager";

export const staffManagers: StaffManager[] = [
  {
    roster: 13,
    shortName: "Damon",
    fullName: "Damon Davis",
    status: ManagerStatus.Staff,
    teamName: "The Auctioneer",
    tookOver: 2017,
    location: "Richmond, VA",
    bio: "I’m the black that speaks and everyone listens. Period.",
    photo: "/managers/Damon.png",
    fantasyStart: 2017,
    favoriteTeam: TeamCode.TB,
    mode: "Auctioneer",
    rival: { name: "Tommy", image: "/managers/Tommy.png" },
    favoritePlayer: 4073,
    valuePosition: ValuePosition.WR,
    rookieOrVets: DraftPreference.Vets,
    philosophy:
      "The Standard is the Standard.” An unwavering commitment to success regardless of the obstacles.",
    preferredContact: "Text",
    contactValue: "8049380385",
    sleeperId: "737878619958947840",
    record: "0-0",
    currentWinnings: 0,
    role: "Staff / Auctioneer",
    championships: 0,
    podiums: 0,
    bestFinish: "N/A",
    toiletBowls: 0
  }
];
