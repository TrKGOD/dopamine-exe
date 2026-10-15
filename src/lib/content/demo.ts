import type { Personality } from "../game/types";

/** Fictional demonstration players. Always rendered with a DEMO label. */
export interface DemoPlayer {
  publicId: string;
  displayName: string;
  title: string | null;
  level: number;
  weeklyXp: number;
  petName: string;
  personality: Personality;
  petLevel: number;
  hat?: string;
  eyewear?: string;
  aura?: string;
  color?: string;
  mutations: string[];
  badges: string[];
  items: number;
  achievements: number;
  views: number;
}

export const DEMO_PLAYERS: DemoPlayer[] = [
  { publicId: "demo-xenon", displayName: "xX_Sk1bidi_Xx", title: "title_algo", level: 27, weeklyXp: 4120, petName: "Lord Nibbles", personality: "entity", petLevel: 18, hat: "hat_orb", aura: "aura_void", color: "color_glitch", mutations: ["mut_glitch", "mut_pixel"], badges: ["badge_final", "badge_collector"], items: 51, achievements: 17, views: 48 },
  { publicId: "demo-capy", displayName: "capy_enjoyer", title: "title_main", level: 22, weeklyXp: 3540, petName: "Sir Chill", personality: "capybara", petLevel: 16, hat: "hat_halo", aura: "aura_galaxy", color: "color_gold", mutations: ["mut_thirdeye"], badges: ["badge_final"], items: 40, achievements: 15, views: 48 },
  { publicId: "demo-grind", displayName: "4am_grindset", title: "title_lord", level: 19, weeklyXp: 2980, petName: "Chad Squeakington", personality: "sigma", petLevel: 12, eyewear: "eye_monocle", aura: "aura_fire", color: "color_chrome", mutations: ["mut_laser"], badges: ["badge_spinner"], items: 33, achievements: 12, views: 44 },
  { publicId: "demo-goblin", displayName: "goblin.trades", title: "title_yapper", level: 15, weeklyXp: 2210, petName: "Shiny Gary", personality: "goblin", petLevel: 11, hat: "hat_crown", eyewear: "eye_3d", color: "color_vapor", mutations: [], badges: ["badge_collector"], items: 29, achievements: 10, views: 39 },
  { publicId: "demo-cat", displayName: "glowcat", title: "title_grass", level: 12, weeklyXp: 1700, petName: "Mr. Rads", personality: "radcat", petLevel: 9, hat: "hat_wizard", aura: "aura_ring", color: "color_uv", mutations: ["mut_ghost"], badges: ["badge_feeder"], items: 21, achievements: 8, views: 30 },
  { publicId: "demo-corp", displayName: "synergy_steve", title: "title_scroller", level: 9, weeklyXp: 1120, petName: "Q3 Projections", personality: "corporate", petLevel: 7, eyewear: "eye_nerd", color: "color_bruise", mutations: [], badges: [], items: 15, achievements: 6, views: 22 },
  { publicId: "demo-grem", displayName: "router_licker", title: null, level: 6, weeklyXp: 640, petName: "Chompy", personality: "gremlin", petLevel: 5, hat: "hat_propeller", aura: "aura_stink", mutations: [], badges: ["badge_dayone"], items: 11, achievements: 4, views: 15 },
  { publicId: "demo-lurk", displayName: "lurker_9000", title: null, level: 3, weeklyXp: 210, petName: "Blob", personality: "capybara", petLevel: 2, mutations: [], badges: [], items: 6, achievements: 2, views: 8 },
];

/** Weekly community challenge — demo baseline plus real players' contribution. */
export const COMMUNITY_CHALLENGE = {
  id: "cc_views",
  name: "THE CEO DEMANDS ENGAGEMENT",
  description: "Collectively watch 2,500 new posts this week to unlock a server-wide bragging right.",
  goal: 2500,
  demoBaseline: 1337,
};
