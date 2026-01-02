require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  AudioPlayerStatus
} = require("@discordjs/voice");
const { spawn } = require("child_process");


let queue = [];
let connection = null;
let isPlaying = false;


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

player.on(AudioPlayerStatus.Idle, () => {
  if (queue.length > 0) {
    const next = queue.shift();
    playUrl(next.url, next.voiceChannel, next.guild);
  } else {
    isPlaying = false;
  }
});


function playUrl(url, voiceChannel, guild) {
  const ytdlp = spawn("yt-dlp", [
    "-f", "bestaudio",
    "--no-playlist",
    "-o", "-",
    url
  ]);

  // 🔴 IMPORTANT: prevent crashes
  ytdlp.on("error", (err) => {
    console.error("yt-dlp spawn error:", err);
  });

  ytdlp.stderr.on("data", (data) => {
    console.error("yt-dlp:", data.toString());
  });

  const resource = createAudioResource(ytdlp.stdout, {
    inputType: StreamType.Arbitrary
  });

  if (!connection) {
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator
    });

    connection.subscribe(player);
  }

  player.play(resource);
  isPlaying = true;
}

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const args = message.content.split(" ");
  const command = args.shift().toLowerCase();

  if (command === "!play") {
    const url = args[0];
    if (!url) return message.reply("y la url dowsito");

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel)
      return message.reply("metete a un canal de voz tontito");

    if (isPlaying) {
      queue.push({ url, voiceChannel, guild: message.guild });
      return message.reply(`Added to queue (#${queue.length})`);
    } else {
      playUrl(url, voiceChannel, message.guild);
      return message.reply("Playing audio");
    }
  }

  if (command === "!queue") {
    if (queue.length === 0)
      return message.reply("Queue is empty");

    return message.reply(
      queue.map((q, i) => `${i + 1}. ${q.url}`).join("\n")
    );
  }

  if (command === "!skip") {
    player.stop();
    return message.reply("Skipped");
  }

  if (command === "!stop") {
    queue = [];
    isPlaying = false;
    player.stop();

    if (connection) {
      connection.destroy();
      connection = null;
    }

    return message.reply("Stopped and cleared queue");
  }
});

client.login(process.env.TOKEN);
