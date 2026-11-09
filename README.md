# 📊 Lotso Trading — Dashboard (`services/dashboard`)

[![Vue 3](https://img.shields.io/badge/Framework-Vue_3.5+-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Bundler-Vite_8+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styles-Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Pinia](https://img.shields.io/badge/State-Pinia_Reactive-FFE082?logo=vuedotjs&logoColor=black)](https://pinia.vuejs.org/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict_Z%C3%A9ro_Any-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Le micro-service `dashboard` est la **console web financière et d'administration** de l'écosystème Lotso Trading. Conçu avec Vue 3, Vite et Tailwind CSS, il offre un tableau de bord réactif haute performance pour piloter la stratégie, administrer les baleines et visualiser en direct chaque trade exécuté sur Polymarket.

---

## ⚡ Fonctionnalités Clés

- **Télémétrie en Direct** :
  - Connexion WebSocket bidirectionnelle avec l'API Core.
  - Indicateur d'état du bot en temps réel (Actif / Inactif, Mode Dry-Run ou Réel, Solde USDC Polygon).
- **Administration des Portefeuilles Cibles (Whales)** :
  - Ajout rapide par adresse Polygon (`0x...`) ou alias Polymarket.
  - Basculement instantané d'activation/désactivation.
  - Statistiques de performance et volume par cible.
- **Pilotage du Risque en Temps Réel** :
  - Ajustement sans redémarrage de la taille d'ordre (pourcentage du capital disponible).
  - Contrôle du slippage maximal toléré.
  - Switch de synchronisation intégrale des sorties (`ALL`).
  - Déclencheur de test instantané pour le webhook Discord.
- **Flux d'Activité Live & Positions Ouvertes** :
  - Affichage instantané des événements (détecté, validé, exécuté, rejeté avec motif explicite).
  - Suivi des positions ouvertes avec calcul en temps réel du PnL non réalisé.

---

## 🏛️ Architecture Frontend (Clean UI)

```text
src/
├── main.ts                         # Initialisation Vue 3, Pinia et Router
├── App.vue                         # Layout racine (Navigation & Header)
├── api/                            # Clients HTTP & WebSocket typés
│   ├── http-client.ts              # Requêtes REST sécurisées avec contrats Zod
│   └── websocket-client.ts         # Abonnement au flux d'événements temps réel
├── stores/                         # Stores Pinia réactifs
│   ├── use-targets.store.ts        # Gestion des baleines cibles
│   ├── use-trades.store.ts         # Flux des transactions
│   ├── use-positions.store.ts      # Suivi des positions ouvertes
│   ├── use-config.store.ts         # Configuration dynamique du RiskManager
│   └── use-metrics.store.ts        # Métriques PnL et Win Rate
├── components/                     # Composants atomiques et modulaires
│   ├── layout/                     # Sidebar, Header, StatusBadges
│   ├── overview/                   # Cartes de métriques et graphiques
│   ├── targets/                    # Tableaux et formulaires d'ajout de cibles
│   ├── trades/                     # Flux d'activité en temps réel
│   ├── positions/                  # Tableau des positions et cotes actuelles
│   └── risk/                       # Panneau de contrôle des paramètres de risque
└── views/                          # Vues routées
```

---

## ⚙️ Configuration & Variables d'Environnement

Créez un fichier `.env` ou configurez les variables lors du build :

```bash
# URL de l'API Backend NestJS
VITE_API_URL="http://localhost:3000"

# URL de la Gateway WebSocket
VITE_WS_URL="ws://localhost:3000"
```

---

## 🚀 Commandes Rapides

Le projet utilise **Deno 2** avec le gestionnaire de paquets Vite natif :

```bash
# Lancer le serveur de développement local (avec HMR)
deno task dev

# Compiler les assets optimisés pour la production (dans /dist)
deno task build

# Prévisualiser la version de production localement
deno task preview
```

---

<div align="center">
  <sub>Composant officiel de l'écosystème <b><a href="https://github.com/Lotso-trading">Lotso Trading</a></b></sub>
</div>
