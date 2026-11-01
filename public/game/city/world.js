/* Rollback City: the world graph.
   A plain script that shares globals with the others; index.html loads them in order.

   The city is a graph of streets (DESIGN 3.1). Each street is a long strip with the usual depth
   band; its theme picks the background painter (street, subway, roof, factory) and its look
   tunes that painter. Junctions join streets: walk into one (up into an alley or gate at the back
   of the band, down towards the viewer at the front) and you turn into the linked street, at its
   junction that leads back. Doors open single-screen interiors. Arenas are scripted fights that
   lock the camera until they are cleared. tier is how hard the street's goondas are (0 to 3). map is the street's line on the paper map,
   [x0, y0, x1, y1] in map units (120 by 64), west end first; an interior has mapOn, the street
   whose door it is behind. spawn says who roams a street, how many at once, how
   often one turns up and when (the spawner in flow.js); civs is how many passers-by are about. */
"use strict";

const WORLD = {
  districts: {
    chandni: { name: "Chandni Lane", streets: ["lane", "gali", "mandiGate"] }
  },
  streets: {
    lane: {
      name: "Chandni Lane", district: "chandni", w: 2400, theme: "street", map: [20, 36, 70, 36],
      // shops all the way, Nani's dhaba is building 9 (x 1152 to 1280), the middle of the lane
      look: { dhaba: 9 },
      links: [{ x: 620, to: "roofs", verb: "Climb to the roofs", needs: "1-3" }],
      junctions: [
        { x: 270, to: "gali", dir: "up", label: "Back Gali", needs: "1-1", shut: "First, the clues on the lane" },
        { x: 2290, to: "mandiGate", dir: "up", label: "Mandi Gate", gate: "CHANDNI MANDI", needs: "1-1", shut: "First, the clues on the lane" },
        { x: 1700, to: "bunderRoad", dir: "down", label: "Bunder Road", needs: "1-2", shut: "Bhola first: he has the lane's shops on his truck" }
      ],
      doors: [{ x: 1256, to: "dhaba", label: "Nani's Dhaba" }, { x: 1130, to: "clinic", label: "Dr. Mehta's clinic", needs: "1-6" },
        // the shops (signs count on from the dhaba): open 9 to 9 from Act 2
        { x: 1386, to: "chaiShop", shop: true, needs: "1-6" }, { x: 1514, to: "sweetShop", shop: true, needs: "1-6" },
        { x: 1642, to: "paanShop", shop: true, needs: "1-6" }, { x: 1770, to: "tailorShop", shop: true, needs: "1-6" }, { x: 1898, to: "kiranaShop", shop: true, needs: "1-6" }],
      barrels: [[620, 172, "food"], [1500, 196, "pipe"], [1980, 170, "drink"], [831, 152, "food", "hydrant"], [1727, 152, "oneup", "hydrant"]],
      props: [{ x: 1072, kind: "fruitcart" }, { x: 1600, kind: "dustbin" }, { x: 2110, kind: "fruitcart" }, { x: 420, kind: "dustbin" }, { x: 2050, kind: "pco" }, { x: 930, kind: "teastall" }],
      cat: 1330, patrol: true,
      parked: [{ id: "bike", kind: "bicycle", x: 2180, y: 168, needs: "1-6" }],   // unlocked, outside the chemist
      npcs: [{ look: "civ_a", base: 4, x: 700, y: 158, needs: "1-6", hours: [8, 20] }],
      talk: [{ x: 700, label: "A respectable uncle", act: (x) => busFareUncle(x), needs: "1-6", hours: [8, 20] }],
      spawn: { kinds: ["grunt", "grunt", "pipeGrunt", "kicker"], cap: 3, every: 540, when: "night" }, civs: 4
    },
    gali: {
      name: "Back Gali", district: "chandni", w: 1600, theme: "street", map: [22, 24, 52, 24],
      // a narrow lane of houses behind the shops: no road, washing overhead
      look: { narrow: true },
      junctions: [{ x: 210, to: "lane", dir: "down", label: "Chandni Lane" }],
      barrels: [[560, 170, "drink"], [1180, 192, "food"]], letter: [0, 1380, 176],
      spawn: { kinds: ["grunt", "kicker", "thrower"], cap: 3, every: 600, when: "night" }, civs: 3
    },
    mandiGate: {
      name: "Mandi Gate", district: "chandni", w: 1800, theme: "street", map: [74, 26, 100, 16],
      // the wholesale market's godowns, numbered from the gate
      look: { wareFrom: 0, godown: 1 },
      junctions: [{ x: 130, to: "lane", dir: "down", label: "Chandni Lane" },
        { x: 1700, to: "ghat", dir: "up", label: "Mandi Ghat", needs: "1-4", shut: "The ghat gate is chained shut tonight" },
        { x: 1000, to: "mandiRoad", dir: "down", label: "The Mandi", needs: "1-6", shut: "The mandi's gates are locked tonight" }],
      barrels: [[700, 194, "pipe"], [1300, 168, "food"], [1610, 152, "drink", "hydrant"]],
      props: [{ x: 560, kind: "dustbin" }, { x: 980, kind: "fruitcart" }, { x: 1450, kind: "dustbin" }, { x: 1200, kind: "teastall" }, { x: 832, kind: "stones", hours: [8, 19] }], patrol: true,
      npcs: [{ look: "civ_c", base: 0, x: 800, y: 158, needs: "1-6", hours: [8, 19] }],
      talk: [{ x: 812, label: "Lucky stones", act: (x) => luckyStones(x), needs: "1-6", hours: [8, 19] }],
      spawn: { kinds: ["grunt", "bruiser", "pipeGrunt", "kicker"], cap: 4, every: 480, when: "night" }, civs: 2
    },
    // the Mandi (Act 2): the market road, the weighbridge and truck yards, the akhada and the garage
    mandiRoad: {
      name: "Mandi main road", district: "mandi", tier: 1, w: 2200, theme: "street", map: [78, 40, 106, 46],
      look: { wareFrom: 0, godown: 12, names: { 4: "BHOLA AKHADA", 10: "LAKHAN GARAGE" } },
      junctions: [{ x: 200, to: "mandiGate", dir: "up", label: "Mandi Gate" }, { x: 900, to: "weighbridge", dir: "up", label: "Weighbridge" },
        { x: 1800, to: "truckYard", dir: "down", label: "Truck yard" }],
      doors: [{ x: 576, to: "akhada", label: "Bhola's Akhada" }, { x: 1344, to: "garage", label: "Lakhan's Garage", needs: "2-3" }],
      props: [{ x: 350, kind: "stall" }, { x: 720, kind: "sacks" }, { x: 780, kind: "crates" }, { x: 1100, kind: "stall" }, { x: 1520, kind: "stall" },
        { x: 1650, kind: "sacks" }, { x: 2060, kind: "stall" }, { x: 1950, kind: "teastall" }, { x: 1010, kind: "netacutout" }, { x: 460, kind: "handcart", y: 190 }, { x: 1230, kind: "handcart", y: 184 }],
      parked: [{ id: "scooter", kind: "scooter", x: 1480, y: 190, needs: "2-3" }],
      talk: [{ x: 1100, label: "Vada pav at the stall", act: () => openStall("vadaStall"), hours: [5, 22] }],
      links: [{ x: 2100, to: "platform", verb: "Take the day train to Bunder Road", sign: "Mandi Road halt", needs: "2-4", hours: [6, 22] }],   // Lakhan's, outside the garage
      barrels: [[640, 190, "food"], [1420, 172, "drink"]],
      spawn: { kinds: ["porter", "grunt", "bruiser", "pipeGrunt"], cap: 3, every: 520, when: "night" }, civs: 4, patrol: true
    },
    weighbridge: {
      name: "Weighbridge yard", district: "mandi", tier: 1, w: 1300, theme: "yard", map: [90, 32, 104, 32],
      look: { weighbridge: 700, signs: [[300, "TOLA WEIGHBRIDGE 24 HRS", "#2f6b3a"], [1050, "NO WEIGHT, NO ENTRY", "#a8322a"]] },
      junctions: [{ x: 120, to: "mandiRoad", dir: "down", label: "Mandi main road" }],
      props: [{ x: 200, kind: "sacks" }, { x: 1000, kind: "crates" }, { x: 1150, kind: "sacks" }, { x: 420, kind: "handcart", y: 188 }],
      barrels: [[960, 186, "food"]],
      // Tola's men are always about, weighing whatever comes through
      spawn: { kinds: ["porter", "porter", "bruiser"], cap: 3, every: 600 }, civs: 2
    },
    truckYard: {
      name: "Truck yard", district: "mandi", tier: 1, w: 1500, theme: "yard", map: [84, 54, 104, 56],
      look: { trucks: [260, 560, 1000, 1300], signs: [[780, "MANDI TRANSPORT CO.", "#2b54a8"]] },
      junctions: [{ x: 120, to: "mandiRoad", dir: "up", label: "Mandi main road" }],
      props: [{ x: 420, kind: "crates" }, { x: 860, kind: "sacks" }, { x: 1180, kind: "crates" }, { x: 700, kind: "handcart", y: 186 }],
      barrels: [[640, 176, "pipe"], [1200, 194, "drink"]],
      spawn: { kinds: ["grunt", "kicker", "porter", "bruiser"], cap: 3, every: 560, when: "night" }, civs: 2
    },
    // Sagar Kinara (Act 2, second half): the seafront, the Neon Saanp's turf by night
    kinara: {
      name: "Sagar Kinara", district: "kinara", tier: 2, w: 2800, theme: "seafront", map: [22, 60, 80, 60],
      look: { sea: true, blocks: [[900, 1220, "hotel"], [1640, 1900, "club"]], screen: 2400 },
      junctions: [{ x: 300, to: "bunderRoad", dir: "down", label: "Bunder Road" }],
      doors: [{ x: 1770, to: "club", label: "Club 1987", needs: "2-5", hours: [22, 4] }],
      props: [{ x: 560, kind: "bhelcart" }, { x: 1400, kind: "bhelcart" }, { x: 2100, kind: "teastall" }],
      talk: [{ x: 560, label: "Bhel at the cart", act: () => openStall("bhelCart"), hours: [11, 23] }, { x: 1400, label: "Bhel at the cart", act: () => openStall("bhelCart"), hours: [11, 23] }],
      npcs: [{ look: "civ_f", base: 4, x: 780, y: 160, needs: "2-7" }],
      parked: [{ id: "motorbike", kind: "motorbike", x: 1500, y: 190, needs: "2-6" }, { id: "saanpbike", kind: "motorbike", x: 2620, y: 186, owner: true, needs: "2-5" }],
      barrels: [[760, 192, "food"], [2250, 176, "drink"]],
      spawn: { kinds: ["biker", "spinner", "breaker", "biker"], cap: 3, every: 520, when: "night" }, civs: 5, patrol: true
    },
    // the docks (Act 2, second half): Machhi Mausi's fish market, the quay, the ice factory, Godown No. 9
    docks: {
      name: "Bunder Docks", district: "docks", tier: 2, w: 2600, theme: "docks", map: [4, 40, 20, 52],
      look: { ice: [300, 1150] },
      junctions: [{ x: 200, to: "bunderRoad", dir: "down", label: "Bunder Road" }],
      doors: [{ x: 1500, to: "godown9", label: "Godown No. 9", needs: "2-7", hours: [20, 4] }, { x: 2000, to: "icefactory", label: "Ice factory", needs: "2-6" }],
      props: [{ x: 500, kind: "auction" }, { x: 820, kind: "auction" }, { x: 1060, kind: "fishcrates" }, { x: 1320, kind: "fishcart" }, { x: 1700, kind: "drums" }, { x: 1840, kind: "boatup" }, { x: 2200, kind: "container" }, { x: 2330, kind: "nets" }, { x: 640, kind: "ice" }],
      barrels: [[960, 190, "food"], [2100, 176, "drink"]],
      talk: [{ x: 1320, label: "Fish fry at the cart", act: () => openStall("fishFry"), hours: [4, 21] }],
      spawn: { kinds: ["netman", "hookman", "netman"], cap: 3, every: 560, when: "night" }, civs: 3
    },
    sea: { name: "The open sea", district: "docks", tier: 2, w: 3400, theme: "opensea", water: true, missionOnly: "2-7", mapOn: "docks",
      parked: [{ id: "motorboat", kind: "boat", x: 200, y: 186 }] },
    bunderRoad: {
      name: "Bunder Road", district: "harbour", tier: 1, w: 1600, theme: "street", map: [28, 50, 68, 50],
      // the old Harbour Line terminus fills the middle of the road; its entrance leads to the platform
      look: { station: 640 },
      junctions: [{ x: 300, to: "lane", dir: "up", label: "Chandni Lane" }, { x: 450, to: "docks", dir: "down", label: "Bunder Docks", needs: "2-6", shut: "The dock gate is chained. Mausi opens it for people the Kinara vouches for" }, { x: 1500, to: "kinara", dir: "down", label: "Sagar Kinara", needs: "2-5", shut: "Kaal's men have the sea road. Not until the first instalment is paid" }],
      doors: [{ x: 832, to: "platform", label: "Bunder Road station" }, { x: 1386, to: "thana", label: "Police station", needs: "1-6" }, { x: 1258, to: "kaalOffice", label: "Kaal Group sales office", needs: "2-4", hours: [9, 19] }],
      barrels: [[520, 190, "food"], [1180, 170, "drink"]], props: [{ x: 1040, kind: "pco" }, { x: 1200, kind: "teastall" }, { x: 1110, kind: "netacutout" }, { x: 676, kind: "cards", hours: [10, 19] }, { x: 922, kind: "checkpost", hours: [21, 5] }], patrol: true,
      parked: [{ id: "neighbour", kind: "scooter", x: 560, y: 168, owner: true, needs: "1-6" }],   // somebody's, keys in it
      npcs: [{ look: "civ_f", base: 0, x: 1440, y: 158, needs: "1-6" }, { look: "civ_j", base: 0, x: 640, y: 160, needs: "1-6", hours: [10, 19] },
        { kind: "fakecop", x: 896, y: 160, needs: "1-6", hours: [21, 5] }, { kind: "fakecop", x: 948, y: 164, face: 1, needs: "1-6", hours: [21, 5] }],
      talk: [{ x: 1440, label: "Havaldar Pandu", act: () => pandu(), needs: "1-6" }, { x: 640, label: "Three-card trick", act: (x) => threeCards(x), needs: "1-6", hours: [10, 19] },
        { x: 920, label: "The night checkpost", act: (x) => fakeCheckpost(x), needs: "1-6", hours: [21, 5] }],
      spawn: { kinds: ["grunt", "kicker", "thrower"], cap: 3, every: 540, when: "night" }, civs: 2
    },
    platform: {
      name: "Platform 2", district: "harbour", tier: 1, w: 1400, theme: "subway", mapOn: "bunderRoad",
      doors: [{ x: 120, to: "bunderRoad", label: "Station exit" }],
      npcs: [{ look: "civ_j", base: 4, x: 500, y: 158, needs: "2-4", hours: [7, 22] }],
      talk: [{ x: 500, label: "Ticket checking", act: (x) => fakeCollector(x), needs: "2-4", hours: [7, 22] }],
      links: [{ x: 1000, to: "mandiRoad", verb: "Take the day train to the Mandi", sign: "Trains: Mandi Road", needs: "2-4", hours: [6, 22] }],
      barrels: [[300, 192, "knife"], [760, 165, "food"], [820, 151, "drink", "vending"]], letter: [1, 1180, 196],
      spawn: { kinds: ["grunt", "kicker", "thrower"], cap: 2, every: 700, when: "night" }
    },
    // the roofs over Chandni Lane: gaps to jump (run, then jump), a kite wire over the widest one
    roofs: {
      name: "The rooftops", district: "chandni", tier: 2, w: 2200, theme: "roof", layer: true, map: [22, 31, 62, 31],
      links: [{ x: 423, to: "lane", verb: "Take the stairs down" }],
      gaps: [[930, 990], [1590, 1730]], wires: [{ x0: 1572, x1: 1748 }], below: "lane",
      barrels: [[340, 170, "pipe"], [800, 194, "food"], [1220, 162, "drink"]], letter: [2, 1880, 172],
      spawn: { kinds: ["kicker", "thrower", "grunt"], cap: 2, every: 720, when: "night" }
    },
    // the river: steps down to the water behind the Mandi, the old ferry, and the mill across
    ghat: {
      name: "Mandi Ghat", district: "river", tier: 3, w: 900, theme: "ghat", map: [100, 16, 106, 30],
      junctions: [{ x: 120, to: "mandiGate", dir: "down", label: "Mandi Gate" }],
      links: [{ x: 720, to: "ferry", verb: "Board the ferry" }],
      barrels: [[400, 190, "drink"]],
      spawn: { kinds: ["grunt", "kicker"], cap: 2, every: 800, when: "night" }
    },
    ferry: {
      name: "The night ferry", district: "river", tier: 3, w: 640, theme: "ferry", mapOn: "ghat",
      links: [{ x: 40, to: "ghat", verb: "Step off at the ghat" }, { x: 600, to: "millGate", verb: "Step off at the mill" }]
    },
    millGate: {
      name: "Chandni Mills", district: "mills", tier: 3, w: 2500, theme: "factory", map: [116, 30, 116, 60], desk: 1910,
      links: [{ x: 60, to: "ferry", verb: "Back to the ferry" }],
      barrels: [[330, 196, "knife"], [760, 162, "food"], [1200, 190, "drink"], [1620, 170, "food"]], letter: [3, 1460, 168],
      spawn: { kinds: ["bruiser", "kicker", "thrower"], cap: 2, every: 900, when: "night" }
    },
    // the 11:58 last train: three carriages, and the roof under the bridges (only a mission goes there)
    train: {
      name: "The last train", district: "harbour", tier: 1, missionOnly: "1-3", w: 1500, theme: "train", mapOn: "bunderRoad",
      links: [{ x: 60, to: "platform", verb: "Step off", needs: "1-3" }]
    },
    trainRoof: {
      name: "On the roof", district: "harbour", tier: 1, missionOnly: "1-3", w: 1300, theme: "trainroof", duck: true, mapOn: "bunderRoad",
      links: [{ x: 60, to: "train", verb: "Climb down", needs: "1-3" }]
    },
    // interiors: one screen
    akhada: { name: "Bhola's Akhada", district: "mandi", w: 384, theme: "akhada", interior: true, mapOn: "mandiRoad", doors: [{ x: 352, to: "mandiRoad", label: "Mandi main road" }],
      npcs: [{ kind: "ox", x: 236, y: 166 }, { kind: "wrestler", x: 186, y: 188, face: 1 }], train: 236,
      talk: [{ x: 186, label: "Talk to the pehelwan", who: "N", lines: ["The pehelwan finishes his hundredth push-up. \"Bhola-ji says you're all right. For a lane kid.\"", "The pehelwan pours a bucket of water over his head and grins. \"Kushti ladder soon. Bring your Nani to watch.\"", "\"Tola's men weigh the carts with a bent scale,\" the pehelwan says, very quietly. \"Everybody knows. Nobody says.\""] }] },
    garage: { name: "Lakhan's Garage", district: "mandi", w: 384, theme: "garage", interior: true, mapOn: "mandiRoad", doors: [{ x: 352, to: "mandiRoad", label: "Mandi main road" }],
      npcs: [{ look: "civ_e", base: 0, x: 200, y: 160 }],
      talk: [{ x: 200, label: "Talk to Lakhan", who: "lakhan", lines: ["Vroom.", "Scooter. Soon.", "Engine good. You? Hmm.", "Brakes. Important. Mostly.", "Rani. Secret. Shh."] }] },
    kaalOffice: { name: "Kaal Group sales office", district: "harbour", w: 384, theme: "office", interior: true, mapOn: "bunderRoad", doors: [{ x: 352, to: "bunderRoad", label: "Bunder Road" }] },
    club: { name: "Club 1987", district: "kinara", tier: 2, w: 640, theme: "club", interior: true, radio: true, beat: true, talk: [{ x: 96, label: "A drink at the bar", act: () => openStall("clubBar") }], mapOn: "kinara", doors: [{ x: 608, to: "kinara", label: "Sagar Kinara" }] },
    icefactory: { name: "Ice factory", district: "docks", tier: 2, w: 640, theme: "icefactory", interior: true, ice: true, mapOn: "docks", doors: [{ x: 608, to: "docks", label: "Bunder Docks" }] },
    godown9: { name: "Godown No. 9", district: "docks", tier: 2, w: 640, theme: "godown9", interior: true, mapOn: "docks", doors: [{ x: 608, to: "docks", label: "Bunder Docks" }],
      talk: [{ x: 96, label: "Bet on tonight's bout", act: () => godownBet() }] },
    clinic: { name: "Dr. Mehta's clinic", district: "chandni", w: 384, theme: "clinic", interior: true, mapOn: "lane", doors: [{ x: 352, to: "lane", label: "Chandni Lane" }] },
    thana: { name: "Bunder Road thana", district: "harbour", w: 384, theme: "thana", interior: true, mapOn: "bunderRoad", doors: [{ x: 352, to: "bunderRoad", label: "Bunder Road" }] },
    // (each 384 wide; a wider view shows more of the room's walls)
    chaiShop: { name: "Chai stall", district: "chandni", w: 384, theme: "shop", shop: "chaiShop", interior: true, mapOn: "lane", doors: [{ x: 352, to: "lane", label: "Chandni Lane" }] },
    sweetShop: { name: "Sweets", district: "chandni", w: 384, theme: "shop", shop: "sweetShop", interior: true, mapOn: "lane", doors: [{ x: 352, to: "lane", label: "Chandni Lane" }] },
    paanShop: { name: "Paan shop", district: "chandni", w: 384, theme: "shop", shop: "paanShop", interior: true, mapOn: "lane", doors: [{ x: 352, to: "lane", label: "Chandni Lane" }] },
    tailorShop: { name: "Masterji, tailor", district: "chandni", w: 384, theme: "shop", shop: "tailorShop", interior: true, mapOn: "lane", doors: [{ x: 352, to: "lane", label: "Chandni Lane" }] },
    kiranaShop: { name: "Kirana store", district: "chandni", w: 384, theme: "shop", shop: "kiranaShop", interior: true, mapOn: "lane", doors: [{ x: 352, to: "lane", label: "Chandni Lane" }] },
    dhaba: {
      name: "Nani's Dhaba", district: "chandni", w: 384, theme: "dhaba", interior: true, savePoint: true, mapOn: "lane", bed: 28,
      doors: [{ x: 352, to: "lane", label: "Chandni Lane" }],
      swap: { x: 150 },   // the tables: change who goes out, once Raghav or Cheel is on Nani's side
      board: { x: 236, text: () => (flag("board") ? boardText() : "The Lane Committee board. No notices yet: jobs and news will go up here.") }
    }
  }
};
for (const id in WORLD.streets) WORLD.streets[id].id = id;
// the nearest street drawn on the paper map (a platform or a train is drawn as its road)
const mapStreet = (s) => { while (s && !s.map && s.mapOn) s = WORLD.streets[s.mapOn]; return s; };
const START_AT = { street: "lane", x: 1216 };   // a new game starts outside the dhaba
const JUNCTION_W = 28;                          // half the width of a junction's mouth

// a way that a mission has not opened yet (needs: the mission id) cannot be taken
// Explore mode opens every door, alley, stair and train, at any hour (gallery.js starts it)
const unlocked = (n) => !n || !!progress.explore || progress.done.includes(n);
const isOpen = (e) => !!progress.explore || (unlocked(e.needs) && hourIn(e.hours));
// the junction (or door) on street `to` that leads back to street `from`
// (a one-way link lands in the middle of the street rather than breaking the wipe)
function junctionBack(from, to) { const s = WORLD.streets[to]; return (s.junctions || []).find((j) => j.to === from) || { x: s.w / 2, dir: "down" }; }
function doorBack(from, to) { const s = WORLD.streets[to]; return (s.doors || []).concat(s.links || []).find((d) => d.to === from) || { x: s.w / 2 }; }
