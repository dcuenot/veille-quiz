# Quiz Veille — Gamification (streak quotidien) — Design

Date : 2026-06-13 · Statut : approuvé

## Objectif
Motiver une visite quotidienne du quiz via un streak de jours consécutifs, des stats
cumulées et des badges, persistés dans `localStorage`. Cible : usage perso (pas de
protection anti-triche).

## Décisions
- Mécaniques : streak + stats cumulées + badges.
- La journée se valide en **répondant à `GOAL = 5` questions** (engagement, pas l'ouverture).
- Affichage : chip discret dans le header + panneau riche sur l'écran de score + toast en jeu.

## Architecture (isolation)
- `gam.js` : logique **pure et immuable** (aucun DOM, aucun `localStorage`), date injectée.
  - `emptyState()`, `normalize(raw)` — état par défaut / robuste au JSON corrompu (champ `v`).
  - `refreshDay(state, today)` — rollover de minuit (reset compteur du jour) + cassure du
    streak si le dernier jour validé n'est ni aujourd'hui ni hier.
  - `applyAnswer(state, correct, today)` → `{ state, goalJustMet, newBadges }`.
  - `snapshot(state, today)` — données d'affichage (streak, record, progression, précision, badges).
  - `prevDay(day)` — jour calendaire précédent (sûr aux limites de mois/année).
  - Export double : `module.exports` (tests Node) et `window.Gam` (navigateur).
- `gam.test.js` : tests Node sans dépendance (`node gam.test.js`).
- `index.html` : glue uniquement — lecture/écriture `localStorage` (try/catch), rendu, toasts ;
  inclut `gam.js` avant son script inline.

## Modèle de données (clé `veille-quiz:gam`)
```json
{ "v":1, "streak":5, "bestStreak":12, "lastGoalDay":"2026-06-13",
  "todayDay":"2026-06-13", "todayCount":1, "goalMetToday":false,
  "totalAnswered":84, "totalCorrect":60, "daysPlayed":9,
  "badges":["streak-3","streak-7","q-50"] }
```
Jour = date **locale** `YYYY-MM-DD`.

## Logique de streak
- Réponse : si nouveau jour → reset `todayCount`. Incrémente `todayCount`, `totalAnswered`,
  `totalCorrect` (si correct).
- Quand `todayCount` atteint `GOAL` (1re fois du jour) : `lastGoalDay == hier` → `streak++`,
  sinon `streak = 1`. Maj `bestStreak`, `daysPlayed`, `goalMetToday = true`, `goalJustMet`.
- Chargement / `refreshDay` : si `lastGoalDay` n'est ni aujourd'hui ni hier → `streak = 0`.

## Badges (catalogue extensible)
Streak `3 / 7 / 30 / 100` j · Total `50 / 250` réponses · Précision `≥ 80 %` (min 50 réponses).
Badges de streak basés sur `bestStreak` (persistent après cassure) ; stockés dans `badges[]`.

## UI
- Header : `🔥 <streak> j` + points de progression du jour (`todayCount/GOAL`). Streak 0 → grisé.
- Écran de score : panneau (streak + record, statut objectif, total/précision/jours, grille de
  badges ★/☆) avec mise en avant si objectif atteint / badge débloqué cette session.
- Toast léger en jeu quand l'objectif bascule ou qu'un badge tombe.

## Robustesse & limites
- `localStorage` indisponible → fonctionne en mémoire pour la session, sans planter.
- JSON corrompu / version inconnue → repart sur `emptyState()`.
- Changement d'horloge/fuseau peut décaler le comptage du jour (accepté).

## Tests (gam.test.js)
normalize (corrompu→vide, partiel préservé) · applyAnswer (compteurs, correct) ·
objectif atteint au GOAL-ième (une seule fois) · streak +1 si hier, reset si trou ·
refreshDay casse le streak au-delà d'hier · badges (streak-3 sur 3 jours, q-50, acc-80 min 50) ·
snapshot (remaining, accuracy) · prevDay (limites de mois) · immutabilité (entrée non mutée).
