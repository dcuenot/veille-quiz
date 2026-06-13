"use strict";
// Tests purs de la logique de gamification. Lancer : node gam.test.js
const Gam = require("./gam.js");

let passed = 0;
function eq(a, b, msg) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa !== sb) throw new Error(`${msg}\n  attendu ${sb}\n  obtenu  ${sa}`);
  passed++;
}
function ok(cond, msg) { if (!cond) throw new Error(msg); passed++; }

// helper : repondre n questions le jour `day`
function play(state, day, n, correct = true) {
  for (let i = 0; i < n; i++) state = Gam.applyAnswer(state, correct, day).state;
  return state;
}

const tests = {
  prevDay_simple() { eq(Gam.prevDay("2026-06-13"), "2026-06-12", "veille simple"); },
  prevDay_mois() { eq(Gam.prevDay("2026-03-01"), "2026-02-28", "limite de mois"); },
  prevDay_annee() { eq(Gam.prevDay("2026-01-01"), "2025-12-31", "limite d'annee"); },

  normalize_corrompu() {
    eq(Gam.normalize(null), Gam.emptyState(), "null -> emptyState");
    eq(Gam.normalize("xxx"), Gam.emptyState(), "string -> emptyState");
    eq(Gam.normalize({ badges: "nope", streak: "5" }), Gam.emptyState(), "champs invalides ignores");
  },
  normalize_partiel() {
    const s = Gam.normalize({ streak: 4, badges: ["streak-3", 7] });
    eq(s.streak, 4, "streak preserve");
    eq(s.badges, ["streak-3"], "badges non-string filtres");
  },

  applyAnswer_compteurs() {
    const s0 = Gam.emptyState();
    const r = Gam.applyAnswer(s0, true, "2026-06-13");
    eq(r.state.totalAnswered, 1, "totalAnswered +1");
    eq(r.state.totalCorrect, 1, "totalCorrect +1 si correct");
    eq(r.state.todayCount, 1, "todayCount +1");
    eq(s0.totalAnswered, 0, "immutabilite: entree non mutee");
  },
  applyAnswer_mauvaise() {
    const r = Gam.applyAnswer(Gam.emptyState(), false, "2026-06-13");
    eq(r.state.totalAnswered, 1, "totalAnswered +1");
    eq(r.state.totalCorrect, 0, "totalCorrect inchange si faux");
  },

  objectif_atteint_une_fois() {
    let s = Gam.emptyState();
    let met = 0;
    for (let i = 0; i < 7; i++) {
      const r = Gam.applyAnswer(s, true, "2026-06-13");
      s = r.state; if (r.goalJustMet) met++;
    }
    eq(met, 1, "goalJustMet une seule fois");
    eq(s.goalMetToday, true, "goalMetToday vrai");
    eq(s.streak, 1, "streak = 1 le 1er jour");
    eq(s.daysPlayed, 1, "daysPlayed = 1");
  },

  streak_jours_consecutifs() {
    let s = Gam.emptyState();
    s = play(s, "2026-06-10", 5);
    s = play(s, "2026-06-11", 5);
    s = play(s, "2026-06-12", 5);
    eq(s.streak, 3, "3 jours consecutifs -> streak 3");
    eq(s.bestStreak, 3, "bestStreak 3");
  },
  streak_trou_reset() {
    let s = Gam.emptyState();
    s = play(s, "2026-06-10", 5);
    s = play(s, "2026-06-11", 5); // streak 2
    s = play(s, "2026-06-14", 5); // trou -> reset a 1
    eq(s.streak, 1, "trou -> streak repart a 1");
    eq(s.bestStreak, 2, "bestStreak conserve le max 2");
  },
  refreshDay_casse_streak() {
    let s = play(Gam.emptyState(), "2026-06-10", 5); // streak 1, lastGoalDay 06-10
    const r = Gam.refreshDay(s, "2026-06-13"); // bien apres hier
    eq(r.streak, 0, "streak casse si dernier jour < hier");
    const alive = Gam.refreshDay(s, "2026-06-11"); // hier
    eq(alive.streak, 1, "streak vivant si dernier jour == hier");
  },

  badge_streak_3() {
    let s = Gam.emptyState();
    s = play(s, "2026-06-10", 5);
    s = play(s, "2026-06-11", 5);
    const r = Gam.applyAnswer(play(s, "2026-06-12", 4), true, "2026-06-12"); // 5e du 3e jour
    ok(r.newBadges.includes("streak-3"), "badge streak-3 debloque au 3e jour");
    ok(r.state.badges.includes("streak-3"), "badge enregistre dans l'etat");
  },
  badge_total_50() {
    let s = Gam.emptyState();
    // 49 reponses reparties -> pas encore ; la 50e debloque q-50
    s = play(s, "2026-06-10", 49);
    const r = Gam.applyAnswer(s, true, "2026-06-10");
    ok(r.newBadges.includes("q-50"), "q-50 debloque a la 50e reponse");
  },
  badge_accuracy_min() {
    // 10 bonnes reponses : 100% mais < 50 -> pas de acc-80
    let s = play(Gam.emptyState(), "2026-06-10", 10, true);
    ok(!s.badges.includes("acc-80"), "acc-80 pas debloque sous 50 reponses");
    // 50 bonnes reponses : 100% et >= 50 -> acc-80
    let s2 = play(Gam.emptyState(), "2026-06-10", 50, true);
    ok(s2.badges.includes("acc-80"), "acc-80 debloque a >=50 reponses et >=80%");
  },

  snapshot_affichage() {
    let s = play(Gam.emptyState(), "2026-06-13", 2);
    const snap = Gam.snapshot(s, "2026-06-13");
    eq(snap.goal, 5, "goal = 5");
    eq(snap.todayCount, 2, "todayCount 2");
    eq(snap.remaining, 3, "remaining 3");
    eq(snap.badges.length, Gam.BADGES.length, "snapshot liste tous les badges");
    ok(snap.badges.every(b => typeof b.unlocked === "boolean"), "chaque badge a unlocked");
  },
  snapshot_accuracy() {
    let s = play(Gam.emptyState(), "2026-06-13", 3, true);
    s = Gam.applyAnswer(s, false, "2026-06-13").state; // 3/4
    const snap = Gam.snapshot(s, "2026-06-13");
    eq(snap.accuracy, 75, "precision 75%");
  },
  snapshot_streak_casse() {
    let s = play(Gam.emptyState(), "2026-06-10", 5);
    const snap = Gam.snapshot(s, "2026-06-13");
    eq(snap.streak, 0, "snapshot reflete le streak casse");
  },
};

let failed = 0;
for (const name of Object.keys(tests)) {
  try { tests[name](); console.log("ok  " + name); }
  catch (e) { failed++; console.error("FAIL " + name + "\n  " + e.message); }
}
console.log(`\n${Object.keys(tests).length - failed}/${Object.keys(tests).length} tests, ${passed} assertions.`);
process.exit(failed ? 1 : 0);
