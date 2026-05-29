import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { MAXIMUM_TAUNT_ID, MINIMUM_TAUNT_ID, TauntIDToMessageMap } from "../constants/taunts";
import { countUserPinnedTaunts, MAX_USER_PINNED_TAUNTS, pinTauntForUser } from "../db";
import { filterTauntChoices } from "./taunt";

const AUTOCOMPLETE_MAX_CHOICES = 25;

export const data = new SlashCommandBuilder()
  .setName("taunt-pin")
  .setDescription("Pin a taunt to the top of your /taunt autocomplete suggestions")
  .addNumberOption((option) =>
    option
      .setName("tauntid")
      .setDescription("The AoE2 taunt ID to pin")
      .setRequired(true)
      .setMinValue(MINIMUM_TAUNT_ID)
      .setMaxValue(MAXIMUM_TAUNT_ID)
      .setAutocomplete(true),
  );

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
  const tauntId = interaction.options.getNumber("tauntid", true);
  const message = TauntIDToMessageMap[tauntId];
  const flags = MessageFlags.Ephemeral;

  if (!message) {
    await interaction.reply({ content: `${tauntId} isn't a valid taunt`, flags });
    return;
  }

  const count = countUserPinnedTaunts(interaction.user.id);
  if (count >= MAX_USER_PINNED_TAUNTS) {
    await interaction.reply({
      content: `You've already pinned ${count}/${MAX_USER_PINNED_TAUNTS} taunts. Use \`/taunt-unpin\` to make room.`,
      flags,
    });
    return;
  }

  const { inserted } = pinTauntForUser(interaction.user.id, tauntId);
  if (!inserted) {
    await interaction.reply({
      content: `**${tauntId} — ${message}** is already pinned`,
      flags,
    });
    return;
  }

  await interaction.reply({ content: `Pinned **${tauntId} — ${message}**`, flags });
};
