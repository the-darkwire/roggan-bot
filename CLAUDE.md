# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Discord bot that joins the invoking user's voice channel and plays an Age of Empires II taunt sound. The bot exposes a single slash command, `/taunt <tauntid> [ephemeral]`, where `tauntid` is a number from 1–42 corresponding to an mp3 in `assets/`.

## Commands

- `npm start` — runs the bot via `ts-node index.ts` (no build step; `tsconfig.json` has `noEmit: true`).
- `npm run deploy-commands` — registers/refreshes the slash commands with Discord's REST API. Must be re-run any time the `SlashCommandBuilder` data in `src/commands/*` changes; restarting the bot is not enough.
- `docker compose up --build` — runs in the container defined by `Dockerfile` + `compose.yaml`.

There is no lint script wired up (ESLint config exists at `.eslintrc.json` but isn't invoked by npm). The `test` script is a stub.

`.env` must define `TOKEN` (Discord bot token) and `CLIENT_ID` (Discord application ID); both are read in `src/config.ts`.

## Architecture

Entry point is `index.ts`: it constructs a `discord.js` `Client` with the `Guilds`, `GuildMessages`, `GuildVoiceStates`, and `MessageContent` intents, logs in with the token, and delegates every `InteractionCreate` event to `routeInteraction`.

`src/interaction-router.ts` is the single dispatch point — a `switch` on `interaction.commandName` calls into the matching command's `execute`. Non-chat-input interactions are ignored. Adding a new slash command means:
1. Create `src/commands/<name>.ts` exporting both `data` (a `SlashCommandBuilder`) and `execute`.
2. Add a `case` in `interaction-router.ts`.
3. Import the new `data` in `src/deploy-commands.ts` and add it to the `commands` array.
4. Run `npm run deploy-commands` so Discord knows about it.

`src/commands/taunt.ts` holds the voice-playback flow: validate the tauntID, look up the caller's `VoiceBasedChannel` via `guild.members.cache → member.voice.channel`, `deferReply()` (the voice handshake can exceed Discord's 3-second ack window), `joinVoiceChannel` from `@discordjs/voice`, await `VoiceConnectionStatus.Ready` (10s timeout), then play the mp3 with a single module-scoped `audioPlayer` (`StreamType.Raw`, `NoSubscriberBehavior.Stop`), and `editReply` with the result. On `AudioPlayerStatus.Idle` the player stops, unsubscribes, and disconnects. Because the `audioPlayer` is module-scoped (created once at import), concurrent invocations across guilds share the same player and will interfere with each other — keep this in mind before adding new audio commands. Any new command that does I/O over ~2s should follow the same `deferReply` + `editReply` pattern.

Taunt IDs 43–105 are reserved for the Definitive Edition but no audio files exist for them yet; the command rejects those explicitly with a different message than out-of-range IDs. The ID→reply-text map and bounds live in `src/constants/taunts.ts`; `src/utils/getAudioFilePath.ts` maps an ID to `assets/NN.mp3` (zero-padded).

## Style conventions (from `eslint.config.js`)

Single quotes, semicolons required, trailing commas on multi-line, 1tbs brace style, spaces inside object braces. Run with `npm run lint`.

## Gotchas

- **Voice gateway version**: Discord deprecated voice gateway v4. `@discordjs/voice` must be `^0.19.x` or newer (which speaks v8 / DAVE). If `/taunt` joins the channel but stays muted and times out with an `AbortError` from `entersState`, the voice library is probably too old. Note that `@discordjs/voice` >= 0.19 requires Node ≥ 22.12 — older Node will install the package but the voice stack misbehaves.
- **`discord.js` and `@discordjs/voice` versions must stay aligned.** A `discord.js` bump pulls a newer `discord-api-types`, and if `@discordjs/voice` is still on an old one, `voiceAdapterCreator` fails TS2322 with `InternalDiscordGatewayAdapterCreator` not assignable to `DiscordGatewayAdapterCreator`. Bump both together.
- **Regenerating `package-lock.json` must use the container's npm version.** Local npm versions newer than the container's can write optional WASM-runtime deps the container's `npm ci` rejects with "Missing: @emnapi/core … from lock file". To regenerate cleanly, run npm install inside the same Node image the Dockerfile uses: `docker run --rm -v "$PWD":/work -w /work node:24.15.0-alpine npm install --package-lock-only` (update the image tag to match `ARG NODE_VERSION` in the Dockerfile).
- **`network_mode: host` is not needed.** Voice works on the default Docker bridge once the gateway version is current. Don't add it back without evidence it's required.
