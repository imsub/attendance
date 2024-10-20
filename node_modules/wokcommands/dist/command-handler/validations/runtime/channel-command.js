"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = async (command, usage) => {
    const { commandName, instance } = command;
    const { guild, channel, message, interaction } = usage;
    if (!guild || !instance.isConnectedToDB) {
        return true;
    }
    const availableChannels = await instance.commandHandler.channelCommands.getAvailableChannels(guild.id, commandName);
    if (availableChannels.length && !availableChannels.includes(channel.id)) {
        const channelNames = availableChannels.map((c) => `<#${c}> `);
        const content = `You can only run this command inside of the following channels: ${channelNames}.`;
        if (message) {
            message.reply({ content });
        }
        else if (interaction) {
            interaction.reply({ content, ephemeral: true });
        }
        return false;
    }
    return true;
};
