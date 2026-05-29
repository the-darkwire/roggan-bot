import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { MAXIMUM_TAUNT_ID, MINIMUM_TAUNT_ID, TauntIDToMessageMap } from "../constants/taunts";
import { listUserPinnedTauntIds, unpinTauntForUser } from "../db";

const AUTOCOMPLETE_MAX_CHOICES = 25;

export const data = new SlashCommandBuilder()
  .setName("taunt-unpin")
  .setDescription("Remove a taunt from your pinned list")
  .addNumberOption((option) =>
    option
      .setName("tauntid")
      .setDescription("The pinned taunt ID to remove")
      .setRequired(true)
      .setMinValue(MINIMUM_TAUNT_ID)
      .setMaxValue(MAXIMUM_TAUNT_ID)
      .setAutocomplete(true),
  );

export const autocomplete = async (interaction: AutocompleteInteraction) => {
  const query = interaction.options.getFocused().toString().trim().toLowerCase();
  const pinnedIds = listUserPinnedTauntIds(interaction.user.id);

  const matches = pinnedIds
    .map((id) => ({ id, message: TauntIDToMessageMap[id] ?? `taunt ${id}` }))
    .filter(({ id, message }) => {
      if (!query) return true;
      return id.toString().startsWith(query) || message.toLowerCase().includes(query);
    });

  await interaction.respond(
    matches.slice(0, AUTOCOMPLETE_MAX_CHOICES).map(({ id, message }) => ({
      name: `${id} — ${message}`,
      value: id,
    })),
  );
};

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const tauntId = interaction.options.getNumber("tauntid", true);
  const message = TauntIDToMessageMap[tauntId] ?? `taunt ${tauntId}`;
  const flags = MessageFlags.Ephemeral;

  const { deleted } = unpinTauntForUser(interaction.user.id, tauntId);
  if (!deleted) {
    await interaction.reply({
      content: `**${tauntId} — ${message}** wasn't in your pins`,
      flags,
    });
    return;
  }

  await interaction.reply({ content: `Unpinned **${tauntId} — ${message}**`, flags });
};
