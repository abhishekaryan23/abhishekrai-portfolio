# Akhada: a 2.5D power fighter (third game on abhishekrai.dev/game/akhada/)

Inspired by the *feel* of LF2/NTSD-style brawlers (free 2.5D arena, HP + energy bars,
input-sequence specials, screen-filling ultimate moves). All characters, names and art are
original or drawn from Indian mythology and history; nothing is taken from Naruto.

## Status (built)
Live at /game/akhada/. 14 fighters (12 + Ghatotkacha and Barbarik, hidden until Arcade is finished),
4 stages, Arcade / Versus / Team battle / Training. Chakra: specials 80-190, Hell 400, Awakened 500 of a
500 bar; passive refill is tiny, hold J+K+L (P2 1+2+3, touch Charge) to charge. Balance rules: stagger
(4th non-knockdown hit knocks down), Escape (Defend while hit, 100 chakra), no hits on down/getup, corner
push-back, ground-only earth/floor attacks, juggle height cap, control-effect immunity, Fair fight
(500 HP for all, Hell damage cap 150/190, size-based damage taken). CPU-vs-CPU round-robin under Fair
fight: every fighter between 38% and 60% wins. The sections below are the original plan.

## Modes
| Mode | Who | Notes |
|---|---|---|
| **Arcade** | 1 player vs CPU (or 2 players together as a team) | 6 fights across the 4 stages, ends with Ashwatthama then Jatayu. |
| **Versus** | 1P vs CPU, or P1 vs P2 on one keyboard | Pick both fighters and the stage. Best of 3 rounds. |
| **Team clash** | P1 + P2 vs 2 CPU, or 2v2 with CPU partners | Same keyboard. |

CPU difficulty: Normal, **Hard (default)**, Legend. Hard CPU blocks on reaction, punishes
whiffed moves, jumps projectiles, spaces itself, mixes up combos, saves Hell moves for a hit.

## Controls (one keyboard, two players)
| | Move | Attack | Jump | Defend | Hell |
|---|---|---|---|---|---|
| Player 1 | W A S D | J | K | L | (combo) |
| Player 2 | Arrows | 1 (or ,) | 2 (or .) | 3 (or /) | (combo) |

* Double-tap a direction to run. Attack while running = dash strike; jump while running = long leap.
* **Specials:** tap Defend, then a direction, then Attack or Jump (D→A, D↓A, D↑A, D→J, D↓J). Cost energy.
* **Hell moves are input combos, NTSD style, and each one is a super combo** (a scripted multi-hit
  sequence with a finisher):
  * **Hell 1: Defend, Forward, Jump, Attack** (D→JA). Costs 250 energy.
  * **Awakened Hell: Defend, Up, Jump, Attack** (D↑JA). Costs 350 energy, unlocks below 30% HP
    (Legends can use it at any HP). Screen darkens, name card flashes, the move fills the arena.
  * **Super combo chains:** a special that lands can be cancelled straight into a Hell move, and during a
    Hell sequence, tapping Attack on the beat (the fighter flashes) adds extra hits, up to 3.
* Touch screens: stick + Attack, Jump, Defend, Hell buttons, plus Special (Special + stick direction = that special) and Hell (Hell = Hell 1, Hell + up = Awakened) buttons, so nobody has to type sequences on glass.

## Bars
HP (red) · Energy (blue, max 500, slowly refills, fills faster when you hit or get hit).

## Roster: 12 fighters (6 from Rollback Street + 4 new + 2 Legends)

| # | Fighter | Element | D→A | D↓A | D↑A | D→J | D↓J |
|---|---|---|---|---|---|---|---|
| 1 | **Rai** | Prana (spirit energy) | Prana Blast | Rolling Kick | Rising Dragon | Shoulder Dash | Focus (refills energy) |
| 2 | **Kai** | Lightning | Bijli Bolt | Thunder Call (bolt drops on foe) | Lightning Kick | Flash Step (blink behind) | Charge (next hits stun) |
| 3 | **Raghav** | Kalari blade | Urumi Lash (whip-sword) | Marma Strike (paralyses) | Leaping Tiger | Tiger Pounce | Counter stance |
| 4 | **Cheel** | Wind, kites | Kite Swarm (homing) | Manjha Wire (trap) | Updraft | Glide | Gust (push back) |
| 5 | **Bhola** | Earth | Boulder Toss | Ground Slam (shockwave) | Rock Pillar | Bull Rush | Iron Body (no flinch) |
| 6 | **Mr. Rollback** | Time | Clock Blade | Freeze Frame | Rewind Kick | Rewind (back 2 s, heals) | Slow Field |
| 7 | **Surya** (new) | Fire, sun | Agni Ball | Fire Trail | Flame Pillar | Blaze Dash | Sun Charge |
| 8 | **Hima** (new) | Ice | Frost Shard (freezes) | Ice Spikes | Ice Column | Ice Slide | Ice Wall |
| 9 | **Jogi** (new) | Serpents, poison | Cobra Strike | Poison Cloud | Rising Naag | Snake Slither | Been flute (reverses foe's controls) |
| 10 | **Meera** (new) | Sound, dance | Ghungroo Ring | Chakkar Spin | Tatkar Rise | Spin Step | Rhythm (faster) |
| 11 | **Ashwatthama** (Legend) | Divine weapons | Astra Arrow | Arrow Rain | Gem Flash (blinds) | Warrior's Charge | Immortal (regenerates) |
| 12 | **Jatayu** (Legend, strongest) | Sky king | Feather Blades | Wing Storm (tornado) | Sky Lift | Talon Dive | Sun Wings (flight, brief immunity) |

### Hell moves (super combos)
| Fighter | Hell 1: D→JA | Awakened: D↑JA (below 30% HP) |
|---|---|---|
| Rai | **Garuda Strike**: 5-hit dash flurry, launch, a golden energy eagle swoops through | **Prana Nova**: charges a giant prana sphere that detonates |
| Kai | **Indra's Storm**: seven lightning columns walk across the arena | **Vajra Rush**: 12 lightning-speed dash hits back and forth |
| Raghav | **Hundred Marma**: teleporting flurry on a frozen foe | **Urumi Cyclone**: a spinning whip-sword vortex |
| Cheel | **Thousand Kites**: the sky fills with diving kites | **Manjha Web**: glass-coated strings criss-cross the arena and snap |
| Bhola | **Bhookamp**: earthquake, rock spires erupt along the floor | **Pehelwan's Pride**: grab, three suplexes, a crater slam |
| Mr. Rollback | **Total Rollback**: time stops in sepia, 5 hits land at once | **Final Commit**: a giant clock face; his last moves replay all at once |
| Surya | **Surya Grahan**: an eclipse, then a sun beam from the sky | **Agni Varsha**: a rain of fire across the arena |
| Hima | **Himalaya Avalanche**: a wall of ice and snow crosses the arena | **Eternal Winter**: everything freezes, then shatters |
| Jogi | **Naag Lok**: a giant cobra rises and strikes three times | **Hundred Hoods**: cobras burst from the ground everywhere |
| Meera | **Tandava**: a whirling dance, shockwave rings fill the arena | **Ghungroo Thunder**: a sonic boom that launches everyone |
| Ashwatthama | **Brahmastra**: the screen turns white, a blast that hits everyone | **Narayanastra**: an endless rain of divine weapons; only a fighter who holds Defend (lays down arms) is spared |
| Jatayu | **Pankh Pralay**: wing hurricane, feather blades, talon combo | **Last Flight**: soars to the sun and crashes down in fire and feathers (Jatayu can use it at any HP) |

Legends have more HP and stronger moves; CPU Legends are the final arcade fights.
Jatayu is from the Ramayana: the vulture king who fought Ravana to save Sita.
Ashwatthama is from the Mahabharata: the warrior who can never die, a man and not a god.

## Stages (4, all in India, all new)
1. **Varanasi Ghats at dawn**: temple steps, the Ganga, wooden boats, diyas floating, bells.
2. **Thar Desert Fort**: sandstone ramparts at sunset, camels, drifting sand.
3. **Kerala Backwaters**: a houseboat jetty, coconut palms, monsoon rain.
4. **Himalayan Monastery**: snow, prayer flags snapping in the wind, the high peaks.

## Art (OpenArt GPT Image 2.5 Flare, same 8-bit style as Rollback Street)
* New fighters: reference → 12-pose sheet → 8-frame walk.
* Every fighter (12): an 8-pose **powers** sheet: defend, run, cast forward, summon up,
  ground strike, dash strike, charge up, hell pose.
* Hell move art: 12 effect sheets on black (drawn with additive glow) or green (solid things like the cobra or rocks).
* Projectile sheet: energy ball, fireball, ice shard, kite, cobra, clock blade, sound ring, arrow, feather, boulder…
* Stages: one 21:9 pixel panorama each.
* Everything quantised to 256 colours and loaded per fight. Target well under 1.5 MB for a whole match.

## Build
`public/game/akhada/` (index.html, akhada.js, frames.js, sprites/), shared `arcade.js` + `style.css`
for full screen, touch pad, iPad fixes. Static files only, so it stays on the free Cloudflare plan.
Validated with Fable before publishing.
