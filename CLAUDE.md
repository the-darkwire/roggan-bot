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

`src/commands/taunt.ts` holds the voice-playback flow: validate the tauntID, look up the caller's `VoiceBasedChannel` via `guild.members.cache → member.voice.channel`, `joinVoiceChannel` from `@discordjs/voice`, await `VoiceConnectionStatus.Ready` (10s timeout), then play the mp3 with a single module-scoped `audioPlayer` (`StreamType.Raw`, `NoSubscriberBehavior.Stop`). On `AudioPlayerStatus.Idle` the player stops, unsubscribes, and disconnects. Because the `audioPlayer` is module-scoped (created once at import), concurrent invocations across guilds share the same player and will interfere with each other — keep this in mind before adding new audio commands.

Taunt IDs 43–105 are reserved for the Definitive Edition but no audio files exist for them yet; the command rejects those explicitly with a different message than out-of-range IDs. The ID→reply-text map and bounds live in `src/constants/taunts.ts`; `src/utils/getAudioFilePath.ts` maps an ID to `assets/NN.mp3` (zero-padded).

## Style conventions (from `.eslintrc.json`)

Single quotes, semicolons required, trailing commas on multi-line, 1tbs brace style, spaces inside object braces.
