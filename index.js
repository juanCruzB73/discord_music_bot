require("dotenv").config();
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  StreamType
} = require("@discordjs/voice");
const { spawn } = require("child_process");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const player = createAudioPlayer();

player.on("error", (err) => {
  console.error("AudioPlayer error:", err.message);
});

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  console.log("MESSAGE:", message.content);

  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const args = message.content.split(" ");
  const command = args.shift().toLowerCase();

  if (command === "!play") {
    const url = args[0];
    if (!url) return message.reply("y la url dowsito");

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply("metete a un canal de voz tontito");

    try {
      // spawn yt-dlp
      const ytdlp = spawn("yt-dlp", [
        "-f", "bestaudio",
        "--no-playlist",
        "-o", "-",
        url
      ]);

      ytdlp.stderr.on("data", (data) => {
        console.error("yt-dlp:", data.toString());
      });

      const resource = createAudioResource(ytdlp.stdout, {
        inputType: StreamType.Arbitrary
      });

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
      });

      connection.subscribe(player);
      player.play(resource);

      message.reply("Playing audio");

    } catch (err) {
      console.error(err);
      message.reply("Failed to play audio");
    }
  }

  if (command === "!stop") {
    player.stop();
    message.reply("Stopped");
  }
});

client.login(process.env.TOKEN);
