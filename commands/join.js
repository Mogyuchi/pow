const { SlashCommandBuilder } = require("@discordjs/builders");
const voiceRead = require("../voiceRead");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription("ボイスチャンネルに参加します。"),

  async execute(interaction) {
    const user = await interaction.member.fetch();
    if (!user.voice.channel) {
      return interaction.reply({
        embeds: [{
          color: 0xFF0000,
          title: "エラー",
          description: "VCに参加してからコマンドを実行してください。"
        }]
      });
    }

    const ctx = voiceRead.guilds.get(interaction.guild);

    if (ctx.isJoined()) {
      return interaction.reply({
        embeds: [{
          color: 0xFF0000,
          title: "エラー",
          description: "BOTはすでにVCに参加しています。"
        }]
      });
    }

    await ctx.join(ctx.guild.channels.cache.get(interaction.channelId), interaction.member.voice.channel);

    return interaction.reply({
      embeds: [{
        color: 0x00FF00,
        title: "ボイスチャンネルに参加しました。",
        description: `テキストチャンネル: ${ctx.guild.channels.cache.get(interaction.channelId)}\nボイスチャンネル: ${interaction.member.voice.channel}`
      }]
    });
  }
};
