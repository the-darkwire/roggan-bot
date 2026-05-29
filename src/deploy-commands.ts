import { REST, Routes } from "discord.js";
import { data as tauntCommandData } from "./commands/taunt";
import { data as tauntPinCommandData } from "./commands/taunt-pin";
import { data as tauntPinsCommandData } from "./commands/taunt-pins";
import { data as tauntUnpinCommandData } from "./commands/taunt-unpin";
import { clientID, token } from "./config";

const commands = [
  tauntCommandData.toJSON(),
  tauntPinCommandData.toJSON(),
  tauntUnpinCommandData.toJSON(),
  tauntPinsCommandData.toJSON(),
];

const rest = new REST({ version: "10" }).setToken(token ?? "");

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = (await rest.put(Routes.applicationCommands(clientID ?? ""), {
      body: commands,
    })) as unknown[];

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
