import {
  type AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
  type VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  type VoiceBasedChannel,
} from "discord.js";
import {
  MAXIMUM_TAUNT_ID,
  MAXIMUM_TAUNT_ID_DEFINITIVE_EDITION,
  MINIMUM_TAUNT_ID,
  TauntIDToMessageMap,
} from "../constants/taunts";
import { getAudioFilePath } from "../utils/getAudioFilePath";

export const data = new SlashCommandBuilder()
  .setName("taunt")
  .setDescription("Joins the user's voice channel and plays a specified AoE2 taunt")
  .addNumberOption((option) =>
    option
      .setName("tauntid")
      .setDescription("The AoE2 taunt ID to play")
      .setRequired(true)
      .setMinValue(MINIMUM_TAUNT_ID)
      .setMaxValue(MAXIMUM_TAUNT_ID)
      .setAutocomplete(true),
  )
  .addBooleanOption((option) =>
    option
      .setName("ephemeral")
      .setDescription("Only show the text reply to you (audio still plays for everyone)"),
  );

type GuildSession = { player: AudioPlayer; connection: VoiceConnection };
const guildSessions = new Map<string, GuildSession>();

const tearDownSession = (session: GuildSession) => {
  session.player.stop();
  session.connection.destroy();
};

const connectToVoiceChannel = async (channel: VoiceBasedChannel) => {
  const connection = joinVoiceChannel({
    adapterCreator: channel.guild.voiceAdapterCreator,
    channelId: channel.id,
    guildId: channel.guildId,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 10 * 1000);
    return connection;
  } catch (e) {
    connection.destroy();
    throw e;
  }
};

const joinVoiceChannelAndPlayTaunt = async (voiceChannel: VoiceBasedChannel, tauntID: number) => {
  const filePath = getAudioFilePath(tauntID);
  if (!filePath) throw new Error("No file path for given tauntID");

  const guildId = voiceChannel.guildId;
  const previous = guildSessions.get(guildId);
  if (previous) {
    tearDownSession(previous);
    guildSessions.delete(guildId);
  }

  const connection = await connectToVoiceChannel(voiceChannel);
  const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Stop },
  });
  const resource = createAudioResource(filePath, { inputType: StreamType.Raw });
  player.play(resource);
  connection.subscribe(player);

  const session: GuildSession = { player, connection };
  guildSessions.set(guildId, session);

  player.once(AudioPlayerStatus.Idle, () => {
    if (guildSessions.get(guildId) === session) {
      tearDownSession(session);
      guildSessions.delete(guildId);
    }
  });
};

const AUTOCOMPLETE_MAX_CHOICES = 25;

// Discord caps autocomplete responses at 25, so when the user hasn't typed anything we surface
// these iconic taunts first to make sure they fit in the visible window.
const PINNED_TAUNT_IDS = [30, 29, 11, 1, 2, 24, 42] as const;

const tauntChoicesById = Object.entries(TauntIDToMessageMap)
  .map(([id, message]) => ({ id: Number(id), message }))
  .sort((a, b) => a.id - b.id);

const pinnedTauntIdSet = new Set<number>(PINNED_TAUNT_IDS);
const tauntChoicesPinnedFirst = [
  ...PINNED_TAUNT_IDS.map((id) => {
    const choice = tauntChoicesById.find((c) => c.id === id);
    if (!choice) throw new Error(`Pinned taunt id ${id} not present in TauntIDToMessageMap`);
    return choice;
  }),
  ...tauntChoicesById.filter((c) => !pinnedTauntIdSet.has(c.id)),
];

export const filterTauntChoices = (query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return tauntChoicesPinnedFirst;
  return tauntChoicesById.filter(
    ({ id, message }) =>
      id.toString().startsWith(normalized) || message.toLowerCase().includes(normalized),
  );
};

export const autocomplete = async (interaction: AutocompleteInteraction) => {
  const matches = filterTauntChoices(interaction.options.getFocused().toString());

  await interaction.respond(
    matches.slice(0, AUTOCOMPLETE_MAX_CHOICES).map(({ id, message }) => ({
      name: `${id} — ${message}`,
      value: id,
    })),
  );
};

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const tauntID = interaction.options.getNumber("tauntid");
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;
  const flags = ephemeral ? MessageFlags.Ephemeral : undefined;

  const guild = interaction.client.guilds.cache.get(interaction.guildId ?? "");
  const member = guild?.members.cache.get(interaction.member?.user.id ?? "");
  const voiceChannel = member?.voice.channel;
  if (!voiceChannel) {
    interaction.reply({ content: "You're not in a voice channel for me to join", flags });
    return;
  }
  const messageChannel = interaction.channel;
  if (!messageChannel) {
    interaction.reply({ content: "Something isn't working...", flags });
    console.error("How did this interaction not have a message channel? ", interaction);
    return;
  }

  if (!tauntID) {
    interaction.reply({ content: "No taunt specified", flags });
    return;
  }
  if (tauntID > MAXIMUM_TAUNT_ID && tauntID <= MAXIMUM_TAUNT_ID_DEFINITIVE_EDITION) {
    interaction.reply({
      content: "I don't have any audio files from the Definitive Edition yet",
      flags,
    });
    return;
  }
  if (tauntID < MINIMUM_TAUNT_ID || tauntID > MAXIMUM_TAUNT_ID) {
    interaction.reply({
      content: `${tauntID} isn't a valid taunt - try a number between ${MINIMUM_TAUNT_ID}-${MAXIMUM_TAUNT_ID}`,
      flags,
    });
    console.log(`Attempted to taunt with invalid argument ${tauntID}`);
    return;
  }
  await interaction.deferReply({ flags });
  try {
    await joinVoiceChannelAndPlayTaunt(voiceChannel, tauntID);
    await interaction.editReply(TauntIDToMessageMap[tauntID]);
  } catch (e) {
    console.error(e);
    try {
      await interaction.editReply("Something isn't working...");
    } catch (replyErr) {
      console.error("Failed to send error reply:", replyErr);
    }
  }
};
