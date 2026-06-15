import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const dbConfigPath = path.resolve(process.cwd(), "takeshi-bot-main", "database", "config.json");
let dbConfig = {};
try {
  if (fs.existsSync(dbConfigPath)) {
    dbConfig = JSON.parse(fs.readFileSync(dbConfigPath, "utf8"));
  }
} catch (e) {
  console.error("[Coruja Store Bot] Erro ao carregar config.json nos módulos:", e.message);
}

// Prefixo padrão dos comandos.
export const PREFIX = dbConfig.prefix || "/";

// Emoji do bot (mude se preferir).
export const BOT_EMOJI = dbConfig.bot_emoji || "🪐";

// Nome do bot (mude se preferir).
export const BOT_NAME = dbConfig.bot_name || "Coruja Store Bot";

// LID do bot.
// Para obter o LID do bot, use o comando <prefixo>lid respondendo em cima de uma mensagem do número do bot
// Troque o <prefixo> pelo prefixo do bot (ex: /lid).
export const BOT_LID = "12345678901234567890@lid";

// LID do dono do bot.
// Para obter o LID do dono do bot, use o comando <prefixo>meu-lid
// Troque o <prefixo> pelo prefixo do bot (ex: /meu-lid).
export const OWNER_LID = "12345678901234567890@lid";

// Diretório dos comandos
export const COMMANDS_DIR = path.resolve(process.cwd(), "takeshi-bot-main", "src", "commands");

// Diretório de arquivos de mídia.
export const DATABASE_DIR = path.resolve(process.cwd(), "takeshi-bot-main", "database");

// Diretório de arquivos de mídia.
export const ASSETS_DIR = path.resolve(process.cwd(), "takeshi-bot-main", "assets");

// Diretório de arquivos temporários.
export const TEMP_DIR = path.resolve(process.cwd(), "takeshi-bot-main", "assets", "temp");

// Timeout em milissegundos por evento (evita banimento).
export const TIMEOUT_IN_MILLISECONDS_BY_EVENT = 500;

// Plataforma de API's
export const SPIDER_API_BASE_URL = "https://api.spiderx.com.br/api";

// Obtenha seu token, criando uma conta em: https://api.spiderx.com.br.
export const SPIDER_API_TOKEN = dbConfig.spider_api_token || "seu_token_aqui";

// Plataforma recomendada para o comando gerar-link.
// Com chave propria do Linker, os links seguem a duracao do plano Linker.
// Com token da Spider X API, os links duram 1 dia.
export const LINKER_BASE_URL = "https://linker.devgui.dev/api";

// Obtenha sua chave em: https://linker.devgui.dev.
// Voce tambem pode usar seu token da Spider X API aqui.
export const LINKER_API_KEY = dbConfig.linker_api_key || "seu_token_aqui";

// Caso queira responder apenas um grupo específico,
// coloque o ID dele na configuração abaixo.
// Para saber o ID do grupo, use o comando <prefixo>get-group-id
// Troque o <prefixo> pelo prefixo do bot (ex: /get-group-id).
export const ONLY_GROUP_ID = dbConfig.only_group_id || "";

// Configuração para modo de desenvolvimento
// mude o valor para ( true ) sem os parênteses
// caso queira ver os logs de mensagens recebidas
export const DEVELOPER_MODE = dbConfig.developer_mode !== undefined ? dbConfig.developer_mode : false;

// Caso queira usar proxy.
export const PROXY_PROTOCOL = "http";
export const PROXY_HOST = "";
export const PROXY_PORT = "";
export const PROXY_USERNAME = "";
export const PROXY_PASSWORD = "";

// Chave da OpenAI para o comando de suporte
export const OPENAI_API_KEY = dbConfig.openai_api_key || "";
