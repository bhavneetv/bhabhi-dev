# PRD — Bhabhi Dever Online (Thulla Card Game)

**Version:** 1.1 (Draft): added Last Turn review, card counts, voice chat and extra features (section 3.4)
**Platform:** Web (React), mobile-first responsive
**Players per room:** 2–12 (target 10–12)
**Working title:** Bhabhi Dever Online

---

## 1. Overview

### 1.1 Vision
A beautiful, fast, real-time multiplayer web version of the classic South Asian shedding card game **Bhabhi** (also called **Thulla / Thullah / Bhabhi Dever**). Friends create a private room, share a **room code**, and play together with polished card graphics and dramatic animations, especially the **"Thulla"** moment, when someone cannot follow suit and the table erupts.

### 1.2 Problem
Existing options are either offline-only, limited to 4 players, ad-heavy, or visually dated. Friends and family groups (often 6–12 people) have no good way to play together remotely.

### 1.3 Goals
1. Faithful, rule-correct Bhabhi gameplay, scalable to 12 players (multi-deck).
2. Zero-friction join: no signup, enter a name and a room code.
3. Premium feel: smooth 60fps animations, sound, satisfying card physics.
4. Authoritative server: no cheating, no desync, reconnect-safe.
5. Works great on phones (most players will be on mobile).

### 1.4 Non-goals (v1)
- Real-money play, betting or in-app purchases.
- Native mobile apps (PWA is enough).
- Video chat (voice chat is in scope, see section 3.4.3).
- Ranked or global matchmaking (v2).

### 1.5 Target users
| Persona | Need |
|---|---|
| Friends and family group (6–12 people) | Quick private room, everyone joins from phones |
| Casual solo player | Play with bots or public rooms |
| Host | Controls rules, kicks, starts game |

---

## 2. Game Study — How Bhabhi (Thulla) Works

### 2.1 Names and objective
- Known as **Bhabhi**, **Thulla**, **Bhabhi Dever**, or **Get Away** depending on region.
- It is a **shedding game**: get rid of all your cards.
- The **last player left holding cards is the "Bhabhi"** (the loser). Players who go out earlier are safe. The first one out is the winner.

> Naming and tone: the "Bhabhi" label is a playful loser title. The UI keeps it lighthearted (funny badge and animation), not demeaning. A "Neutral names" toggle (e.g. "Loser") can be added in settings.

### 2.2 Components
- Standard 52-card deck (A high, 2 low; suits have no ranking).
- For many players, **two decks (104 cards)** are shuffled together.

### 2.3 Setup
1. Shuffle and **deal all cards** equally around the table.
2. The player holding the **Ace of Spades (A♠)** starts the game and **must lead with it**.
3. Play proceeds **clockwise**.

### 2.4 Rounds (called "tricks" or "hands" in this document)
1. The **leader** plays any card (first trick of the game: must be A♠). The suit of this card is the **lead suit**.
2. Each next player in turn must **follow suit** if they have a card of the lead suit.
3. **Clean trick:** if everyone follows suit, the highest lead-suit card wins the trick. All played cards are **discarded out of the game** (dead pile). The winner **leads next**.
4. **Thulla (cut):** if a player has **no card of the lead suit**, they play **any card** instead. This is a **Thulla**. The trick **ends immediately** (players after them do not play).
   - The player who played the **highest lead-suit card** in that trick **picks up ALL cards on the table** into their hand.
   - That player **leads next**.
5. Ranking: **A (high) > K > Q > J > 10 > … > 2**. Off-suit cards never win.

### 2.5 Going out
- A player who has **no cards left after the trick resolves** is out and takes the next finishing position (1st, 2nd, …).
- Play continues among remaining players until **one player holds cards**, who is the **Bhabhi**.

### 2.6 Rule edge cases (engine must define these)
| Case | Default behaviour | Configurable? |
|---|---|---|
| Two decks: identical cards tie (e.g. two K♥) | **First played wins** ties | Yes (first/last) |
| Two A♠ in a 2-deck game | The holder of A♠ with the lowest seat index starts; if one player holds both, that player starts | No |
| Player plays last card in a clean trick and is highest | Out; next active player clockwise leads | No |
| Player plays last card but then must **pick up** a Thulla pile | **Not out**; they now hold cards | No |
| Player plays last card in a Thulla trick but is not the picker | Out | No |
| Leader's card is the only lead-suit card in a Thulla | Leader picks up the pile | No |
| Everyone's final cards played in the same clean trick (no one left with cards) | **Draw, no Bhabhi** | Yes (re-deal / draw) |
| Unequal deal (cards not divisible by players) | Remove random leftover cards (never A♠) so hands are equal | Yes (equal / unequal) |
| Player disconnects on their turn | Timer runs, then auto-play (lowest legal card) or bot takes over | Yes |
| Only 2 players left | Same rules; leader's card is highest lead-suit, so Thulla means leader picks up | No |

### 2.7 Deck scaling
| Players | Decks (auto) | Total cards | Cards each |
|---|---|---|---|
| 2–6 | 1 | 52 | 8–26 |
| 7–12 | 2 | 104 | 8–14 |

The host can override the deck count (1 or 2) in room settings. Leftover cards are removed or dealt unequally per the setting above.

### 2.8 Variant switches (host room settings)
- **Start rule:** Ace of Spades starts (default) / random player starts.
- **Tie rule** for duplicate cards (2-deck): first played wins / last played wins.
- **Equal hands:** on / off.
- **Match length:** single game / best of N / "play until X Bhabhi count".
- **Turn timer:** off / 15s / 30s / 60s.
- **Pick-up mode** (see section 4.4): auto pick-up / manual "tap pile to take".
- **Show who is thulla-ing:** reveal the off-suit card face-up (default) or briefly face-down then flip.

---

## 3. Core Features

### 3.1 Must-have (MVP)
| # | Feature | Notes |
|---|---|---|
| F1 | Create room and **6-character room code** | e.g. `K7QX2M`, avoid ambiguous chars (0/O, 1/I) |
| F2 | Join by code or invite link | Link pre-fills code, e.g. `/join/K7QX2M` |
| F3 | Lobby | Player list, avatars, ready toggle, host badge, room settings, copy code/link |
| F4 | 2–12 players per room | Host chooses max players |
| F5 | Full rule-correct gameplay | Server-authoritative engine |
| F6 | Legal-move highlighting | Unplayable cards dimmed, playable cards lift |
| F7 | Thulla animation | See section 5 |
| F8 | Pick-up pile animation | Cards fly into the picker's hand |
| F9 | Results screen | Finishing order, Bhabhi reveal, rematch button |
| F10 | Reconnect support | Rejoin same seat after refresh or drop |
| F11 | Responsive UI | Phones (portrait and landscape), tablets, desktop |

### 3.2 Should-have (v1.1)
- In-room **text chat** and **quick emotes/reactions** (😂 🔥 😡 👏).
- **Bots** to fill empty seats or replace disconnected players.
- **Turn timer** with auto-play.
- **Sound effects and music** with mute/volume.
- **Spectator mode** (watch a room live).
- **Kick / transfer host / lock room**.
- **Hindi / Hinglish / English** UI.
- **Themes and card backs** (classic green felt, royal red, neon dark).
- **Game history** for the current session (scoreboard across rounds).

### 3.3 Nice-to-have (v2)
- Accounts, profiles, avatars, lifetime stats, achievements.
- Public rooms lobby and quick match.
- Friends list and invites.
- Custom house-rule presets.
- Replay of the last game.
- PWA install and offline practice vs bots.

### 3.4 Added Features (v1.1)

#### 3.4.1 Last Turn (previous trick review): high priority
Players often miss what just happened, especially with 12 players and fast animations. A **Last Turn** button solves this.
- Button on the table (keyboard shortcut `L`) opens a compact overlay showing the **previous trick**: who led, every card played in order with player names, lead suit highlighted, and the outcome.
  - Clean trick: "Aman won with K♥, cards discarded."
  - Thulla: "Neha cut with 4♦. Riya had the highest ♠ (Q♠) and picked up 7 cards."
- **Mini replay:** cards re-fly in order in about 2s (skippable), so slow readers can follow along.
- Available any time, including during other players' turns; it stays until the next trick resolves.
- Stored server-side in the game snapshot, so it survives refresh and reconnect.
- Host setting: **Last trick only** (default) or **Full trick history** (scrollable list for the whole round).

#### 3.4.2 Opponent card counts: high priority
- Every opponent chip shows a **card count badge**, with a small fan of card backs on hover/long-press.
- The badge animates on change: `-1` when they play, `+N` bounce when they pick up a pile.
- **Warning states:** 3 or fewer cards pulses yellow; **1 card** shows a red "Last card!" alert; 0 shows the "OUT #n" ribbon.
- A **table-center counter** shows cards still in play (all hands combined) and cards in the dead pile.
- This is public information in a real game, so it is always shown.

#### 3.4.3 Voice chat: should-have (M3.5)
- **Audio-only** voice for everyone in the room, powered by WebRTC through an SFU (see section 6.9).
- Mic button in the table bar with three modes: **Open mic**, **Push-to-talk** (hold button or spacebar), **Muted**. Default: muted and off until the player opts in.
- **Speaking indicator:** glowing ring around the avatar of whoever is talking.
- Per-player **local mute and volume**; **Deafen** button to silence everyone.
- Host tools: **mute a player**, **mute all**, **disable voice for the room**.
- Mic test and device picker in the lobby; noise suppression and echo cancellation on by default.
- Text chat and emotes remain as a fallback; voice failure never blocks the game.

#### 3.4.4 More ideas to make the game stand out
| Feature | Description | Priority |
|---|---|---|
| **Card tracker** | A grid of all 52 cards (x2 for two decks) greyed out as they enter the dead pile; helps strategy. Host can disable for "hard mode" | Should |
| **Beginner assist** | Optional hints: highlights safest card and shows a simple "risk of picking up" meter. Off by default, can be locked off by the host | Should |
| **Tutorial and practice mode** | Interactive how-to with animated Thulla example, then a practice game vs Easy/Medium/Hard bots | Should |
| **Trick log** | Scrollable event log: "Aman led 9♠", "Neha THULLA'd with 4♦", "Riya picked up 7" | Should |
| **Fun session stats and titles** | Awards at the end: "Thulla King" (most cuts), "Card Collector" (most cards picked up), "Escape Artist" (fastest out) | Nice |
| **Shareable recap card** | Auto-generated image after the game ("I'm the Bhabhi! 😭" with the final ranking) with a WhatsApp share button | Nice |
| **Hinglish quick chat** | One-tap phrases like "Arre yaar!", "Wah bhai wah!", "Jaldi khelo!" | Nice |
| **Emote wheel with sounds** | Long-press an avatar to throw emojis with short sound effects | Nice |
| **Pause and vote tools** | Host pause, and vote to skip or bot-replace an AFK player | Should |
| **Seat options** | Choose a seat in the lobby, or shuffle seats for rematches | Nice |
| **Spectators** | Watch live with no access to hands; optional delay to prevent ghosting | Nice |
| **Haptics and sound themes** | Vibration on your turn and on Thulla; switchable sound packs | Nice |
| **Block and report** | Mute or report abusive players; host can kick | Should |

---

## 4. Detailed Requirements

### 4.1 Rooms and lobby
- Creating a room requires only a **display name** (stored in localStorage; no login).
- Room code: 6 chars, uppercase alphanumeric, collision-checked, expires after inactivity (e.g. 2 hours idle).
- Room settings (host only, locked once game starts): max players, decks, tie rule, timer, start rule, equal hands, pick-up mode, private/public, optional password.
- Host can **start** when ≥2 players are present and all non-host players are ready (or host forces start).
- Duplicate display names are auto-suffixed (`Rohit`, `Rohit (2)`).
- Late joiners during a game join as **spectators** (or wait for next round).

### 4.2 Gameplay UX
- **Table view:** oval felt table; local player always at the **bottom**; other players seated around by turn order.
- **Per-opponent chip:** avatar, name, **card count badge**, "turn" glow, "out" ribbon with finish position.
- **Center area:** current trick cards (fanned, lead suit marked), dead pile counter, lead-suit indicator.
- **Hand:** fanned at the bottom, auto-sorted by suit then rank (toggle manual sort/drag reorder).
- **Play action:** tap a card to select (lifts), tap again or drag to the center to play. Confirm-tap option to prevent mis-taps on mobile.
- **Illegal card:** shake and short toast ("You must follow ♠").
- **Turn indicator:** radial timer ring around avatar + subtle vibration/ping on your turn.
- **Pile view:** tap center pile to inspect the current trick's cards (and optionally recently picked-up cards for the picker).

### 4.3 12-player table layout
- Seats positioned on an ellipse using angle = `360° / N * index`, rotated so the local player is at 180° (bottom).
- **Desktop:** full oval, avatar chips outside the felt edge, opponents' hands shown as small fanned card backs.
- **Mobile portrait:** opponents shown as compact avatar chips in a ring/arc across the top 60% of the screen; hand pinned at the bottom 25%; center pile in the middle.
- Chips scale down as N grows (min tap target 36px); show names truncated with ellipsis.

### 4.4 "Card taking" options (pick-up behaviour)
Interpreting the requirement as options around how cards are taken after a Thulla:
1. **Auto pick-up (default):** cards fly automatically into the picker's hand.
2. **Manual pick-up:** the picker taps the pile to take it (adds drama, small timer).
3. **Pick-up preview:** show an overlay listing the cards picked (visible to all, or only to the picker).
4. **Sort after pick-up:** auto-sort hand after taking cards (toggle).
5. **Visibility of picked cards:** all players see which cards were picked (default) or only the count.

### 4.5 Timers, AFK and disconnects
- Per-turn timer (configurable). On timeout: **auto-play lowest legal card**; after 2 consecutive timeouts, the player is marked AFK and a **bot** takes over until they return.
- Disconnect: seat is held for 60–120s; if they return, they resume; otherwise bot takeover or removal (host setting).

### 4.6 Chat and social
- Text chat with profanity filter (basic), rate limit, mute individual players.
- One-tap emotes with floating animation above the sender's avatar.
- System log: "Aman played K♥", "Neha got Thulla'd 😈", "Riya picked up 7 cards".

### 4.7 Results and rematch
- Final ranking (1st … Bhabhi) with animated podium or list.
- **Bhabhi reveal** animation for the loser (see section 5).
- Buttons: **Play Again** (same room, same settings), **Back to Lobby**, **Leave**.
- Session scoreboard: wins and times as Bhabhi per player.

---

## 5. Graphics and Animation Spec

### 5.1 Art direction
- **Look:** modern, rich, slightly playful. Deep green felt (or alternative themes), soft vignette, subtle noise texture, glossy cards with soft shadows.
- **Cards:** crisp **SVG** faces (open-licensed deck or custom designed), custom card backs, large rank/suit indices readable on small phones, four-color suit option for accessibility.
- **Typography:** bold display font for impact text ("THULLA!"), clean sans for UI.
- **Avatars:** emoji/illustrated set to start; uploadable later.

### 5.2 Animation list
| Moment | Animation | Duration |
|---|---|---|
| Shuffle | Deck riffle at center | 1.0s |
| Deal | Cards fly from deck to each seat in sequence, hand fans open | 2–3s (accelerated for 12 players) |
| Your turn | Avatar glow pulse, hand lifts slightly, ring timer | continuous |
| Select card | Card lifts and scales to 1.1x with shadow | 150ms |
| Play card | Arc flight (bezier) to the table with slight random rotation, soft thud | 350ms |
| Opponent plays | Card flies from their seat to center, flips face-up | 400ms |
| Lead suit set | Suit symbol pulses at table center | 500ms |
| Clean trick | Cards collect, sweep off to the dead pile with swoosh | 600ms |
| **THULLA** | Screen micro-shake, red/orange flash vignette, big "THULLA!" text slams in with fire/spark particles, off-suit card flips with a crack effect, dramatic sound sting | 1.2–1.6s |
| **Pick-up** | All table cards gather, then fly in an arc into the picker's seat; their card count badge ticks up with a bounce; "+N cards" floating text | 900ms |
| Going out | Player's hand dissolves, "OUT #1" ribbon with confetti burst for 1st | 1.0s |
| **Bhabhi reveal** | Spotlight on the last player, comedic "BHABHI!" stamp/badge drops onto avatar, mock-sad emoji rain, trumpet sting | 2.0s |
| Winner | Confetti and gold glow on the first-out player | 2.5s |
| Emotes | Emoji floats up from avatar | 1.5s |
| Last Turn replay | Overlay slides up, previous trick's cards re-fly in order, outcome text highlights | 2.0s (skippable) |
| Card count change | Badge ticks with a bounce; `+N` floats up on pick-up; red pulse at 1 card | 400ms |
| Speaking indicator | Soft glowing ring around the avatar, scaled by voice level | continuous |

### 5.3 Technical approach
- **Framer Motion** for layout and card movement (`layoutId` for shared-element card flights between hand, table and pile).
- **CSS 3D transforms** for card flips; GPU-accelerated transforms only (`transform`, `opacity`).
- **canvas-confetti / tsParticles** (or **PixiJS** if richer fire effects are needed) for particles.
- **Howler.js** for sound with sprite sheet, preloading, and mute toggle.
- Respect **`prefers-reduced-motion`**: replace big effects with simple fades.
- Animation speed setting: Normal / Fast / Off (important for 12-player games to keep pace).
- Animation queue/orchestrator: server events are applied to the UI through a **sequential animation queue** so state and visuals never desync.

### 5.4 Performance budgets
- 60fps on mid-range phones, no layout thrash; at most ~40 animated card elements at once.
- First load JS < 300KB gzipped (code-split game table and effects); card SVGs sprite-sheeted.
- Lighthouse performance ≥ 85 on mobile.

---

## 6. Technical Architecture

### 6.1 Stack
| Layer | Choice | Why |
|---|---|---|
| Frontend | **React 18 + Vite + TypeScript** | Fast dev, typed events |
| Styling | **Tailwind CSS** | Rapid responsive layout |
| State | **Zustand** | Simple store for room and game state |
| Animation | **Framer Motion**, CSS 3D, tsParticles/PixiJS | See section 5 |
| Realtime | **Socket.IO** (client and server) | Rooms, reconnection, fallback transport |
| Backend | **Node.js + Fastify/Express + Socket.IO** | Same language as the client, share engine code |
| Game logic | Shared **pure TypeScript engine** package | Deterministic, unit-testable |
| Persistence | **Redis** (room state, TTL, Socket.IO adapter for scaling); Postgres later for accounts/stats | Fast ephemeral rooms |
| Hosting | Vercel/Netlify (web), Fly.io/Railway/Render (server), Upstash/Redis Cloud | Cheap and simple |
| Testing | Vitest (engine), Playwright (e2e), socket test harness | Rules must be bulletproof |

> Alternative: if you prefer keeping the realtime backend in PHP, Laravel Reverb + Redis can replace Node/Socket.IO. The engine would then need to be ported to PHP, and the shared-engine benefit is lost, so Node is recommended.

### 6.2 Monorepo structure
```
bhabhi-dever/
├─ apps/
│  ├─ web/            # React client
│  └─ server/         # Socket.IO game server
├─ packages/
│  ├─ engine/         # pure TS rules engine (shared types, reducers)
│  └─ shared/         # event names, zod schemas, constants
└─ docs/prd.md
```

### 6.3 Server-authoritative model
- The **server owns the game state**. Clients send **intents** (`PLAY_CARD`), the server validates them using the engine, applies them, and broadcasts **events** (not full state each time).
- **Hidden information:** each client only receives **their own hand**. Opponents' hands are sent as **counts only**. Spectators get no hands.
- Each event has a monotonically increasing `seq` number; clients detect gaps and request a **state resync** snapshot.
- Shuffle uses a **cryptographically secure RNG** (`crypto.randomInt` / Fisher-Yates).

### 6.4 Game state machine
```
LOBBY → DEALING → TRICK_LEAD → TRICK_FOLLOW ─┬→ RESOLVE_CLEAN ─┐
                      ▲                       └→ RESOLVE_THULLA ─┤
                      └──────────────────────────────────────────┘
                                   │ (one player left / none left)
                                   ▼
                              ROUND_END → (rematch) → DEALING / LOBBY
```

### 6.5 Core engine pseudocode
```ts
function playCard(state, playerId, card) {
  assert(state.turn === playerId && hand(playerId).has(card));
  if (state.trick.length === 0) {
    if (state.isFirstTrick) assert(card is AceOfSpades);
    state.leadSuit = card.suit;
  } else if (hasSuit(playerId, state.leadSuit)) {
    assert(card.suit === state.leadSuit);          // must follow suit
  }
  moveToTrick(playerId, card);

  const thulla = card.suit !== state.leadSuit;
  if (thulla) return resolveThulla(state);         // trick ends now
  if (everyActivePlayerHasPlayed(state)) return resolveClean(state);
  state.turn = nextActivePlayer(state, playerId);
}

function resolveThulla(state) {
  const picker = highestLeadSuitPlay(state.trick, state.rules.tieRule).player;
  giveAll(picker, state.trick.cards);              // pick up everything
  state.leader = picker;
  finish(state);                                   // check who is out, game over?
}

function resolveClean(state) {
  const winner = highestLeadSuitPlay(state.trick, state.rules.tieRule).player;
  state.deadPile.push(...state.trick.cards);
  state.leader = winner;                           // or next active if winner is out
  finish(state);
}
```

### 6.6 Socket event protocol (draft)
**Client → Server**
| Event | Payload |
|---|---|
| `room:create` | `{ name, settings }` |
| `room:join` | `{ code, name, sessionId }` |
| `room:updateSettings` | `{ settings }` (host) |
| `room:ready` | `{ ready }` |
| `room:start` | `{}` (host) |
| `room:kick` | `{ playerId }` (host) |
| `game:playCard` | `{ cardId }` |
| `game:takePile` | `{}` (manual pick-up mode) |
| `chat:send` | `{ text }` |
| `emote:send` | `{ emoteId }` |
| `game:requestLastTrick` | `{}` (resync of the previous trick if the client missed it) |
| `voice:join` | `{}` (requests a voice token for the room) |
| `voice:hostMute` | `{ playerId \| "all", muted }` (host) |
| `room:leave` | `{}` |

**Server → Client**
| Event | Payload |
|---|---|
| `room:state` | Lobby snapshot (players, settings, host) |
| `game:started` | Deck count, seat order, your hand |
| `game:dealt` | Deal animation script, your hand, card counts |
| `game:turn` | `{ playerId, deadline }` |
| `game:cardPlayed` | `{ playerId, card, isThulla }` |
| `game:trickClean` | `{ winnerId, cards }` |
| `game:trickThulla` | `{ pickerId, cards }` |
| `game:playerOut` | `{ playerId, position }` |
| `game:over` | `{ ranking, bhabhiId }` |
| `game:snapshot` | Full personalized state (on reconnect/resync) |
| `chat:message` / `emote:received` | Message data |
| `game:lastTrick` | `{ leaderId, plays: [{ playerId, card }], outcome: "clean" \| "thulla", winnerId?, pickerId?, pickedCount? }` |
| `game:counts` | `{ hands: { [playerId]: number }, deadPile: number }` (sent after every resolved play) |
| `voice:token` | `{ url, token, expiresAt }` (short-lived, scoped to this room) |
| `voice:hostMuted` | `{ playerId \| "all", muted }` |
| `error` | `{ code, message }` (e.g. `ILLEGAL_MOVE`, `NOT_YOUR_TURN`) |

### 6.7 Identity and sessions
- Anonymous `sessionId` (UUID) stored in localStorage; the server maps it to a seat for reconnection.
- Optional room password. Rate limit joins per IP to prevent code brute-forcing (6 chars ≈ 887M combos with a 30-char alphabet).

### 6.8 Security and fair play
- Never send other players' cards to a client.
- Validate every intent server-side; ignore out-of-turn actions.
- Rate limit chat/emotes; sanitize all text; CORS lock-down; HTTPS/WSS only.
- Room cleanup job for idle and finished rooms.

### 6.9 Voice chat architecture
- **Do not use a peer-to-peer mesh.** With 12 players each client would need 11 upload and 11 download connections, which breaks on phones. Use an **SFU** (Selective Forwarding Unit): each client uploads one stream and downloads the others from the server.
- **Recommended:** **LiveKit** (open-source, self-hostable, with a cloud option and a React SDK). Alternatives: mediasoup (self-built), Daily or Agora (managed).
- The game server issues a **short-lived token** (`voice:token`) only to players seated in that room; the voice room id equals the game room id.
- **Audio only**, Opus codec at about 24-32 kbps, with echo cancellation, noise suppression and auto gain.
- **Bandwidth estimate:** 12 speakers x 11 listeners x 32 kbps is about 4.2 Mbps of server egress for a full room; each client downloads about 350 kbps worst case. Forwarding only active speakers cuts this a lot.
- **Speaking detection** comes from the SFU's active-speaker events and drives the avatar ring in the UI.
- **Browser rules:** joining voice must happen from a user gesture (iOS Safari audio policy); show a clear permission prompt and a listen-only fallback if the mic is denied.
- **Moderation and privacy:** host can mute players or disable voice; every player can locally mute others; **no recording or storage** of audio; a short privacy notice is shown on first use.
- Voice is fully **decoupled from game logic**: if the voice service is down, the game keeps working and the UI shows "Voice unavailable".

---

## 7. UX Flows and Screens

1. **Landing:** logo, "Create Room", "Join Room", How to Play, settings.
2. **Create/Join modal:** name input, room code input (auto-uppercase, paste support), avatar picker.
3. **Lobby:** big room code with copy/share button (WhatsApp share link!), player grid, ready states, host settings drawer, chat.
4. **Game table:** as per section 4.2 and 4.3, with menu (sound, speed, leave, rules reference).
5. **Results:** ranking, Bhabhi reveal, rematch.
6. **How to Play:** interactive mini-tutorial with the Thulla rule explained in 4–5 steps and an animated example.

> The **WhatsApp share button** matters: the typical audience coordinates through WhatsApp groups.

---

## 8. Non-Functional Requirements
| Area | Requirement |
|---|---|
| Latency | Action to broadcast < 150ms p95 in-region |
| Capacity | 500+ concurrent rooms on a small instance (v1 target), horizontally scalable via Redis adapter |
| Availability | Reconnect within 2 minutes restores the seat |
| Browser support | Latest 2 versions of Chrome, Safari (iOS 15+), Firefox, Edge |
| Accessibility | Keyboard play on desktop, ARIA labels on cards, color-blind-safe suit mode, reduced-motion support, minimum contrast AA |
| Privacy | No personal data required; no tracking beyond basic anonymous analytics |
| i18n | English first, Hindi/Hinglish strings externalized |

---

## 9. Analytics and Success Metrics
- **Activation:** % of room creators who start a game.
- **Retention:** rematch rate (target > 60%), D7 return.
- **Engagement:** average players per room (target ≥ 6), games per session.
- **Quality:** reconnect success rate (> 95%), error rate on `ILLEGAL_MOVE` (should be near 0 from the UI), crash-free sessions.

---

## 10. Milestones

| Phase | Scope | Est. |
|---|---|---|
| **M0 — Foundations** | Monorepo, engine with full rules + exhaustive unit tests (incl. 2-deck, ties, out-edge cases), simulation of 10,000 bot games for validation | 1 week |
| **M1 — Multiplayer MVP** | Rooms, codes, lobby, server state machine, basic table UI (no fancy animation), reconnect | 1–2 weeks |
| **M2 — Look & feel** | Card art, table layouts for 2–12 players, full animation set (deal, play, Thulla, pick-up, Bhabhi), sound | 2 weeks |
| **M3 — Polish** | Chat/emotes, Last Turn review, card-count states, card tracker, timers, bots, host tools, settings, themes, tutorial, i18n | 1–2 weeks |
| **M3.5 — Voice** | LiveKit (or chosen SFU) integration, token endpoint, mic modes, speaking rings, host mute tools, mobile browser testing | 1 week |
| **M4 — Launch** | Load testing, accessibility pass, deployment, analytics, PWA, feedback loop | 1 week |

---

## 11. Risks and Mitigations
| Risk | Mitigation |
|---|---|
| Rule variants differ by family/region | Host-configurable rules; clear in-app rules reference |
| 12-player UI crowded on phones | Compact chips, arc layout, tap-to-expand player info, fast animation mode |
| Animation lags with many cards | Cap simultaneous elements, GPU transforms only, "Fast/Off" animation setting |
| Desync between animation and state | Server `seq` numbers, animation queue, snapshot resync |
| Players dropping mid-game | Bot takeover, seat holding, host can remove |
| Abuse in chat | Filter, rate limit, mute, host kick |
| Voice quality and cost at 12 players | Use an SFU, audio-only Opus, active-speaker forwarding; start on a free/cheap tier and self-host later if needed |
| Mic permission and autoplay problems on iOS/Android browsers | Join voice from a user gesture, clear permission UI, listen-only fallback, test on real devices |
| Voice abuse | Host mute/disable, local mute per player, block and report, no recording |
| Card art licensing | Use open-licensed deck or original artwork; verify licenses |

---

## 12. Assumptions and Open Questions
Please confirm or correct these. Defaults are in bold.

1. **Thulla ends the trick immediately** and the highest lead-suit player picks up everything (the standard rule).
2. **A♠ starts** the first trick (vs. random start).
3. **2 decks** for 7+ players, with **equal hands** by removing leftover cards.
4. **Ties between identical cards:** **first played wins**.
5. **"Card taking options"** are interpreted as pick-up behaviour options (auto/manual, preview, visibility); please clarify if you meant something else (e.g. a choice to take cards voluntarily).
6. **First player out = winner**, last player holding cards = **Bhabhi**; the game continues until one player is left.
7. **No login in v1**: name and room code only.
8. **Both players finishing at once** (no one left with cards): **draw, no Bhabhi**.
9. Is **"Dever"** meant as a special title (e.g. the winner is called "Dever") in your family's version? If so, we can add that to the results screen.
10. Backend preference: **Node + Socket.IO** (recommended) vs. Laravel Reverb.
11. Voice provider: **LiveKit** (recommended, self-host or cloud) vs. a managed service such as Daily or Agora. Is a small monthly cost acceptable, or must voice be fully free?
12. Voice default: **off until the player opts in**, with push-to-talk available. Should open mic be the default for private rooms?
13. Last Turn: **last trick only** by default, with full history as a host option. Should the history also be visible to spectators?
14. Card tracker and beginner assist: **allowed by default**, host can disable them for a stricter game. Is that the right default?

---

## 13. Appendix

### 13.1 Card identity
Each physical card has a unique id so two-deck duplicates are distinguishable: `"{deckIndex}-{suit}{rank}"`, e.g. `0-SA`, `1-SA` (two Aces of Spades).

### 13.2 Test plan highlights
- Unit: follow-suit validation, tie rules, pick-up/out transitions, leader selection after out, start-card rule with two A♠.
- Property-based: card conservation (cards in hands + trick + dead pile = total) across thousands of random bot games; every game terminates.
- Integration: socket flows for create → join → start → full game → rematch, including mid-game disconnect/reconnect.
- E2E (Playwright): 4–6 simulated browser clients play a full game; visual regression on the table for 2, 6, and 12 players.

### 13.3 Glossary
| Term | Meaning |
|---|---|
| Bhabhi | The loser, the last player holding cards |
| Dever | Playful counterpart title (e.g. the winner), optional |
| Thulla | Playing an off-suit card because you cannot follow the lead suit |
| Trick / hand | One round of cards played on the table |
| Lead suit | Suit of the first card played in a trick |
| Dead pile | Discarded cards after clean tricks, out of play |
| Pick-up | Taking all table cards into your hand after a Thulla |