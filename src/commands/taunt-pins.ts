import {
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { TauntIDToMessageMap } from "../constants/taunts";
import { listUserPinnedTauntIds, MAX_USER_PINNED_TAUNTS } from "../db";

export const data = new SlashCommandBuilder()
  .setName("taunt-pins")
  .setDescription("Show your pinned taunts");

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const pinnedIds = listUserPinnedTauntIds(interaction.user.id);
  const flags = MessageFlags.Ephemeral;

  if (pinnedIds.length === 0) {
    await interaction.reply({
      content: "You haven't pinned any taunts yet. Use `/taunt-pin` to add some.",
      flags,
    });
    return;
  }

  const lines = pinnedIds.map(
    (id) => `- **${id}** — ${TauntIDToMessageMap[id] ?? `taunt ${id}`}`,
  );
  await interaction.reply({
    content: `Your pinned taunts (${pinnedIds.length}/${MAX_USER_PINNED_TAUNTS}):\n${lines.join("\n")}`,
    flags,
  });
};
