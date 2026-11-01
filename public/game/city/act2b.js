/* Rollback City: Act 2, second half (DESIGN 6), missions 2-6 onwards.
   A plain script that shares globals with the others; index.html loads them in order. */
"use strict";

Object.assign(MISSIONS, {
  "2-6": { act: 2, title: "Club 1987", needs: ["2-5"], hours: [22, 4], start: { street: "kinara", x: 1700 }, reward: { rs: 3000, respect: { kinara: 25 } }, flags: ["kinara"],
    after: () => callIn("nani", ["Machhi Mausi owes me one. Since 1987. Go to the docks at dawn and help her with the fish auction. And don't mention it.", "And whatever she fries for you, eat it. All of it. She will be watching."], "Nani"), steps: [
    { panels: [
      { who: "kai", text: "Smashed bulbs at the dhaba, a brick through the paanwala's glass, and every one of them on a bike with a glow band. Neon Saanp. Their boss plays records at Club 1987, and nobody gets in without dancing." },
      { who: "rai", text: "A lifetime of Nani's kalari in this family, and it comes down to a dance-off." },
      { who: "N", dark: 0.5, text: "The bouncer at Club 1987 has the shoulders of a cupboard and the face of a man who has heard every excuse. \"No dancing, no entry. Show me.\"" }] },
    { dance: { street: "kinara", x: 1770, notes: 14, need: 9 }, obj: () => "Dance-off: press " + (TOUCH ? "the stick" : padLast ? "the d-pad" : "W A S D") + " as each arrow reaches the line" },
    { ride: { street: "club", x: 120 }, obj: "Into Club 1987" },
    { fight: { street: "club", x: 300, name: "The dance floor", waves: [["breaker", "spinner"], ["biker", "breaker", "spinner"]] }, obj: "Clear the dance floor: hits on the beat count double", checkpoint: true },
    { boss: { street: "club", x: 330, kind: "djrewind", name: "DJ Rewind", waves: [["djrewind"]], adds: [[0.6, ["breaker", "breaker"]], [0.3, ["spinner", "biker"]]] }, obj: "Beat DJ Rewind, on the beat", checkpoint: true },
    { panels: [
      { who: "djrewind", text: "Okay, okay! Needle off the record! A man in a white car paid us to make the lane look dangerous. Dangerous lanes go cheap, he said." },
      { who: "kai", text: "Then tell the Saanp the Kinara's ours now. And the lane's customers come and go in peace." },
      { who: "djrewind", text: "Deal. The bikes outside are yours; the Saanp don't argue with a winner. 98.3 tonight. The next one's for your Nani." }] }
  ] },
  "2-7": { act: 2, title: "Machhi Mausi", needs: ["2-6"], hours: [4, 9], start: { street: "docks", x: 400 }, reward: { rs: 2500, respect: { docks: 25 } }, flags: ["docks"], steps: [
    { panels: [
      { who: "N", dark: 0.5, text: "Dawn at Bunder Docks. The boats are in, the ice is down, and the fish auction is forty men shouting prices at one woman, who is winning." },
      { who: "mausi", text: "Nani's grandchild? Hah. She sends a child to do a woman's job. Fine. Those boats at the end aren't mine; Kaal has hired every drunk with a boathook. Keep them off my fish, and keep your feet under you." }] },
    { fight: { street: "docks", x: 700, name: "The fish auction", waves: [["netman", "hookman"], ["netman", "netman", "hookman"]] }, obj: "Keep Kaal's crew off the auction (the floor is ice)", checkpoint: true },
    { panels: [
      { who: "mausi", text: "The cash box! That one's off to a boat with the whole auction's money. Take my boat, the blue one, and bring it back without a scratch." }] },
    { ride: { street: "sea", x: 220 }, obj: "Out to sea" },
    { chase: { street: "sea", kind: "netman", x: 760, to: 3300, fail: "He got away with the auction money" }, obj: "Catch his boat: ride alongside and hit him" },
    { ride: { street: "docks", x: 1950 }, obj: "Back to the docks" },
    { go: { street: "icefactory", x: 220, r: 40 }, obj: "Mausi wants a word in the ice factory" },
    { panels: [{ who: "mausi", text: "The money's back. Now. In 1987 your Nani fed my boats for a month, in rice, and never sent a bill. I don't pay in rice. I pay in respect, and I like to see who I'm paying." }] },
    { boss: { street: "icefactory", x: 320, kind: "mausi", name: "Machhi Mausi", waves: [["mausi"]] }, obj: "Mausi's test: one on one, on the ice", checkpoint: true },
    { panels: [
      { who: "mausi", text: "Ufff! The child can fight. Tell Nani we're square. And tell her I said she still makes bad fish curry." },
      { who: "mausi", text: "The docks are with you. Tell the ferryman Mausi said so and he'll stop asking where. And stay out of Godown No. 9." }] }
  ] },
  "2-8": { act: 2, title: "Chai Break", needs: ["2-7"], hours: [15, 18], start: { street: "kinara", x: 800 }, reward: { respect: { kinara: 5 } }, flags: ["chhotu"], steps: [
    { panels: [
      { who: "chhotu", text: "You're the ones from Chandni Lane? Chhotu. I sell peanuts, I hear things. Kaal's men take their chai at the Marina tables at five. Every day. Like clockwork, like office babus." },
      { who: "chhotu", text: "They talk. Nobody listens to men drinking chai. You put this on and listen, I keep watch. Fifty rupees, after. Chhotu doesn't do credit." },
      { who: "N", text: "A clerk's coat, a pair of glasses with no glass in them, and a tie that has given up. Nobody looks twice at a clerk." }], then: () => { progress.disguise = true; progress.clock.min = Math.max(progress.clock.min, 16 * 60 + 58); } },
    { eavesdrop: { street: "kinara", x: 1080, tables: [960, 1080, 1200], lines: [
      "\"...the old man doesn't care about the shops. He wants the paper. The lane's deeds are only the excuse.\"",
      "\"...forty years he's waited. He says finish what his father started. Whatever that means.\"",
      "\"...a film. A reel from that night in '87. If it's anywhere, it's in that lane. And if it burns, it burns with the lane.\""] },
      obj: "At the Marina tables: stand still to listen, and don't be near when they look up" },
    { panels: [
      { who: "kai", text: "A reel of film. From the night of the fire." },
      { who: "rai", text: "And \"if it burns, it burns with the lane\". They're not going to wait for the money." },
      { who: "chhotu", text: "Fifty rupees. And I'll keep my ears open. Nobody notices Chhotu." }], then: () => { progress.money = Math.max(0, money() - 50); } }
  ] }
});
