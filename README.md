# Quiz Veille

Quiz quotidien auto-généré pour tester mes connaissances sur ma veille tech
(agents IA, outillage dev, design, sécurité…). QCM avec révélation de la réponse,
explication et pointeur « pour aller plus loin » vers la source d'origine.

**→ [Jouer](https://dcuenot.github.io/veille-quiz/)** (GitHub Pages)

## Comment ça marche

- Les questions sont générées à partir d'une base de connaissances privée (« second cerveau »)
  par un pipeline nocturne, **uniquement depuis le contenu factuel public** de chaque fiche de
  veille (ce que fait l'outil, points clés) — aucune donnée personnelle.
- `quiz.json` est régénéré chaque nuit : les nouvelles fiches de veille ajoutent de nouvelles
  questions (incrémental).
- Le site (`index.html`) est statique : il charge `quiz.json`, mélange les questions, et garde
  un score local.

## Structure

```
index.html   Application quiz statique (charge quiz.json)
quiz.json    Données { generated, questions: [{question, choices, answer, explanation, more}] }
.nojekyll    Sert les fichiers tels quels (pas de build Jekyll)
```

Données générées automatiquement — ne pas éditer `quiz.json` à la main.
