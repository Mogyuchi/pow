const { SlashCommandBuilder } = require("@discordjs/builders");
const { objToList } = require("../utils.js");
const voiceRead = require("../voiceRead");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("読み上げのキューリストを空にして、読み上げを中断します。"),

  async execute(interaction) {
    const ctx = voiceRead.guilds.get(interaction.guild);
    if (!ctx.isJoined()) {
      return interaction.reply({
        embeds: [{
          color: 0xFF0000,
          title: "エラー",
          description: "BOTがVCに参加している必要があります。"
        }]
      });
    };

    ctx.readQueue.purge();
    ctx.player.stop();

    return interaction.reply({
      embeds: [{
        color: 0x00FF00,
        title: "読み上げを中断しました。",
        description: "読み上げキューを空にして、読み上げを中断しました。"
      }]
    });
  }
};
