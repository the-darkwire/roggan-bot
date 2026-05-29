import type { Interaction } from "discord.js";
import {
  autocomplete as autocompleteTauntCommand,
  execute as executeTauntCommand,
} from "./commands/taunt";

export const routeInteraction = async (interaction: Interaction) => {
  if (interaction.isAutocomplete()) {
    switch (interaction.commandName) {
      case "taunt":
        await autocompleteTauntCommand(interaction);
        return;
      default:
        return;
    }
  }

  if (!interaction.isChatInputCommand()) {
    console.log("Non-command interactions not currently supported, received: ", interaction);
    return;
  }

  switch (interaction.commandName) {
    case "taunt":
      await executeTauntCommand(interaction);
      return;
    default:
      return;
  }
};
