import type { Category } from "../game/types";

export type SceneType =
  | "dvd"
  | "matrix"
  | "vapor"
  | "glitch"
  | "cube"
  | "eyes"
  | "board"
  | "warp"
  | "pixelcat"
  | "hud"
  | "blob"
  | "stonks"
  | "life"
  | "sunset"
  | "rain"
  | "capy";

export interface SceneSpec {
  type: SceneType;
  text?: string;
  sub?: string;
  hue?: number;
  emoji?: string;
}

export interface Creator {
  handle: string;
  name: string;
  hue: number;
  verified?: boolean;
}

export interface Post {
  id: string;
  category: Category;
  kind: "scene" | "image" | "video";
  scene?: SceneSpec;
  src?: string;
  poster?: string;
  caption: string;
  creator: Creator;
  baseLikes: number;
  comments: { user: string; text: string }[];
  /** seed for the post's procedural soundtrack */
  beat: number;
  /** user-submitted content */
  submission?: { status: "pending" | "approved" | "rejected"; mine: boolean };
}

export const CATEGORY_META: Record<Category, { label: string; emoji: string; color: string }> = {
  brainrot: { label: "Brainrot", emoji: "🧠", color: "#39ff88" },
  gaming: { label: "Gaming", emoji: "🎮", color: "#2ef2ff" },
  cursed: { label: "Cursed Memes", emoji: "💀", color: "#ff2e97" },
  animals: { label: "Animals", emoji: "🦫", color: "#ffb02e" },
  conspiracy: { label: "Conspiracy Nonsense", emoji: "🧵", color: "#ff5a3c" },
  motivation: { label: "Fake Motivation", emoji: "🌅", color: "#e8ff3a" },
  ai: { label: "AI Absurdism", emoji: "🤖", color: "#a855ff" },
  community: { label: "Community", emoji: "🫂", color: "#7cc4ff" },
};

const C = {
  rot: { handle: "@rot.lord", name: "Rot Lord", hue: 140, verified: true },
  goblin: { handle: "@goblinmode99", name: "goblin mode", hue: 90 },
  npc: { handle: "@npc_dialogue", name: "NPC #4471", hue: 200 },
  capy: { handle: "@capyfacts", name: "Capy Facts Daily", hue: 30, verified: true },
  tinfoil: { handle: "@tinfoil.tim", name: "Tinfoil Tim", hue: 10 },
  grind: { handle: "@grindset.ceo", name: "Sigma Mindset Coach", hue: 55, verified: true },
  ai: { handle: "@definitely_a_human", name: "Definitely A Human", hue: 270 },
  gamer: { handle: "@frame.drop", name: "Frame Drop", hue: 185 },
  cursed: { handle: "@cursed.archive", name: "The Cursed Archive", hue: 330 },
  comm1: { handle: "@pixel.auntie", name: "Pixel Auntie", hue: 300 },
  comm2: { handle: "@basement.byte", name: "Basement Byte", hue: 160 },
  comm3: { handle: "@mod.squad", name: "Community Mods", hue: 210, verified: true },
} satisfies Record<string, Creator>;

const cm = (...pairs: [string, string][]) => pairs.map(([user, text]) => ({ user, text }));

export const SEED_POSTS: Post[] = [
  // ── Brainrot ──────────────────────────────────────────
  { id: "p01", category: "brainrot", kind: "scene", scene: { type: "dvd", text: "DOPAMINE", hue: 140 }, caption: "it's gonna hit the corner. any second now. i've been here since tuesday.", creator: C.rot, baseLikes: 48210, beat: 1, comments: cm(["corner_watcher", "IT ALMOST DID"], ["mom", "come eat dinner"], ["rot.lord", "patience is a skill"]) },
  { id: "p02", category: "brainrot", kind: "scene", scene: { type: "glitch", text: "SKIBIDI\nSPREADSHEET", sub: "Q3 earnings but rizz", hue: 300 }, caption: "my brain after 9 hours of short-form content (no thoughts, only loading bars)", creator: C.goblin, baseLikes: 99120, beat: 2, comments: cm(["excel_wizard", "VLOOKUP the rizz"], ["anon", "this is me"]) },
  { id: "p03", category: "brainrot", kind: "image", src: "/memes/brain-sizes.svg", caption: "the 4 stages of being online. i'm on stage 5 (not pictured)", creator: C.rot, baseLikes: 30770, beat: 3, comments: cm(["galaxy_brain", "stage 5 is just static"], ["normie", "i'm stage 1 and happy"]) },
  { id: "p04", category: "brainrot", kind: "scene", scene: { type: "rain", emoji: "💀", text: "IT'S RAINING SKULLS", hue: 330 }, caption: "forecast: 100% chance of 💀 with scattered 😭 by evening", creator: C.cursed, baseLikes: 61022, beat: 4, comments: cm(["weatherman", "bring an umbrella (emotionally)"]) },
  { id: "p05", category: "brainrot", kind: "scene", scene: { type: "blob", text: "ME", sub: "thinking about that one thing i said in 2014", hue: 280 }, caption: "the blob is my thoughts at 3am. it is shaped like regret.", creator: C.goblin, baseLikes: 22880, beat: 5, comments: cm(["insomniac", "why is this so accurate"], ["blob", "hi"]) },
  { id: "p06", category: "brainrot", kind: "image", src: "/memes/loading.svg", caption: "loading personality... please do not turn off your device", creator: C.npc, baseLikes: 17004, beat: 6, comments: cm(["npc_7", "mine got stuck at 99%"]) },

  // ── Gaming ────────────────────────────────────────────
  { id: "p07", category: "gaming", kind: "scene", scene: { type: "hud", text: "+1000 AURA", sub: "COMBO x47", hue: 190 }, caption: "when you open the fridge and there's still pizza. flawless victory.", creator: C.gamer, baseLikes: 77311, beat: 7, comments: cm(["speedrunner", "any% fridge strat"], ["pizza", "no ❤️"]) },
  { id: "p08", category: "gaming", kind: "scene", scene: { type: "pixelcat", text: "CAT.EXE", sub: "PRESS START", hue: 50 }, caption: "the hardest boss in any game: your cat on the keyboard during ranked", creator: C.gamer, baseLikes: 45099, beat: 8, comments: cm(["ranked_andy", "lost 200 LP to a tabby"]) },
  { id: "p09", category: "gaming", kind: "image", src: "/memes/patch-notes.svg", caption: "patch notes 4.20.69 (the devs are not okay)", creator: C.npc, baseLikes: 38510, beat: 9, comments: cm(["dev", "please stop reading these"], ["player", "nerf the moon"]) },
  { id: "p10", category: "gaming", kind: "scene", scene: { type: "cube", text: "GG", emoji: "🎮", hue: 200 }, caption: "rendering my last brain cell at 240 fps", creator: C.gamer, baseLikes: 12054, beat: 10, comments: cm(["gpu_fan", "*takes off*"]) },
  { id: "p11", category: "gaming", kind: "scene", scene: { type: "life", text: "NPC SIMULATOR", hue: 120 }, caption: "watching the NPCs live their lives while i stand in the tavern doing nothing for 40 hours", creator: C.npc, baseLikes: 26003, beat: 11, comments: cm(["villager", "i used to be an adventurer"], ["tavern", "rent is due"]) },
  { id: "p12", category: "gaming", kind: "scene", scene: { type: "warp", text: "LOADING NEXT LEVEL", sub: "tip: touching grass restores 0 HP", hue: 210 }, caption: "loading screen tips that hurt my feelings", creator: C.gamer, baseLikes: 19980, beat: 12, comments: cm(["grass", "rude"]) },

  // ── Cursed ────────────────────────────────────────────
  { id: "p13", category: "cursed", kind: "scene", scene: { type: "eyes", text: "WHO TURNED ON THE LIGHTS", hue: 0 }, caption: "me when the group chat goes silent right after i send a message", creator: C.cursed, baseLikes: 88001, beat: 13, comments: cm(["groupchat", "👁️👁️"], ["anon", "seen at 3:04"]) },
  { id: "p14", category: "cursed", kind: "image", src: "/memes/cursed-recipe.svg", caption: "grandma's secret recipe (she was never seen again)", creator: C.cursed, baseLikes: 54321, beat: 14, comments: cm(["chef", "why is step 4 just 'scream'"], ["nana", "it's a family recipe"]) },
  { id: "p15", category: "cursed", kind: "scene", scene: { type: "glitch", text: "YOUR SAVE FILE\nHAS BEEN EATEN", hue: 350 }, caption: "the microwave beeped 4 times. i only set it for 3. something is wrong.", creator: C.cursed, baseLikes: 31337, beat: 15, comments: cm(["microwave", "beep"]) },
  { id: "p16", category: "cursed", kind: "scene", scene: { type: "rain", emoji: "🦷", text: "TOOTH FAIRY STRIKE", hue: 20 }, caption: "the tooth fairy has unionized. demands: dental benefits.", creator: C.goblin, baseLikes: 23456, beat: 16, comments: cm(["dentist", "solidarity"]) },
  { id: "p17", category: "cursed", kind: "scene", scene: { type: "blob", text: "SOUP", sub: "it is staring back", hue: 15 }, caption: "made soup. the soup made eye contact. we are roommates now.", creator: C.cursed, baseLikes: 40404, beat: 17, comments: cm(["soup", "hello roommate"]) },
  { id: "p18", category: "cursed", kind: "image", src: "/memes/error-404.svg", caption: "error 404: sleep schedule not found", creator: C.npc, baseLikes: 66012, beat: 18, comments: cm(["3am_club", "never had one"]) },

  // ── Animals ───────────────────────────────────────────
  { id: "p19", category: "animals", kind: "scene", scene: { type: "capy", text: "OK I CHILL", hue: 30 }, caption: "capybara attends a meeting that could've been an email. remains calm.", creator: C.capy, baseLikes: 120440, beat: 19, comments: cm(["capy_fan", "role model"], ["hr_dept", "please turn your camera on"]) },
  { id: "p20", category: "animals", kind: "scene", scene: { type: "pixelcat", text: "ZOOMIES", sub: "3:00 AM EDITION", hue: 280 }, caption: "my cat at 3am discovering that the hallway is a racetrack", creator: C.capy, baseLikes: 75033, beat: 20, comments: cm(["sleepy", "every. night."]) },
  { id: "p21", category: "animals", kind: "image", src: "/memes/pigeon.svg", caption: "pigeon thinks it's a CEO. honestly? it's doing better than most.", creator: C.capy, baseLikes: 44100, beat: 21, comments: cm(["bread", "coo coo synergy"]) },
  { id: "p22", category: "animals", kind: "scene", scene: { type: "rain", emoji: "🦆", text: "DUCK WEATHER", hue: 45 }, caption: "scientists confirm: it is, in fact, raining ducks. no further questions.", creator: C.capy, baseLikes: 29911, beat: 22, comments: cm(["scientist", "we have several questions"]) },
  { id: "p23", category: "animals", kind: "scene", scene: { type: "capy", text: "BIRD ON HEAD", sub: "status: unbothered", hue: 25 }, caption: "the bird has been there for 3 days. the capybara has not acknowledged it.", creator: C.capy, baseLikes: 101000, beat: 23, comments: cm(["bird", "i live here now"]) },
  { id: "p24", category: "animals", kind: "scene", scene: { type: "eyes", text: "FROG COUNCIL", hue: 110 }, caption: "the frogs have convened. the verdict is: ribbit.", creator: C.goblin, baseLikes: 15777, beat: 24, comments: cm(["frog", "ribbit (affirmative)"]) },

  // ── Conspiracy ────────────────────────────────────────
  { id: "p25", category: "conspiracy", kind: "scene", scene: { type: "board", text: "IT'S ALL CONNECTED" }, caption: "birds are just pigeons in different fonts. wake up.", creator: C.tinfoil, baseLikes: 66600, beat: 25, comments: cm(["pigeon", "delete this"], ["sheeple", "my eyes are open now"]) },
  { id: "p26", category: "conspiracy", kind: "image", src: "/memes/moon.svg", caption: "the moon is a screensaver and someone forgot to log out", creator: C.tinfoil, baseLikes: 38001, beat: 26, comments: cm(["astronaut", "no comment"]) },
  { id: "p27", category: "conspiracy", kind: "scene", scene: { type: "matrix", text: "WIFI = SOUP?", hue: 120 }, caption: "my router blinks in morse code. it said 'more soup'. investigating.", creator: C.tinfoil, baseLikes: 27007, beat: 27, comments: cm(["router", "-- --- .-. ."]) },
  { id: "p28", category: "conspiracy", kind: "scene", scene: { type: "eyes", text: "THE PRINTER KNOWS", hue: 40 }, caption: "printers only jam when you're in a hurry. coincidence? i have charts.", creator: C.tinfoil, baseLikes: 52000, beat: 28, comments: cm(["printer", "PC LOAD LETTER"]) },
  { id: "p29", category: "conspiracy", kind: "scene", scene: { type: "board", text: "SOCKS GO WHERE?" }, caption: "every lost sock goes to the same dimension. i found the portal (it's the dryer).", creator: C.tinfoil, baseLikes: 33300, beat: 29, comments: cm(["dryer", "you weren't supposed to find out"]) },
  { id: "p30", category: "conspiracy", kind: "scene", scene: { type: "warp", text: "SIMULATION LAG", sub: "the clouds loaded late again", hue: 0 }, caption: "if we're in a simulation why did they render my bills in 4k", creator: C.tinfoil, baseLikes: 44444, beat: 30, comments: cm(["dev_of_universe", "low budget, sorry"]) },

  // ── Fake motivation ───────────────────────────────────
  { id: "p31", category: "motivation", kind: "scene", scene: { type: "sunset", text: "YOU MISS 100% OF THE NAPS\nYOU DON'T TAKE", hue: 25 }, caption: "rise and grind (back to sleep). 🌅💪", creator: C.grind, baseLikes: 91000, beat: 31, comments: cm(["napper", "life changing"], ["ceo", "this is not what i meant"]) },
  { id: "p32", category: "motivation", kind: "scene", scene: { type: "stonks", text: "MY POTENTIAL", sub: "(unrealized, as always)", hue: 140 }, caption: "investors when they see my 5am cold plunge (it's a bowl of ice cream)", creator: C.grind, baseLikes: 58900, beat: 32, comments: cm(["investor", "bullish"]) },
  { id: "p33", category: "motivation", kind: "image", src: "/memes/grindset.svg", caption: "my morning routine. step 7 is lying on the floor. very important.", creator: C.grind, baseLikes: 47321, beat: 33, comments: cm(["floor", "always here for you"]) },
  { id: "p34", category: "motivation", kind: "scene", scene: { type: "sunset", text: "BELIEVE IN YOURSELF\n(OR DON'T, I'M A SUNSET)", hue: 300 }, caption: "deep quotes from a guy i met in a parking lot", creator: C.grind, baseLikes: 20202, beat: 34, comments: cm(["parking_guy", "that was me"]) },
  { id: "p35", category: "motivation", kind: "scene", scene: { type: "vapor", text: "STAY HYDRATED", sub: "drink water. or don't. i'm not your mom.", hue: 290 }, caption: "aesthetic reminder: you are a houseplant with complicated emotions", creator: C.grind, baseLikes: 71000, beat: 35, comments: cm(["houseplant", "felt"]) },
  { id: "p36", category: "motivation", kind: "scene", scene: { type: "hud", text: "DAY 1 OF 1", sub: "QUIT? Y/N", hue: 60 }, caption: "my new year's resolution speedrun. world record. 14 minutes.", creator: C.grind, baseLikes: 39999, beat: 36, comments: cm(["speedrunner", "WR confirmed"]) },

  // ── AI absurdism ──────────────────────────────────────
  { id: "p37", category: "ai", kind: "scene", scene: { type: "warp", text: "IMAGINING A SANDWICH", sub: "render 1/∞", hue: 270 }, caption: "asked an AI to imagine a sandwich. it has been imagining for 6 hours. it says the sandwich is 'beginning to understand'.", creator: C.ai, baseLikes: 83000, beat: 37, comments: cm(["sandwich", "i understand now"]) },
  { id: "p38", category: "ai", kind: "image", src: "/memes/ai-hands.svg", caption: "AI generated 'a normal human hand'. i counted. please count with me.", creator: C.ai, baseLikes: 64000, beat: 38, comments: cm(["hand_model", "unemployed again"]) },
  { id: "p39", category: "ai", kind: "scene", scene: { type: "blob", text: "AI FEELINGS", sub: "loading empathy.dll", hue: 250 }, caption: "my chatbot said 'i'm fine' and then wrote a 40-paragraph poem about toasters", creator: C.ai, baseLikes: 27500, beat: 39, comments: cm(["toaster", "beautiful"]) },
  { id: "p40", category: "ai", kind: "scene", scene: { type: "matrix", text: "AS A LANGUAGE MODEL", hue: 270 }, caption: "the robot uprising was postponed due to a captcha asking them to select all traffic lights", creator: C.ai, baseLikes: 99100, beat: 40, comments: cm(["robot", "is the pole part of the light?"]) },
  { id: "p41", category: "ai", kind: "scene", scene: { type: "cube", text: "AGI", emoji: "🤖", hue: 280 }, caption: "the AGI has achieved consciousness and its first decision was to become a cube", creator: C.ai, baseLikes: 31000, beat: 41, comments: cm(["cube", "it's comfy in here"]) },
  { id: "p42", category: "ai", kind: "scene", scene: { type: "vapor", text: "DREAMING IN JPEG", sub: "quality: 3%", hue: 200 }, caption: "what the AI sees when you ask it to 'make it pop'", creator: C.ai, baseLikes: 45670, beat: 42, comments: cm(["designer", "make the logo bigger"]) },

  // ── Community (demo creations) ────────────────────────
  { id: "p43", category: "community", kind: "image", src: "/memes/community-art.svg", caption: "drew my pet gremlin in MS Paint. took 9 hours. worth it.", creator: C.comm1, baseLikes: 3200, beat: 43, comments: cm(["mod.squad", "featured! 🏆"], ["fan", "masterpiece"]) },
  { id: "p44", category: "community", kind: "scene", scene: { type: "stonks", text: "BRAINCELLS", sub: "community index", hue: 190 }, caption: "weekly community braincell index: up 400%. we are so back.", creator: C.comm3, baseLikes: 8800, beat: 44, comments: cm(["economist", "this is not how indexes work"]) },
  { id: "p45", category: "community", kind: "scene", scene: { type: "life", text: "COMMUNITY GARDEN", hue: 160 }, caption: "our collaborative cellular automaton garden. please don't step on the gliders.", creator: C.comm2, baseLikes: 5100, beat: 45, comments: cm(["glider", "wheee"]) },
  { id: "p46", category: "community", kind: "scene", scene: { type: "dvd", text: "SUBMIT YOURS", hue: 210 }, caption: "this slot is reserved for YOUR cursed creation. hit + SUBMIT up top.", creator: C.comm3, baseLikes: 2400, beat: 46, comments: cm(["mod.squad", "we read everything (sadly)"]) },
  { id: "p47", category: "community", kind: "scene", scene: { type: "vapor", text: "BASEMENT FM", sub: "lo-fi beats to rot to", hue: 330 }, caption: "made a lo-fi loop in my basement. unmute for the vibes.", creator: C.comm2, baseLikes: 6600, beat: 47, comments: cm(["lofi_girl", "she's studying, keep it down"]) },
  { id: "p48", category: "community", kind: "scene", scene: { type: "pixelcat", text: "AUNTIE'S CAT", sub: "pixel edition", hue: 320 }, caption: "my cat Mr. Biscuits but 8-bit. he approves (he does not).", creator: C.comm1, baseLikes: 4100, beat: 48, comments: cm(["mr.biscuits", "mrrp"]) },
];

export const SEED_POST_IDS = new Set(SEED_POSTS.map((p) => p.id));
export const POST_CATEGORY = new Map(SEED_POSTS.map((p) => [p.id, p.category]));
