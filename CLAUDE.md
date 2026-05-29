# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Org-wide conventions (toolchain, script vocabulary, style, deploy patterns, Node version policy) live in [`org-conventions.md`](./org-conventions.md) — vendored from <https://github.com/the-darkwire/conventions>. This file covers what's specific to roggan-bot.

## What this is

A Discord bot that joins the invoking user's voice channel and plays an Age of Empires II taunt sound. The bot exposes a single slash command, `/taunt <tauntid> [ephemeral]`, where `tauntid` is a number from 1–42 corresponding to an mp3 in `assets/`.

## Commands

Package manager is **pnpm** (the-darkwire org standard). Runtime executor is **tsx** (no build step; `tsconfig.json` has `noEmit: true`).

- `pnpm dev` / `pnpm start` — runs the bot via `tsx index.ts`. Identical commands; `start` is the production entry, `dev` exists for parity with other org repos.
- `pnpm deploy-commands` — registers/refreshes the slash commands with Discord's REST API. The deploy workflow runs this automatically on push to `main`, so you only need to invoke it manually when iterating on `SlashCommandBuilder` data locally before merging.
- `pnpm typecheck` — `tsc --noEmit`. The single most useful feedback loop when editing.
- `pnpm lint` / `pnpm lint:fix` — Biome lint (read / autofix).
- `pnpm format` — Biome format (write).
- `pnpm check` — Biome combined lint + format (write).
- `pnpm test` / `pnpm test:watch` — Vitest. Currently only a smoke test exists.
- `docker compose up --build` — runs in the container defined by `Dockerfile` + `compose.yaml`.

`.env` must define `TOKEN` (Discord bot token) and `CLIENT_ID` (Discord application ID); both are read in `src/config.ts`.

## Architecture

Entry point is `index.ts`: it constructs a `discord.js` `Client` with the `Guilds`, `GuildMessages`, `GuildVoiceStates`, and `MessageContent` intents, logs in with the token, and delegates every `InteractionCreate` event to `routeInteraction`.

`src/interaction-router.ts` is the single dispatch point — a `switch` on `interaction.commandName` calls into the matching command's `execute`. Non-chat-input interactions are ignored. Adding a new slash command means:
1. Create `src/commands/<name>.ts` exporting both `data` (a `SlashCommandBuilder`) and `execute`.
2. Add a `case` in `interaction-router.ts`.
3. Import the new `data` in `src/deploy-commands.ts` and add it to the `commands` array.
4. Discord picks up the new command on the next deploy (the workflow runs `pnpm deploy-commands` automatically). To test locally before merging, run `pnpm deploy-commands` yourself.

`src/commands/taunt.ts` holds the voice-playback flow: validate the tauntID, look up the caller's `VoiceBasedChannel` via `guild.members.cache → member.voice.channel`, `deferReply()` (the voice handshake can exceed Discord's 3-second ack window), `joinVoiceChannel` from `@discordjs/voice`, await `VoiceConnectionStatus.Ready` (10s timeout), then play the mp3 with a per-invocation `AudioPlayer` (`StreamType.Raw`, `NoSubscriberBehavior.Stop`), and `editReply` with the result. Active sessions are tracked in a `Map<guildId, { player, connection }>` so a rapid second `/taunt` in the same guild tears down the previous session before starting a new one; cross-guild invocations are fully independent. On `AudioPlayerStatus.Idle` the handler tears down the session if it's still current (guards against a stale Idle firing after a newer session has replaced it). Any new command that does I/O over ~2s should follow the same `deferReply` + `editReply` pattern. Any new audio command sharing voice infrastructure should keep its own per-guild session map rather than reintroducing a module-scoped player.

`/taunt` also supports autocomplete on `tauntid` (handled by the `autocomplete` export, dispatched in `interaction-router.ts` for `AutocompleteInteraction`s) and an `ephemeral` boolean option that is read once and threaded through every `reply`/`deferReply` call.

Taunt IDs 43–105 are reserved for the Definitive Edition but no audio files exist for them yet; the command rejects those explicitly with a different message than out-of-range IDs. The ID→reply-text map and bounds live in `src/constants/taunts.ts`; `src/utils/getAudioFilePath.ts` maps an ID to `assets/NN.mp3` (zero-padded).

## Style conventions

Enforced by `biome.json` at the repo root (org-wide convention). Double quotes, semicolons required, trailing commas everywhere (`"all"`), 2-space indent, 100-char line width, organized imports on save. Run `pnpm check` to autofix everything in one shot.

## Gotchas

- **Voice gateway version**: Discord deprecated voice gateway v4. `@discordjs/voice` must be `^0.19.x` or newer (which speaks v8 / DAVE). If `/taunt` joins the channel but stays muted and times out with an `AbortError` from `entersState`, the voice library is probably too old. Note that `@discordjs/voice` >= 0.19 requires Node ≥ 22.12 — older Node will install the package but the voice stack misbehaves.
- **`discord.js` and `@discordjs/voice` versions must stay aligned.** A `discord.js` bump pulls a newer `discord-api-types`, and if `@discordjs/voice` is still on an old one, `voiceAdapterCreator` fails TS2322 with `InternalDiscordGatewayAdapterCreator` not assignable to `DiscordGatewayAdapterCreator`. Bump both together.
- **Lockfile regeneration may need the container's Node version.** If `pnpm install --frozen-lockfile` fails inside the container with optional-dep mismatches, regenerate the lockfile inside a matching Node image: `docker run --rm -v "$PWD":/work -w /work node:24.15.0-alpine sh -c "corepack enable && pnpm install --lockfile-only"` (match the image tag to `ARG NODE_VERSION` in the Dockerfile).
- **`network_mode: host` is not needed.** Voice works on the default Docker bridge once the gateway version is current. Don't add it back without evidence it's required.
