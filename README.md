# roggan-bot

A Discord bot for playing Age of Empires II taunts in voice channels.

Triggered by a single slash command `/taunt <tauntid> [ephemeral]`. The bot joins whichever voice channel the invoking user is in, plays the requested taunt audio, then disconnects. One deployment serves any number of Discord servers — same model as the bot's invite.

## Server Owners

Want the bot in your Discord server? **[→ Invite roggan-bot](https://discord.com/api/oauth2/authorize?client_id=805504237953482756&scope=bot+applications.commands&permissions=2150631424)**

**What it does once installed:**

- Exposes the `/taunt <tauntid>` slash command in your server.
- Taunt IDs **1–42** are mapped to the original AoE2 taunt audio files (e.g. `/taunt 11` → "Eleven? You serious?").
- IDs 43–105 are reserved for Definitive Edition taunts; no audio is currently shipped, and the bot will tell you so.
- On invocation, the bot joins your current voice channel, plays the taunt, and disconnects.

**Required Discord bot permissions:**

- View Channels
- Send Messages (for slash command responses)
- Use Application Commands
- Connect (to voice channels)
- Speak (in voice channels)

Invite scopes: `bot` + `applications.commands`. The bot is configured with `Guilds`, `GuildMessages`, `GuildVoiceStates`, and `MessageContent` gateway intents.

**Setup checklist:**

1. Click the invite link above and pick a server you administer.
2. Join a voice channel and run `/taunt <tauntid>` (any number 1–42).

(No per-server configuration is needed. The bot resolves the invoking user's voice channel dynamically.)

## Install the server (for operators)

Ensure Node.js is configured to run in your environment: <https://nodejs.org/en>. You will also need [pnpm](https://pnpm.io/installation).

```sh
git clone git@github.com:the-darkwire/roggan-bot.git
cd roggan-bot
pnpm install
```

## Configure your environment

Create a `.env` file at the project root (see `.env.example`):

- `TOKEN` — bot auth token from the Discord Developer Portal
- `CLIENT_ID` — Discord application ID (used by `pnpm deploy-commands`)

## Run the server

First-time setup: register the `/taunt` slash command globally with Discord:

```sh
pnpm deploy-commands
```

(Re-run any time the command's `SlashCommandBuilder` data changes in `src/commands/*`. Restarting the bot is not enough — slash command definitions live on Discord's side.)

Then start the bot:

```sh
pnpm dev          # or `pnpm start` — both invoke `tsx index.ts`
```

Or run in Docker:

```sh
docker compose up --build
```

For production deploys, see `.github/workflows/deploy.yml`.

## Gotchas

- **`@discordjs/voice` ≥ 0.19 requires Node ≥ 22.12.** Older Node will install the package but the voice stack will misbehave (commands hang and time out). The `.nvmrc` + Dockerfile both pin Node 24.15.0.
- **`discord.js` and `@discordjs/voice` must bump together.** Mismatched `discord-api-types` between them causes `voiceAdapterCreator` type errors. Always bump both at the same time.
- **`network_mode: host` is not needed** for voice. The default Docker bridge works fine with `@discordjs/voice` ≥ 0.19. Don't add it back without evidence it's required.
