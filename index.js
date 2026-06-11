require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType
} = require('@discordjs/voice');

const path = require('path');
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

require('opusscript');
require('libsodium-wrappers');

// Health check
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('10 Bots - Nuclear Stacked');
}).listen(PORT);

const tokens = [
  process.env.TOKEN1, process.env.TOKEN2, process.env.TOKEN3, process.env.TOKEN4, process.env.TOKEN5,
  process.env.TOKEN6, process.env.TOKEN7, process.env.TOKEN8, process.env.TOKEN9, process.env.TOKEN10
].filter(t => t);

console.log(`Starting ${tokens.length} bots in NUCLEAR STACKED mode...`);

tokens.forEach((token, index) => {
  const botNum = index + 1;
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates
    ]
  });

  const slashCommands = [
    { name: 'bcva', description: 'Make the bot join your voice channel' },
    { name: 'bcst', description: 'Start normalized audio playback' },
    { name: 'bcsp', description: 'Stop audio playback' },
    { name: 'bclv', description: 'Leave the voice channel' }
  ];

  let connection;
  let player;

  const safeDestroy = (conn) => {
    try {
      if (!conn) return;
      const status = conn.state && conn.state.status;
      if (status !== VoiceConnectionStatus.Destroyed) conn.destroy();
    } catch (e) {
      // ignore double-destroy or other race errors
    }
  };

  const handleBotCommand = async (commandName, reply, guild, member) => {
    if (!guild || !member) return reply('Command failed: missing guild or member data.');

    // Admin check
    if (!member.permissions.has('Administrator')) {
      return reply('❌ You need **Administrator** permissions to use this command.');
    }

    if (commandName === 'bcva') {
      const vc = member.voice.channel;
      if (!vc) return reply('You need to be in a voice channel first.');

      setTimeout(async () => {
        try {
          safeDestroy(connection);
          connection = joinVoiceChannel({
            channelId: vc.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            group: client.user.id
          });
          console.log(`[Bot ${botNum}] JOINED ✅`);
          await reply('✅ Joined your voice channel.');
        } catch (err) {
          console.error(`[Bot ${botNum}] JOIN ERROR:`, err.message);
          await reply('❌ Failed to join voice channel.');
        }
      }, botNum * 200);

      return;
    }

    if (commandName === 'bcst') {
      if (!connection) return reply('Bot is not in a voice channel.');

      const audioPath = path.join(__dirname, 'mega_loud.mp3');
      if (!fs.existsSync(audioPath)) return reply('Audio file not found.');

      setTimeout(() => {
        const resource = createAudioResource(audioPath, {
          inlineVolume: true
        });

        if (resource.volume) {
          resource.volume.setVolume(1.0);
        }

        player = createAudioPlayer();
        player.play(resource);
        connection.subscribe(player);
        console.log(`[Bot ${botNum}] AUDIO PLAYING`);
      }, botNum * 100);

      return reply('✅ Started audio playback.');
    }

    if (commandName === 'bcsp') {
      if (player) player.stop();
      return reply('✅ Audio stopped.');
    }

    if (commandName === 'bclv') {
      safeDestroy(connection);
      return reply('✅ Left voice channel.');
    }

    return reply('Unknown command.');
  };

  client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const content = message.content.trim().toLowerCase();
    if (!['!bcva', '!bcst', '!bcsp', '!bclv'].includes(content)) return;

    const reply = async text => {
      try {
        const perms = message.channel.permissionsFor(message.guild?.members?.me ?? client.user);
        if (!perms || !perms.has('SendMessages')) {
          console.error(`[Bot ${botNum}] MESSAGE REPLY FAILED: Missing Permissions`);
          return;
        }
        await message.reply(text);
      } catch (err) {
        console.error(`[Bot ${botNum}] MESSAGE REPLY FAILED:`, err.message);
      }
    };

    await handleBotCommand(content.slice(1), reply, message.guild, message.member);
  });

  client.on('ready', async () => {
    console.log(`[Bot ${botNum}] ONLINE ✅`);

    try {
      if (client.application && client.application.commands && typeof client.application.commands.set === 'function') {
        await client.application.commands.set(slashCommands);
        console.log(`[Bot ${botNum}] Registered global slash commands`);
      } else {
        const guilds = await client.guilds.fetch();
        for (const [guildId, guild] of guilds) {
          if (guild && guild.commands && typeof guild.commands.set === 'function') {
            await guild.commands.set(slashCommands);
          }
        }
        console.log(`[Bot ${botNum}] Registered slash commands in ${guilds.size} guild(s)`);
      }
    } catch (err) {
      console.error(`[Bot ${botNum}] SLASH COMMAND REGISTRATION FAILED: ${err.message}`);
    }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.user.bot) return;

    const reply = async (content) => {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content, ephemeral: true });
      } else {
        await interaction.reply({ content, ephemeral: true });
      }
    };

    await handleBotCommand(interaction.commandName, reply, interaction.guild, interaction.member);
  });

  client.login(token).catch(err => {
    console.error(`[Bot ${botNum}] LOGIN FAILED: ${err.message}`);
    if (err.code) console.error(`[Bot ${botNum}] ERROR CODE: ${err.code}`);
  });
});
