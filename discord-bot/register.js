// 將斜線指令登記去你個 Discord 伺服器（改咗 commands.js 先要再行一次）：npm run register
import { REST, Routes } from 'discord.js';
import { COMMANDS } from './commands.js';

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('Missing DISCORD_TOKEN, CLIENT_ID or GUILD_ID in .env (see .env.example)');
  process.exit(1);
}
await new REST().setToken(DISCORD_TOKEN).put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: COMMANDS });
console.log(`Registered ${COMMANDS.length} commands: ${COMMANDS.map((c) => '/' + c.name).join(', ')}`);
