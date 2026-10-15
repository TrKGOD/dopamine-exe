import { z } from "zod";
import { PERSONALITIES, SLOTS } from "./types";

const id = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_:-]+$/);
const name = z.string().min(1).max(40);

export const ActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("onboard"), name, personality: z.enum(PERSONALITIES) }),
  z.object({ type: z.literal("viewPost"), postId: id }),
  z.object({ type: z.literal("likePost"), postId: id, liked: z.boolean() }),
  z.object({ type: z.literal("bookmarkPost"), postId: id }),
  z.object({ type: z.literal("share"), target: id }),
  z.object({ type: z.literal("feedPet"), itemId: id }),
  z.object({ type: z.literal("patPet") }),
  z.object({ type: z.literal("renamePet"), name }),
  z.object({ type: z.literal("setPersonality"), personality: z.enum(PERSONALITIES) }),
  z.object({ type: z.literal("equip"), itemId: id }),
  z.object({ type: z.literal("unequip"), slot: z.enum(SLOTS) }),
  z.object({ type: z.literal("toggleMutation"), itemId: id }),
  z.object({ type: z.literal("equipTitle"), itemId: id.nullable() }),
  z.object({ type: z.literal("toggleBadge"), itemId: id }),
  z.object({ type: z.literal("useEffect"), itemId: id }),
  z.object({ type: z.literal("openCapsule"), itemId: id }),
  z.object({ type: z.literal("buy"), itemId: id }),
  z.object({ type: z.literal("spin") }),
  z.object({ type: z.literal("claimQuest"), questId: id }),
  z.object({ type: z.literal("rollChaos") }),
  z.object({ type: z.literal("doNotClick") }),
  z.object({ type: z.literal("eventHit"), target: z.number().int().min(0).max(20) }),
  z.object({ type: z.literal("eventClaim") }),
  z.object({ type: z.literal("setDisplayName"), name }),
  // DOOMCLICKER — clicks are batched; the server caps how many it accepts
  z.object({ type: z.literal("clickerSync"), clicks: z.number().int().min(0).max(200) }),
  z.object({ type: z.literal("clickerBuy"), upgradeId: id, qty: z.number().int().min(1).max(100), clicks: z.number().int().min(0).max(200) }),
  z.object({ type: z.literal("clickerClaimOffline") }),
  z.object({ type: z.literal("clickerPrestige"), confirm: z.literal(true) }),
  z.object({ type: z.literal("clickerClaimMission"), missionId: id }),
]);

export type GameAction = z.infer<typeof ActionSchema>;

export const EnvelopeSchema = z.object({
  nonce: z.string().min(8).max(64).regex(/^[a-zA-Z0-9-]+$/),
  action: ActionSchema,
});
