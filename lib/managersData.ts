import { activeManagers } from "@/lib/managers/activeManagers";

export interface ManagerGridTeam {
  name: string;
  images: string[];
}

export const teams: ManagerGridTeam[] = activeManagers.map((manager) => ({
  name: manager.teamName,
  images: [manager.photo],
}));
