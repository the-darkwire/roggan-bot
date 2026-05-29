import type { Interaction } from "discord.js";
import {
  autocomplete as autocompleteTauntCommand,
  execute as executeTauntCommand,
} from "./commands/taunt";
import {
  autocomplete as autocompleteTauntPinCommand,
  execute as executeTauntPinCommand,
} from "./commands/taunt-pin";
import { execute as executeTauntPinsCommand } from "./commands/taunt-pins";
import {
  autocomplete as autocompleteTauntUnpinCommand,
  execute as executeTauntUnpinCommand,
} from "./commands/taunt-unpin";

export const routeInteraction = async (interaction: Interaction) => {
  if (interaction.isAutocomplete()) {
    switch (interaction.commandName) {
      case "taunt":
        await autocompleteTauntCommand(interaction);
        return;
      case "taunt-pin":
        await autocompleteTauntPinCommand(interaction);
        return;
      case "taunt-unpin":
        await autocompleteTauntUnpinCommand(interaction);
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
    case "taunt-pin":
      await executeTauntPinCommand(interaction);
      return;
    case "taunt-unpin":
      await executeTauntUnpinCommand(interaction);
      return;
    case "taunt-pins":
      await executeTauntPinsCommand(interaction);
      return;
    default:
      return;
  }
};
