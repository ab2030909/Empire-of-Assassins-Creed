# Empire of Assassins

**A fan-made, online multiplayer board game inspired by the Assassin's Creed series.**

Play with 2–4 friends or against PC opponents. Pick a legendary assassin, travel through ten historical eras, buy famous locations, build Brotherhood hideouts and outlast your rivals on a full 3D board.

**Play now:** https://d3lb337uepe270.cloudfront.net

> ⚠️ **Fan-made, non-commercial project.** Not affiliated with, endorsed by, or connected to Ubisoft. See [Disclaimer](#disclaimer).

---

## Contents

- [Features](#features)
- [How to play](#how-to-play)
- [The assassins](#the-assassins)
- [Tech stack](#tech-stack)
- [Run it locally](#run-it-locally)
- [Project structure](#project-structure)
- [Assets and media](#assets-and-media)
- [Deployment (AWS)](#deployment-aws)
- [Configuration](#configuration)
- [Disclaimer](#disclaimer)
- [Credits](#credits)

---

## Features

**Multiplayer**
- Real-time online play with Socket.IO. Create a room, share the 5-letter code, and friends join from their own browser.
- Play against PC opponents. Choose how many and which assassin each one plays.
- Lobby with player cards, ready status, live chat, system messages and host controls (round limit, map, privacy, add or remove PCs).
- Reconnects automatically if your connection drops.

**3D board**
- Full three.js board with real photos of each location, glowing era-coloured tiles and an engraved centre with a floating gold crest.
- Every assassin is a real 3D figurine that walks the board tile by tile.
- Physical dice that tumble and land on the rolled numbers.
- Owner flags plus Hideout, Bureau and Headquarters buildings on owned properties.
- Rotate, zoom, switch between 3D and top view, and click any tile or figurine for details.
- Click a figurine to open a card with a rotatable 3D model and the player's stats, ability and properties.
- The turn plays in order: dice roll, then pawn walks, then the card and buy or rent options appear.

**Look and feel**
- Assassin's Creed–style homepage, character carousel, character popups, How to Play section, Create Room page and lobby.
- Intro video popup on first load, with a full-screen version for phones.
- Muffled background music and themed sound effects: blade flicks, sheathing, temple bells, parchment, bone dice, footsteps on stone.
- One mute button for music and sound effects, remembered between visits.

**Mobile**
- Plays in landscape on phones, with a "rotate your phone" screen in portrait.
- Compact match layout with a slide-out panel for holdings, missions and the chronicle.

---

## How to play

1. **Create a room.** Enter your name, pick your assassin, and choose *With Friends* or *Vs PC*.
2. **Lobby.** Share the room code, or add PC opponents. Everyone picks an assassin and presses *Ready*. The host starts the match.
3. **Your turn.** Roll two dice and move clockwise.
   - **Unowned location:** buy it, or decline and it goes to auction.
   - **Rival's location:** pay rent. Owning a full era group doubles rent.
   - **Animus Event, Templar Conspiracy, Piece of Eden:** draw a card.
   - **Mission Briefing:** receive a secret mission with a reward.
   - **Templar Arrest:** go to Desynchronization. Escape with doubles, pay 50 AC, or wait 3 turns.
   - Passing the **Animus Hub** pays 200 AC.
4. **Build.** With a full era group, upgrade to Hideout, then Brotherhood Bureau, then Headquarters (rent ×3, ×6, ×10).
5. **Debt.** If you can't pay, mortgage properties or sell upgrades. Otherwise you go bankrupt.
6. **Winning.** The last solvent assassin wins, or the highest net worth when the round limit is reached.

Everyone starts with **1,500 Animus Credits (AC)**.

---

## The assassins

Each assassin has a unique ability:

| Assassin | Era | Ability |
|---|---|---|
| Altaïr Ibn-La'Ahad | Third Crusade | **Creed of Masyaf**: pay only half of every tax space |
| Ezio Auditore | Renaissance | **Requiescat**: cut one rent payment by 50%, once per round |
| Connor Kenway | American Revolution | **Frontier Resolve**: +100 AC for every completed mission |
| Edward Kenway | Golden Age of Piracy | **Plunder**: +50 AC whenever you pass or land on the Animus Hub |
| Arno Dorian | French Revolution | **Phantom Blade**: ignore the first Templar Conspiracy card each round |
| Jacob Frye | Victorian London | **Rooks Racket**: Colonial and Revolution properties charge 25% more rent |
| Bayek of Siwa | Ptolemaic Egypt | **Medjay Duty**: 100 AC reward on event, Eden and mission spaces (every 3 rounds) |
| Kassandra | Classical Greece | **Spartan Resolve**: Templar Conspiracy penalties are halved |
| Eivor Varinsdottir | Viking Age | **Raid**: 20% off one purchase of 250 AC or less per turn |
| Basim Ibn Ishaq | Abbasid Baghdad | **Eagle Sight**: discard a harmful card and draw another (every 2 rounds) |

The abilities are original game designs for this project. Names and values live in `shared/data.ts`.

---

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, plain CSS |
| 3D | three.js (GLTFLoader with Meshopt, OrbitControls) |
| Real-time | Socket.IO 4 |
| Server | Node.js, run with `tsx` |
| Game rules | Shared TypeScript engine (`shared/engine.ts`) used by the server |
| Audio | HTML audio for music; Web Audio API for sound effects |
| Images and videos | Cloudinary (auto format, quality and resizing) |
| Hosting | AWS: EC2 + CloudFront (server), S3 + CloudFront (website) |
| Infrastructure | AWS SAM / CloudFormation (`infra/template.yaml`) |
| CI/CD | GitHub Actions with OIDC (no AWS keys stored in GitHub) |

The server is authoritative: every move is checked by the shared engine, and clients only send actions.

---

## Run it locally

**Requirements:** Node.js 20 or newer (22 recommended).

```bash
git clone https://github.com/ab2030909/Empire-of-Assassins-Creed.git
cd Empire-of-Assassins-Creed
npm install
npm run dev
```

Then open **http://localhost:5173**.

- `npm run dev` starts both the game server (port 3001) and the Vite client (port 5173). Vite forwards `/socket.io` to the server.
- To test multiplayer, open a second browser window or a private window and join with the room code.

| Command | What it does |
|---|---|
| `npm run dev` | Server and client with live reload |
| `npm run build` | Production build into `dist/` |
| `npm start` | Run the game server only |
| `npm run typecheck` | TypeScript check |

---

## Project structure

```
├── server/            Socket.IO game server (rooms, chat, PC players)
│   ├── index.ts
│   └── bot.ts         PC opponent logic
├── shared/            Code used by both server and client
│   ├── data.ts        Board, eras, characters, cards, missions
│   ├── engine.ts      Game rules
│   └── protocol.ts    Room/lobby message types
├── src/               React client
│   ├── home/          Homepage, How to Play, Create Room, intro video
│   ├── characters/    Character carousel, popups, portraits
│   ├── lobby/         Lobby page
│   ├── game3d/        3D board, scenery, figurine card
│   ├── Game.tsx       Match screen and HUD
│   ├── BgMusic.tsx    Background music
│   ├── sfx.ts         Sound effects
│   └── net.ts         Socket connection
├── public/            Images, 3D models (3d models/), videos, music, sfx/
├── infra/template.yaml        AWS infrastructure
├── scripts/upload-cloudinary.mjs
└── .github/workflows/deploy.yml
```

**Pages:** `/` homepage · `/create` Create Room · `/lobby` lobby · `/game` match

---

## Assets and media

| Asset | Location |
|---|---|
| Character portraits and popups | `public/characters/portraits/` |
| Location photos | `public/places/` |
| Backgrounds, How to Play images, board centre | `public/home/` |
| 3D figurines (one per assassin) | `public/3d models/<id>.glb` |
| Intro videos | `public/ac.mp4`, `public/ac-mobile.mp4` |
| Background music | `public/ac3.mp3` |
| Optional recorded sound effects | `public/sfx/<name>.mp3` |

**Sound effects:** sounds are generated in code by default. To use real recordings, add any of `click`, `confirm`, `back`, `popup`, `dice`, `step`, `land` as `.mp3` files in `public/sfx/`.

**Cloudinary:** images and intro videos are served from Cloudinary when `VITE_CLOUDINARY_CLOUD` is set. Cloudinary sends WebP/AVIF images and compressed videos. To upload new images:

```powershell
$env:CLOUDINARY_URL = "cloudinary://<api_key>:<api_secret>@<cloud_name>"
node scripts/upload-cloudinary.mjs
```

Without the variable, everything loads from `public/`.

---

## Deployment (AWS)

```
Players ──► CloudFront ──► S3            (website, from GitHub Actions)
        └─► CloudFront ──► EC2 t3.micro  (Node + Socket.IO game server)
Images / videos ──► Cloudinary
```

**Website:** every push to `main` runs `.github/workflows/deploy.yml`. It builds the site, uploads it to S3 and refreshes CloudFront, in about 3 minutes. GitHub signs in to AWS with OIDC, so no AWS keys are stored in the repo.

**Infrastructure:** defined in `infra/template.yaml` and deployed with SAM:

```bash
sam deploy --template-file infra/template.yaml --stack-name empire-of-assassins \
  --capabilities CAPABILITY_IAM --resolve-s3 \
  --parameter-overrides VpcId=<vpc-id> CloudFrontPrefixList=<cloudfront-prefix-list-id>
```

**Game server updates:** the server is not redeployed by GitHub Actions. After pushing server changes, open a shell on the instance with AWS Session Manager and run:

```bash
cd /opt/eoa/app && git pull && sudo systemctl restart eoa
```

**Delete everything:** `sam delete --stack-name empire-of-assassins`

**Limits:**
- Rooms are kept in the server's memory, so they reset when the server restarts.
- There is no login. Anyone with the link can create and join rooms.

---

## Configuration

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_SERVER_URL` | Client build | Game server URL. Leave empty locally. |
| `VITE_CLOUDINARY_CLOUD` | Client build | Cloudinary cloud name for images and videos |
| `PORT` | Server | Server port (default 3001) |
| `CLOUDINARY_URL` | Upload script | Cloudinary credentials. Never commit this. |

Put client variables in a local `.env` file. It is git-ignored.

---

## Disclaimer

**Empire of Assassins is an unofficial, non-commercial fan project.**

- *Assassin's Creed* and all related characters, names, logos and artwork are trademarks and/or copyright of **Ubisoft Entertainment**.
- This project is **not affiliated with, endorsed by, sponsored by or approved by Ubisoft**.
- Character art, 3D figurines, videos and music used here belong to their respective owners. They are used for **personal, non-commercial fan purposes only**, and nothing in this project is sold or monetised.
- The game rules, abilities, board and code are original work created for this fan project.
- If you are a rights holder and want any content removed, please open an issue on GitHub and it will be taken down promptly.

Before any public or commercial release, all Ubisoft-owned material must be replaced with original or properly licensed content.

---

## Credits

- **Inspiration:** the *Assassin's Creed* series by Ubisoft.
- **Location photos:** Wikipedia / Wikimedia Commons contributors, under their free licenses (CC BY-SA and similar).
- **Fonts:** Cinzel and EB Garamond (SIL Open Font License), via Google Fonts.
- **Libraries:** React, Vite, three.js, Socket.IO, TypeScript.

*Nothing is true, everything is permitted.*
