/* Rollback City: fighters and attacks.
   A plain script that shares globals with the others; index.html loads them in order. */
"use strict";

/* ---------- fighters ---------- */
const KINDS = {
  rai:       { hp: 70, speed: 1.35, scale: 1, name: "Rai" },
  nani:      { hp: 1, speed: 0, scale: 0.94, name: "Nani" },
  kai:       { hp: 70, speed: 1.35, scale: 1, name: "Kai" },
  grunt:     { hp: 22, speed: 0.85, scale: 1, name: "Goonda", score: 100, windup: 14, cool: [50, 90], moves: ["ePunch", "ePunch", "eKick"] },
  pipeGrunt: { hp: 24, speed: 0.85, scale: 1, name: "Lathi", score: 150, windup: 16, cool: [60, 100], moves: ["ePunch", "eKick"], weapon: "pipe" },
  kicker:    { hp: 26, speed: 1.05, scale: 1, name: "Kicker", score: 200, windup: 12, cool: [45, 80], moves: ["eKick", "eKick", "ePunch"], fly: true },
  thrower:   { hp: 20, speed: 0.9, scale: 1, name: "Knife", score: 250, windup: 16, cool: [80, 120], moves: ["ePunch"], ranged: true },
  bruiser:   { hp: 46, speed: 0.65, scale: 1.18, name: "Bruiser", score: 300, windup: 20, cool: [70, 110], moves: ["heavy"] },
  ox:        { hp: 300, speed: 0.8, scale: 1.4, name: "Bhola the Ox", score: 2000, windup: 16, cool: [36, 64], moves: ["heavy", "heavy", "ePunch"], specials: ["charge"], poise: 40, boss: true },
  rook:      { hp: 280, speed: 1.3, scale: 1.22, name: "Raghav", score: 2500, windup: 11, cool: [28, 52], moves: ["eKick", "eKick", "ePunch"], specials: ["eRoll"], poise: 34, boss: true },
  crane:     { hp: 290, speed: 1.15, scale: 1.15, name: "Cheel", score: 3000, windup: 13, cool: [32, 56], moves: ["eKick", "ePunch"], specials: ["dive", "fan"], poise: 36, boss: true },
  // Raghav and Cheel join once beaten, like Chin and Ranzou in Double Dragon: same look,
  // player-sized, the boss's power on Special, but less health than Rai and Kai and one life (guest)
  pOx:       { hp: 90, speed: 1.1, scale: 1.16, name: "Bhola", look: "ox", heavy: 2, sturdy: 5, guest: true },   // retired: not in ROSTER
  pRook:     { hp: 52, speed: 1.5, scale: 1.04, name: "Raghav", look: "rook", guest: true },
  pCrane:    { hp: 50, speed: 1.45, scale: 1.02, name: "Cheel", look: "crane", jump: 6.3, guest: true },
  pRollback: { hp: 96, speed: 1.0, scale: 1.2, name: "Ranjit", look: "rollback", heavy: 2, sturdy: 4, guest: true },   // retired: not in ROSTER
  // Act 2: Kaal Group's security, the police, the Mandi's Tola Gang, Bhola's wrestlers
  kaal:      { hp: 30, speed: 0.95, scale: 1, look: "grunt", name: "Kaal Security", score: 250, windup: 13, cool: [45, 80], moves: ["ePunch", "eKick", "ePunch"], fly: true, guard: 0.3, cash: 40 },
  constable: { hp: 34, speed: 0.8, scale: 1.02, look: "pipeGrunt", name: "Constable", score: 0, windup: 15, cool: [55, 95], moves: ["ePunch", "eKick"], weapon: "pipe", keepWeapon: true, police: true },
  riot: { hp: 50, speed: 0.7, scale: 1.06, look: "pipeGrunt", name: "Riot police", score: 0, windup: 18, cool: [60, 100], moves: ["ePunch", "eKick"], weapon: "pipe", keepWeapon: true, police: true, shield: true },
  catcher:   { hp: 22, speed: 0.95, scale: 1, look: "netman", name: "Dog catcher", score: 100, windup: 15, cool: [55, 90], moves: ["ePunch", "eShove"], lob: "net", coward: true, cash: 0 },   // the municipal dog squad, after Moti
  arsonist:  { hp: 24, speed: 1.05, scale: 1, look: "kaal", name: "Arsonist", score: 200, windup: 13, cool: [45, 80], moves: ["ePunch", "eShove", "eKick"], cash: 20 },   // Kaal's men with the cans, the night of the Second Fire
  porter:    { hp: 24, speed: 1.0, scale: 0.98, look: "grunt", name: "Porter", score: 150, windup: 13, cool: [50, 85], moves: ["ePunch", "ePunch", "eKick"], lob: "sack", cash: 25 },
  wrestler:  { hp: 60, speed: 0.75, scale: 1.06, look: "bruiser", name: "Pehelwan", score: 400, windup: 16, cool: [50, 85], moves: ["heavy", "ePunch"], sturdy: 4, cash: 0 },
  // Act 2, second half: Kinara's Neon Saanp and DJ Rewind, the docks crews and Machhi Mausi, Inspector Godbole
  biker:     { hp: 30, speed: 1.05, scale: 1, look: "grunt", name: "Neon Saanp", score: 250, windup: 13, cool: [45, 80], moves: ["eChain", "ePunch", "eKick"], cash: 35 },
  spinner:   { hp: 22, speed: 0.95, scale: 1, look: "grunt", name: "Record thrower", score: 250, windup: 16, cool: [80, 120], moves: ["ePunch"], ranged: true, shot: "record", cash: 30 },
  breaker:   { hp: 26, speed: 1.15, scale: 1, look: "grunt", name: "B-boy", score: 250, windup: 11, cool: [40, 70], moves: ["eSweep", "eKick", "eSweep"], fly: true, cash: 30 },
  netman:    { hp: 28, speed: 0.95, scale: 1, look: "grunt", name: "Net man", score: 200, windup: 14, cool: [50, 85], moves: ["ePunch", "eKick"], lob: "net", cash: 25 },
  hookman:   { hp: 40, speed: 0.8, scale: 1.05, look: "bruiser", name: "Boathook", score: 300, windup: 15, cool: [55, 90], moves: ["ePunch", "eKick"], weapon: "pipe", keepWeapon: true, pull: true, cash: 30 },
  djrewind:  { hp: 300, speed: 1.1, scale: 1.15, look: "grunt", name: "DJ Rewind", score: 3500, windup: 12, cool: [30, 54], moves: ["eKick", "ePunch", "eKick"], specials: ["eRoll", "fan"], shot: "record", poise: 36, boss: true, cash: 300 },
  mausi:     { hp: 320, speed: 0.85, scale: 1.12, look: "bruiser", name: "Machhi Mausi", score: 3000, windup: 14, cool: [34, 60], moves: ["eSlap", "heavy", "ePunch"], specials: ["charge", "pound"], poise: 40, boss: true, cash: 0 },
  godbole:   { hp: 380, speed: 0.95, scale: 1.08, look: "pipeGrunt", name: "Inspector Godbole", score: 4000, windup: 13, cool: [32, 56], moves: ["ePunch", "eKick", "heavy"], specials: ["charge", "whistle"], poise: 44, boss: true, police: true, cash: 0 },
  netagoon:  { hp: 34, speed: 0.85, scale: 1.04, look: "pipeGrunt", name: "Netaji's man", score: 250, windup: 14, cool: [50, 85], moves: ["eShove", "ePunch", "eShove"], cash: 60 },
  fakecop:   { hp: 26, speed: 0.85, scale: 1, look: "pipeGrunt", name: "Fake constable", score: 200, windup: 15, cool: [55, 90], moves: ["ePunch", "eKick"], weapon: "pipe", cash: 40, coward: true },
  tola:      { hp: 330, speed: 0.75, scale: 1.18, look: "ox", name: "Tola", score: 3000, windup: 16, cool: [34, 60], moves: ["heavy", "heavy", "ePunch"], specials: ["charge", "pound"], poise: 42, boss: true, cash: 300 },
  rollback:  { hp: 480, speed: 0.85, scale: 1.45, name: "Mr. Rollback", score: 5000, windup: 15, cool: [32, 56], moves: ["heavy", "ePunch"], specials: ["charge", "pound", "fan"], poise: 44, boss: true }
};
// frames total, active window, reach, damage, knockdown; rearm = hit again every n frames
const ATK = {
  jab:      { len: 13, a0: 3, a1: 6, reach: 24, dmg: 4, sfx: 520, chain: true },
  jab2:     { len: 13, a0: 3, a1: 6, reach: 24, dmg: 4, sfx: 560, chain: true },
  upper:    { len: 24, a0: 6, a1: 10, reach: 24, dmg: 8, knock: true, lift: 5, sfx: 330 },
  spinheel: { len: 26, a0: 8, a1: 13, reach: 32, dmg: 9, knock: true, sfx: 300 },
  kick:     { len: 20, a0: 6, a1: 10, reach: 30, dmg: 6, sfx: 440, chain: true },
  round:    { len: 24, a0: 7, a1: 12, reach: 32, dmg: 8, knock: true, sfx: 360 },
  elbow:    { len: 16, a0: 3, a1: 7, reach: 24, dmg: 7, back: true, sfx: 280 },
  tackle:   { len: 22, a0: 2, a1: 16, reach: 22, dmg: 8, knock: true, move: 2.6, sfx: 240 },
  kroll:    { len: 40, a0: 3, a1: 37, reach: 26, dmg: 4, rearm: 8, knockAfter: 30, move: 3.4, sp: 25, sfx: 400 },
  roll:     { len: 36, a0: 3, a1: 33, reach: 26, dmg: 5, rearm: 8, knockAfter: 26, move: 3, sp: 30, sfx: 420 },
  pipe:     { len: 22, a0: 7, a1: 11, reach: 36, dmg: 9, knock: true, sfx: 260 },
  toss:     { len: 18, a0: 99, a1: 99, spawn: 7, sfx: 600 },
  knee:     { len: 16, a0: 5, a1: 8, reach: 20, dmg: 5, sfx: 300 },
  // airborne
  jkick:    { reach: 28, dmg: 8, knock: true, sfx: 380 },
  flykick:  { reach: 32, dmg: 10, knock: true, sfx: 340 },
  cyclone:  { reach: 28, dmg: 5, both: true, rearm: 8, knockAfter: 24, sp: 25, sfx: 460 },
  dragon:   { reach: 24, dmg: 18, knock: true, lift: 6, sp: 40, poiseBreak: true, sfx: 250 },
  // enemies
  flurry:   { len: 32, a0: 3, a1: 29, reach: 30, dmg: 3, rearm: 6, knockAfter: 26, move: 0.8, sp: 25, sfx: 520 },
  rush:     { len: 50, a0: 2, a1: 48, reach: 24, dmg: 10, knock: true, move: 3.2, sp: 30, sfx: 180 },
  quake:    { len: 40, a0: 99, a1: 99, spawn: 18, sp: 40, sfx: 120 },
  chakra:   { len: 18, a0: 99, a1: 99, spawn: 6, sfx: 700 },
  ePunch:   { len: 16, a0: 4, a1: 7, reach: 22, dmg: 5, sfx: 480 },
  eKick:    { len: 20, a0: 6, a1: 10, reach: 28, dmg: 6, sfx: 420 },
  heavy:    { len: 26, a0: 8, a1: 12, reach: 28, dmg: 9, knock: true, sfx: 220 },
  charge:   { len: 80, a0: 0, a1: 80, reach: 22, dmg: 11, knock: true, sfx: 180 },
  eRoll:    { len: 40, a0: 3, a1: 37, reach: 24, dmg: 5, rearm: 10, knockAfter: 30, move: 3.1, sfx: 400 },
  pound:    { len: 44, a0: 99, a1: 99, spawn: 20, sfx: 120 },
  fan:      { len: 26, a0: 99, a1: 99, spawn: 10, sfx: 640 },
  eToss:    { len: 22, a0: 99, a1: 99, spawn: 10, sfx: 640 },
  // signature moves (Phase 3): each gang fights like what it is
  eSweep:   { len: 22, a0: 8, a1: 12, reach: 30, dmg: 5, knock: true, low: true, sfx: 300 },   // the b-boy's floor sweep: jump it
  eChain:   { len: 26, a0: 10, a1: 14, reach: 40, dmg: 7, sfx: 260 },                          // the biker's chain, long reach
  eShove:   { len: 18, a0: 6, a1: 9, reach: 26, dmg: 2, push: 26, sfx: 200 },                    // Netaji's men clear the road
  eSlap:    { len: 28, a0: 11, a1: 15, reach: 40, dmg: 9, knock: true, lift: 4.6, sfx: 180 },  // Mausi's pomfret slap
  whistle:  { len: 34, a0: 99, a1: 99, spawn: 14, sfx: 2600 },                                  // Godbole calls for backup
  eFly:     { reach: 28, dmg: 7, knock: true, sfx: 380 },
  dive:     { reach: 26, dmg: 12, knock: true, sfx: 300 }
};
// what Special does for each fighter on the ground: [attack, SP cost, label]
const SPECIALS = { rai: ["roll", 30, "Rolling kick"], kai: ["flurry", 25, "Lightning kicks"], pOx: ["rush", 30, "Bull rush"], pRook: ["kroll", 25, "Kalari roll"], pCrane: ["dive", 25, "Kite dive"], pRollback: ["quake", 40, "Mill quake"] };
const ROSTER = [["rai", "Rai"], ["kai", "Kai"], ["pRook", "Raghav"], ["pCrane", "Cheel"]];
const UNLOCK_BY = { rook: "pRook", crane: "pCrane" };
const AIR = new Set(["jkick", "flykick", "cyclone", "dragon", "eFly", "dive"]);
