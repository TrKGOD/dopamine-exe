import { COMMUNITY_CHALLENGE } from "../content/demo";
import { toProfile } from "../content/profiles";
import { weekKey } from "../game/time";
import { allPlayers } from "./store";

export { demoProfiles, toProfile, type PublicProfile } from "../content/profiles";

export async function realProfiles(itemRarity: (id: string) => string | undefined) {
  return (await allPlayers()).filter((p) => p.onboarded).map((p) => toProfile(p, itemRarity));
}

export async function communityChallenge() {
  const wk = weekKey(Date.now());
  const players = await allPlayers();
  const real = players.reduce((sum, p) => sum + (p.quests.weeklyKey === wk ? p.quests.weekly.views ?? 0 : 0), 0);
  return { ...COMMUNITY_CHALLENGE, real, progress: COMMUNITY_CHALLENGE.demoBaseline + real };
}
