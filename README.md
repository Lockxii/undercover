# Undercover Pro

Jeu de déduction sociale en français, sur mobile et ordinateur. Chaque joueur utilise son propre navigateur. Les civils reçoivent le même mot ; les imposteurs reçoivent un mot proche.

## Développement

Node.js **22.18 ou supérieur** est nécessaire, notamment pour les tests TypeScript natifs.

```sh
npm ci
npm run dev
```

Ouvrir <http://localhost:3000>. Pour tester plusieurs joueurs, ouvrir plusieurs onglets avec des pseudos différents.

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm start
npm audit --omit=dev
```

## Jouer

1. Cliquer sur **Créer une partie**, puis choisir un pseudo de 3 à 12 caractères.
2. Partager le lien du lobby ou son code. Les invités cliquent sur le lien ou utilisent **Rejoindre** sur l’accueil.
3. Au moins **3 joueurs** doivent être présents et **tous** doivent être prêts. L’hôte lance la partie.
4. Chacun révèle son mot, le cache, puis décrit son mot pendant le débat. Le bouton « Voir mon mot » permet de le consulter à nouveau.
5. Quand tous les survivants ont fini de parler, chacun vote pour un autre joueur.
6. Une égalité ouvre une défense, puis l’hôte lance un second vote limité aux suspects. Une nouvelle égalité n’élimine personne.
7. Les civils gagnent lorsque tous les imposteurs sont éliminés. Les imposteurs gagnent dès qu’ils sont aussi nombreux que les civils survivants. Il y a deux imposteurs à partir de 8 joueurs.
8. L’hôte lance le tour suivant ou revient au lobby pour rejouer.

## Connexion et confidentialité

- **Internet est nécessaire** pour créer ou rejoindre une salle. PeerJS utilise son service public de signalisation et WebRTC pour les échanges entre navigateurs. Certains VPN, pare-feu et réseaux mobiles peuvent empêcher une connexion directe ; aucun serveur TURN dédié n’est configuré.
- **L’hôte doit garder sa page ouverte.** Fermer ou recharger sa page termine la salle. Les invités reçoivent un message et peuvent revenir à l’accueil. Il n’y a pas de serveur de partie persistant ni de migration d’hôte.
- Une invitation ne crée jamais silencieusement une nouvelle salle. Les salles absentes, pseudos déjà pris et connexions expirées affichent une erreur et permettent de réessayer.
- Un invité qui quitte le lobby est retiré. En cours de partie, il est éliminé et ne bloque plus la révélation, la discussion ou le vote. Un vote en cours redémarre si un survivant part. Un invité arrivé en cours de partie observe jusqu’à la prochaine partie. Un contrôle de présence détecte les connexions silencieusement perdues après environ 45 secondes ; les pauses du navigateur ne déclenchent pas immédiatement d’élimination.
- Les pseudos sont uniques dans une salle. Après un rechargement en cours de partie, choisir un autre pseudo pour rejoindre comme spectateur ; l’identité précédente n’est pas restaurée.
- L’hôte valide les phases, les candidats et l’identité de chaque action reçue. Les invités ne peuvent pas lancer ou réinitialiser la partie à sa place. L’hôte conserve les secrets ; les invités reçoivent leur propre mot, les rôles éliminés et les identités complètes à la fin. L’hôte reste une autorité de confiance.

## PWA

L’application est installable depuis les navigateurs compatibles. Le service worker fournit une page hors connexion explicite et ne met jamais en cache les salles, les réponses React Server Components ou l’état du jeu. Il remplace l’ancien cache Workbox pour éviter de conserver des versions périmées. Le jeu multijoueur hors connexion n’est pas pris en charge.

## Architecture

- Next.js App Router, React, TypeScript, Tailwind CSS, Framer Motion et PeerJS.
- `src/lib/game.ts` : règles, validation des actions et projection des secrets par joueur.
- `src/context/GameContext.tsx` : connexions PeerJS, autorité de l’hôte et synchronisation.
- `src/lib/game.test.ts` : tests natifs des parcours, égalités, deux imposteurs, déconnexions et confidentialité.
- GitHub Actions vérifie tests, TypeScript, lint, build et audit des dépendances de production.

L’audit complet peut encore signaler des alertes dans `braces` via l’outillage ESLint de Next.js. Au moment de cette correction, aucun correctif compatible n’était proposé ; `npm audit fix --force` rétrograderait Next.js ESLint en version 14. Ne pas appliquer cette rétrogradation automatique. L’audit de production est vérifié séparément.
