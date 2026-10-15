"use client";

import { motion } from "framer-motion";
import { useMemo, useState, type ReactNode } from "react";
import { useFx } from "@/client/fx";
import { useGame, useNow } from "@/client/game";
import { Bar, EmptyState, Modal, RarityTag, SectionTitle } from "@/components/ui";
import { CAPSULE_TABLES, RARITY_META, SHOP } from "@/lib/game/config";
import { ITEMS, ITEM_LIST, poolItems } from "@/lib/game/items";
import { chances } from "@/lib/game/rng";
import { collectionStats } from "@/lib/game/selectors";
import { formatDuration } from "@/lib/game/time";
import { RARITIES, SLOTS, type ItemDef, type ItemKind, type Rarity, type Slot } from "@/lib/game/types";

type KindFilter = "all" | "cosmetic" | ItemKind;
const KIND_TABS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cosmetic", label: "Cosmetics" },
  { id: "title", label: "Titles" },
  { id: "badge", label: "Badges" },
  { id: "mutation", label: "Mutations" },
  { id: "food", label: "Food" },
  { id: "capsule", label: "Capsules" },
  { id: "effect", label: "Effects" },
];
const COSMETIC: ItemKind[] = ["hat", "eyewear", "aura", "color"];

export default function InventoryPage() {
  const { state } = useGame();
  const [tab, setTab] = useState<"items" | "shop">("items");
  const [kind, setKind] = useState<KindFilter>("all");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [sort, setSort] = useState<"recent" | "rarity" | "name">("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const [inspect, setInspect] = useState<string | null>(null);

  const items = useMemo(() => {
    if (!state) return [];
    const base = showAll ? ITEM_LIST : ITEM_LIST.filter((i) => state.inventory[i.id]);
    const q = query.trim().toLowerCase();
    return base
      .filter((i) => kind === "all" || (kind === "cosmetic" ? COSMETIC.includes(i.kind) : i.kind === kind))
      .filter((i) => rarity === "all" || i.rarity === rarity)
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "rarity") return RARITY_META[b.rarity].order - RARITY_META[a.rarity].order;
        return (state.inventory[b.id]?.lastAcquiredAt ?? 0) - (state.inventory[a.id]?.lastAcquiredAt ?? 0);
      });
  }, [state, kind, rarity, sort, showAll, query]);

  if (!state) return null;
  const stats = collectionStats(state);
  const owned = Object.keys(state.inventory).length;

  return (
    <div>
      <SectionTitle kicker={`${owned} items owned · nothing here has real-world value`} title="INVENTORY">
        <div className="flex gap-1 rounded-xl border border-line p-1" role="tablist">
          {(["items", "shop"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-1.5 font-display text-sm uppercase ${tab === t ? "bg-neon text-black" : "text-white/80"}`}>
              {t === "items" ? "🎒 Items" : "🛒 Shop"}
            </button>
          ))}
        </div>
      </SectionTitle>

      {tab === "shop" ? (
        <Shop />
      ) : (
        <>
          {/* collection completion */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {stats.map((s) => (
              <div key={s.kind} className="card p-2">
                <div className="flex justify-between text-xs">
                  <span className="capitalize text-muted">{s.kind}</span>
                  <span className="font-mono">
                    {s.owned}/{s.total}
                  </span>
                </div>
                <Bar value={s.owned} max={s.total} color={s.owned === s.total ? "#ffb02e" : "#2ef2ff"} label={`${s.kind} collection`} />
              </div>
            ))}
          </div>

          {/* controls */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="no-scrollbar flex gap-1 overflow-x-auto" role="tablist" aria-label="Item type">
              {KIND_TABS.map((k) => (
                <button key={k.id} role="tab" aria-selected={kind === k.id} onClick={() => setKind(k.id)} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${kind === k.id ? "border-neon bg-neon text-black" : "border-line text-white/80 hover:border-white/40"}`}>
                  {k.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <label className="sr-only" htmlFor="inv-search">
              Search items
            </label>
            <input id="inv-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="search…" className="w-36 rounded-lg border border-line bg-black/40 px-2 py-1 outline-none focus:border-neon" />
            <label className="flex items-center gap-1">
              <span className="text-muted">Rarity</span>
              <select value={rarity} onChange={(e) => setRarity(e.target.value as Rarity | "all")} className="rounded-lg border border-line bg-black/40 px-2 py-1">
                <option value="all">All</option>
                {RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {RARITY_META[r].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1">
              <span className="text-muted">Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-lg border border-line bg-black/40 px-2 py-1">
                <option value="recent">Recent</option>
                <option value="rarity">Rarity</option>
                <option value="name">Name</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-[#39ff88]" />
              <span className="text-muted">Show uncollected</span>
            </label>
            <div className="ml-auto flex gap-1" role="group" aria-label="View mode">
              <button className={`btn-ghost !px-2 !py-1 ${view === "grid" ? "!border-neon" : ""}`} aria-pressed={view === "grid"} onClick={() => setView("grid")}>
                ▦
              </button>
              <button className={`btn-ghost !px-2 !py-1 ${view === "list" ? "!border-neon" : ""}`} aria-pressed={view === "list"} onClick={() => setView("list")}>
                ☰
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <EmptyState emoji="🕸️" title="Nothing matches">
              {owned === 0 ? "Your inventory is emptier than a group chat at 4am." : "Try other filters, or tick “Show uncollected”."}
            </EmptyState>
          ) : view === "grid" ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {items.map((i) => (
                <ItemTile key={i.id} item={i} onClick={() => setInspect(i.id)} />
              ))}
            </div>
          ) : (
            <ul className="card divide-y divide-white/5">
              {items.map((i) => {
                const e = state.inventory[i.id];
                return (
                  <li key={i.id}>
                    <button className={`flex w-full items-center gap-3 p-3 text-left hover:bg-white/5 ${e ? "" : "opacity-40"}`} onClick={() => setInspect(i.id)}>
                      <span className="text-2xl">{e ? i.emoji : "❔"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{e ? i.name : "???"}</span>
                        <span className="block truncate text-xs text-muted">{e ? i.description : `Undiscovered ${i.kind}`}</span>
                      </span>
                      <span className="hidden text-xs capitalize text-muted sm:block">{i.kind}</span>
                      {e && i.stackable && <span className="chip">×{e.qty}</span>}
                      <RarityTag rarity={i.rarity} />
                      {e && <span className="hidden w-24 text-right text-xs text-muted md:block">{new Date(e.firstAcquiredAt).toLocaleDateString()}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <section className="card mt-6 p-4">
            <h2 className="label mb-2">Recent acquisitions</h2>
            {state.recent.length === 0 ? (
              <p className="text-sm text-muted">Nothing acquired yet.</p>
            ) : (
              <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                {state.recent.slice(0, 12).map((r, idx) => (
                  <li key={r.at + ":" + idx} className="flex items-center gap-2">
                    <span>{r.itemId ? ITEMS[r.itemId]?.emoji : "🏆"}</span>
                    <span className="min-w-0 flex-1 truncate">{r.label}</span>
                    <span className="text-xs text-muted">{r.source}</span>
                    <RarityTag rarity={r.rarity} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <InspectModal itemId={inspect} onClose={() => setInspect(null)} />
    </div>
  );
}

function ItemTile({ item, onClick }: { item: ItemDef; onClick: () => void }) {
  const { state } = useGame();
  const e = state?.inventory[item.id];
  const color = RARITY_META[item.rarity].color;
  const equipped = state && (Object.values(state.pet.equipped).includes(item.id) || state.equippedTitle === item.id || state.equippedBadges.includes(item.id) || state.pet.mutations.includes(item.id));
  return (
    <motion.button
      layout
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border bg-panel p-2 text-center ${e ? "" : "opacity-40"} ${item.rarity === "mythical" && e ? "rainbow-border" : ""}`}
      style={{ borderColor: color + (e ? "aa" : "33"), boxShadow: e && RARITY_META[item.rarity].order >= 3 ? `0 0 18px -6px ${color}` : undefined }}
      aria-label={`${e ? item.name : "Undiscovered item"}, ${item.rarity}${e && item.stackable ? `, quantity ${e.qty}` : ""}`}
    >
      <span className="text-4xl">{e ? item.emoji : "❔"}</span>
      <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{e ? item.name : "???"}</span>
      {e && item.stackable && <span className="absolute right-1.5 top-1.5 rounded-md bg-black/70 px-1 font-mono text-[10px]">×{e.qty}</span>}
      {equipped && <span className="absolute left-1.5 top-1.5 rounded-md bg-neon px-1 text-[10px] font-bold text-black">ON</span>}
      <span className="absolute inset-x-0 bottom-0 h-1 rounded-b-2xl" style={{ background: color }} />
    </motion.button>
  );
}

function CapsuleOdds({ table }: { table: string }) {
  const rows = CAPSULE_TABLES[table];
  const pct = chances(rows, (r) => r.weight);
  return (
    <div className="mt-3 rounded-xl border border-line p-3">
      <div className="label mb-2 !text-sm">Exact drop probabilities</div>
      <ul className="space-y-2 text-sm">
        {rows.map((r, i) => {
          const pool = poolItems("cosmetic", r.rarity);
          return (
            <li key={r.rarity}>
              <div className="flex items-center justify-between">
                <RarityTag rarity={r.rarity} />
                <span className="font-mono" style={{ color: RARITY_META[r.rarity].color }}>
                  {pct[i].toFixed(pct[i] < 1 ? 2 : 1)}%
                </span>
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {pool.length} items, each {(pct[i] / pool.length).toFixed(3)}%: {pool.map((p) => p.emoji).join(" ")}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">Duplicates convert to 💎 tokens. Capsules are earned through play only — they can never be bought with real money.</p>
    </div>
  );
}

function InspectModal({ itemId, onClose }: { itemId: string | null; onClose: () => void }) {
  const { state, act, pending } = useGame();
  const fx = useFx();
  const now = useNow();
  const item = itemId ? ITEMS[itemId] : undefined;
  if (!state) return null;
  const e = item ? state.inventory[item.id] : undefined;

  let action: ReactNode = null;
  if (item && e) {
    const busy = pending.size > 0;
    if ((SLOTS as readonly string[]).includes(item.kind)) {
      const on = state.pet.equipped[item.kind as Slot] === item.id;
      action = (
        <button className={on ? "btn-ghost" : "btn-neon"} disabled={busy} onClick={() => act(on ? { type: "unequip", slot: item.kind as Slot } : { type: "equip", itemId: item.id })}>
          {on ? "Unequip" : "Equip on pet"}
        </button>
      );
    } else if (item.kind === "title") {
      const on = state.equippedTitle === item.id;
      action = (
        <button className={on ? "btn-ghost" : "btn-neon"} disabled={busy} onClick={() => act({ type: "equipTitle", itemId: on ? null : item.id })}>
          {on ? "Remove title" : "Equip title"}
        </button>
      );
    } else if (item.kind === "badge") {
      const on = state.equippedBadges.includes(item.id);
      action = (
        <button className={on ? "btn-ghost" : "btn-neon"} disabled={busy} onClick={() => act({ type: "toggleBadge", itemId: item.id })}>
          {on ? "Unpin badge" : "Pin badge to profile (max 3)"}
        </button>
      );
    } else if (item.kind === "mutation") {
      const on = state.pet.mutations.includes(item.id);
      action = (
        <button className={on ? "btn-ghost" : "btn-volt"} disabled={busy} onClick={() => act({ type: "toggleMutation", itemId: item.id })}>
          {on ? "Deactivate mutation" : "Activate mutation"}
        </button>
      );
    } else if (item.kind === "food") {
      action = (
        <button
          className="btn-neon"
          disabled={busy}
          onClick={async () => {
            fx.sfx("feed");
            await act({ type: "feedPet", itemId: item.id });
          }}
        >
          Feed to {state.pet.name}
        </button>
      );
    } else if (item.kind === "effect") {
      const active = state.activeEffects.find((x) => x.itemId === item.id && x.until > now);
      action = (
        <button className="btn-volt" disabled={busy} onClick={() => act({ type: "useEffect", itemId: item.id })}>
          {active ? `Extend (${formatDuration(active.until - now)} left)` : "Activate"}
        </button>
      );
    } else if (item.kind === "capsule") {
      action = (
        <button
          className="btn-hot"
          disabled={busy}
          onClick={async () => {
            fx.sfx("open");
            const r = await act({ type: "openCapsule", itemId: item.id });
            if (r.ok && !state.inventory[item.id]?.qty) onClose();
          }}
        >
          Open capsule
        </button>
      );
    }
  }

  return (
    <Modal open={!!item} onClose={onClose} title={item && e ? item.name : "Undiscovered item"}>
      {item && (
        <div className="text-center">
          <motion.div
            key={item.id}
            initial={{ rotateY: 90, scale: 0.6 }}
            animate={{ rotateY: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className={`mx-auto flex h-36 w-36 items-center justify-center rounded-3xl border-2 bg-black/40 text-7xl ${item.rarity === "mythical" && e ? "rainbow-border" : ""}`}
            style={{ borderColor: RARITY_META[item.rarity].color, boxShadow: `0 0 40px -12px ${RARITY_META[item.rarity].color}` }}
          >
            {e ? item.emoji : "❔"}
          </motion.div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <RarityTag rarity={item.rarity} />
            <span className="chip capitalize">{item.kind}</span>
            {e && item.stackable && <span className="chip">×{e.qty}</span>}
          </div>
          <p className="mt-3 text-white/85">{e ? item.description : "You haven't found this yet. Spin, open capsules and complete quests."}</p>
          {item.food && (
            <p className="mt-1 text-xs text-muted">
              +{item.food.petXp} pet XP · +{item.food.hunger} hunger · +{item.food.mood} mood
            </p>
          )}
          {item.effect && <p className="mt-1 text-xs text-muted">Lasts {Math.round(item.effect.durationMs / 60000)} minutes. Consumed on use.</p>}
          {e && (
            <p className="mt-2 text-xs text-muted">
              First acquired {new Date(e.firstAcquiredAt).toLocaleString()}
              {e.lastAcquiredAt !== e.firstAcquiredAt && <> · last {new Date(e.lastAcquiredAt).toLocaleString()}</>}
            </p>
          )}
          {item.capsuleTable && <CapsuleOdds table={item.capsuleTable} />}
          {action && <div className="mt-4 flex justify-center">{action}</div>}
        </div>
      )}
    </Modal>
  );
}

function Shop() {
  const { state, act, pending } = useGame();
  const fx = useFx();
  if (!state) return null;
  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Fixed prices, no randomness, fictional currencies earned by playing. 🧠 Braincells come from posts, quests and spins; 💎 tokens from duplicates, quests and achievements. Nothing here can be bought with real money.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SHOP.map((o) => {
          const item = ITEMS[o.itemId];
          const owned = !item.stackable && !!state.inventory[item.id];
          const afford = (o.currency === "coins" ? state.coins : state.tokens) >= o.price;
          return (
            <div key={o.itemId} className="card flex items-center gap-3 p-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-3xl" style={{ borderColor: RARITY_META[item.rarity].color }}>
                {item.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{item.name}</div>
                <div className="flex items-center gap-1">
                  <RarityTag rarity={item.rarity} />
                  {item.stackable && state.inventory[item.id] && <span className="text-xs text-muted">own ×{state.inventory[item.id].qty}</span>}
                </div>
              </div>
              <button
                className={o.currency === "coins" ? "btn-neon !px-3" : "btn-volt !px-3"}
                disabled={owned || !afford || pending.has("buy:" + o.itemId)}
                onClick={async () => {
                  const r = await act({ type: "buy", itemId: o.itemId });
                  if (r.ok) fx.sfx("coin");
                }}
                aria-label={`Buy ${item.name} for ${o.price} ${o.currency === "coins" ? "braincells" : "tokens"}`}
              >
                {owned ? "Owned" : `${o.price} ${o.currency === "coins" ? "🧠" : "💎"}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
