"use strict";
// gam.js — logique de gamification du quiz veille.
// Pur : aucun DOM, aucun localStorage. La date du jour ("YYYY-MM-DD") est injectee.
// Toute fonction renvoie un nouvel etat, sans muter l'entree.
(function (root) {
  var GOAL = 5;       // questions a repondre pour valider une journee
  var VERSION = 1;

  // Catalogue de badges. streak base sur bestStreak (persiste apres cassure).
  var BADGES = [
    { id: "streak-3",   label: "3 j",   kind: "streak", need: 3 },
    { id: "streak-7",   label: "7 j",   kind: "streak", need: 7 },
    { id: "streak-30",  label: "30 j",  kind: "streak", need: 30 },
    { id: "streak-100", label: "100 j", kind: "streak", need: 100 },
    { id: "q-50",       label: "50 Q",  kind: "total",  need: 50 },
    { id: "q-250",      label: "250 Q", kind: "total",  need: 250 },
    { id: "acc-80",     label: "80 %",  kind: "acc",    need: 80, min: 50 }
  ];

  function emptyState() {
    return {
      v: VERSION, streak: 0, bestStreak: 0, lastGoalDay: null,
      todayDay: null, todayCount: 0, goalMetToday: false,
      totalAnswered: 0, totalCorrect: 0, daysPlayed: 0, badges: []
    };
  }

  function clone(s) {
    return {
      v: VERSION, streak: s.streak, bestStreak: s.bestStreak, lastGoalDay: s.lastGoalDay,
      todayDay: s.todayDay, todayCount: s.todayCount, goalMetToday: s.goalMetToday,
      totalAnswered: s.totalAnswered, totalCorrect: s.totalCorrect,
      daysPlayed: s.daysPlayed, badges: s.badges.slice()
    };
  }

  // Normalise un blob inconnu (issu du storage) en etat valide.
  function normalize(raw) {
    var s = emptyState();
    if (!raw || typeof raw !== "object") return s;
    var num = function (x, d) { return typeof x === "number" && isFinite(x) ? x : d; };
    s.streak = num(raw.streak, 0);
    s.bestStreak = num(raw.bestStreak, 0);
    s.todayCount = num(raw.todayCount, 0);
    s.totalAnswered = num(raw.totalAnswered, 0);
    s.totalCorrect = num(raw.totalCorrect, 0);
    s.daysPlayed = num(raw.daysPlayed, 0);
    s.goalMetToday = raw.goalMetToday === true;
    s.lastGoalDay = typeof raw.lastGoalDay === "string" ? raw.lastGoalDay : null;
    s.todayDay = typeof raw.todayDay === "string" ? raw.todayDay : null;
    s.badges = Array.isArray(raw.badges)
      ? raw.badges.filter(function (b) { return typeof b === "string"; })
      : [];
    return s;
  }

  // Jour calendaire precedent, sur aux limites de mois/annee (calcul en UTC a midi).
  function prevDay(day) {
    var p = day.split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12, 0, 0));
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  // Rollover de minuit + cassure du streak si on a manque un jour.
  function refreshDay(state, today) {
    var n = clone(state);
    if (n.todayDay !== today) { n.todayDay = today; n.todayCount = 0; n.goalMetToday = false; }
    if (n.lastGoalDay && n.lastGoalDay !== today && n.lastGoalDay !== prevDay(today)) {
      n.streak = 0;
    }
    return n;
  }

  function accuracy(s) {
    return s.totalAnswered > 0 ? Math.round(100 * s.totalCorrect / s.totalAnswered) : 0;
  }

  // Ids de badges justifies par les compteurs courants.
  function earnedBadges(s) {
    var acc = accuracy(s);
    var out = [];
    for (var i = 0; i < BADGES.length; i++) {
      var b = BADGES[i], hit = false;
      if (b.kind === "streak") hit = s.bestStreak >= b.need;
      else if (b.kind === "total") hit = s.totalAnswered >= b.need;
      else if (b.kind === "acc") hit = s.totalAnswered >= b.min && acc >= b.need;
      if (hit) out.push(b.id);
    }
    return out;
  }

  // Enregistre une reponse. Renvoie { state, goalJustMet, newBadges }.
  function applyAnswer(state, correct, today) {
    var s = clone(refreshDay(state, today));
    s.todayCount += 1;
    s.totalAnswered += 1;
    if (correct) s.totalCorrect += 1;

    var goalJustMet = false;
    if (!s.goalMetToday && s.todayCount >= GOAL) {
      s.goalMetToday = true;
      goalJustMet = true;
      if (s.lastGoalDay === prevDay(today)) s.streak += 1;
      else if (s.lastGoalDay !== today) s.streak = 1;
      s.lastGoalDay = today;
      if (s.streak > s.bestStreak) s.bestStreak = s.streak;
      s.daysPlayed += 1;
    }

    var earned = earnedBadges(s);
    var newBadges = earned.filter(function (id) { return s.badges.indexOf(id) === -1; });
    if (newBadges.length) s.badges = s.badges.concat(newBadges);

    return { state: s, goalJustMet: goalJustMet, newBadges: newBadges };
  }

  // Donnees pretes a afficher (applique refreshDay pour refleter le jour courant).
  function snapshot(state, today) {
    var s = refreshDay(state, today);
    return {
      streak: s.streak,
      bestStreak: s.bestStreak,
      goal: GOAL,
      todayCount: s.todayCount,
      goalMet: s.goalMetToday,
      remaining: Math.max(0, GOAL - s.todayCount),
      totalAnswered: s.totalAnswered,
      totalCorrect: s.totalCorrect,
      accuracy: accuracy(s),
      daysPlayed: s.daysPlayed,
      badges: BADGES.map(function (b) {
        return { id: b.id, label: b.label, kind: b.kind, unlocked: s.badges.indexOf(b.id) !== -1 };
      })
    };
  }

  var API = {
    GOAL: GOAL, VERSION: VERSION, BADGES: BADGES,
    emptyState: emptyState, normalize: normalize, prevDay: prevDay,
    refreshDay: refreshDay, applyAnswer: applyAnswer, snapshot: snapshot, earnedBadges: earnedBadges
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.Gam = API;
})(typeof window !== "undefined" ? window : this);
