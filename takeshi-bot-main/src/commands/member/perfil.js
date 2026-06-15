import { ASSETS_DIR, PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";
import { getProfileImageData } from "../../services/baileys.js";
import { isGroup, onlyNumbers } from "../../utils/index.js";
import { errorLog } from "../../utils/logger.js";

export default {
  name: "perfil",
  description: "Mostra informações de um usuário",
  commands: ["perfil", "profile"],
  usage: `${PREFIX}perfil ou perfil @usuario`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    args,
    socket,
    remoteJid,
    userLid,
    sendErrorReply,
    sendWaitReply,
    sendSuccessReact,
    sendReply,
    sendReact,
  }) => {
    if (args[0] && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args[0])) {
      const email = args[0];
      await sendWaitReply(`Buscando cadastro do cliente para o e-mail \`${email}\` no site da loja...`);
      try {
        const response = await fetch(`http://localhost:3000/api/bot/customer/${encodeURIComponent(email)}`, {
          headers: {
            "X-Bot-Token": "{corujabot_1lv0KF2mAxgqgkHPrMbVeuW5zag4}"
          }
        });
        if (!response.ok) {
          throw new Error(`Erro na API (${response.status})`);
        }
        const client = await response.json();
        let text = `💳 *PERFIL DO CLIENTE NO SITE DA LOJA* 💳\n`;
        text += `=====================================\n\n`;
        text += `👤 *Nome:* ${client.name || "Não Definido"}\n`;
        text += `📧 *E-mail:* ${client.email}\n`;
        text += `💰 *Saldo em Carteira:* R$ ${parseFloat(client.balance || 0).toFixed(2)}\n\n`;
        text += `📈 *ÚLTIMAS TRANSAÇÕES:* \n`;
        
        if (!client.transactions || client.transactions.length === 0) {
          text += `   _Nenhuma transação recente encontrada._\n`;
        } else {
          client.transactions.forEach((tx) => {
            const sign = tx.type === "credit" ? "+" : "-";
            text += `🔸 *${tx.date || ""}* | [${tx.id || ""}]\n`;
            text += `   Valor: ${sign} R$ ${Math.abs(parseFloat(tx.amount)).toFixed(2)}\n`;
            text += `   Motivo: _${tx.reason || "Não especificado"}_\n\n`;
          });
        }
        text += `=====================================\n`;
        text += `🪐 Envie uma recarga usando: *${PREFIX}recarga email valor*`;
        if (sendSuccessReact) await sendSuccessReact();
        await sendReply(text);
        return;
      } catch (err) {
        errorLog(`Erro ao buscar dados do cliente: ${err.message}`);
        await sendReply("❌ Não foi possível carregar os dados cadastrais da carteira deste e-mail.");
        return;
      }
    }

    if (!isGroup(remoteJid)) {
      throw new InvalidParameterError(
        "Este comando só pode ser usado em grupo."
      );
    }

    const targetLid = args[0] ? `${onlyNumbers(args[0])}@lid` : userLid;

    await sendWaitReply("Carregando perfil...");

    try {
      let profilePicUrl;
      let userRole = "Membro";

      try {
        const { profileImage } = await getProfileImageData(socket, targetLid);
        profilePicUrl = profileImage || `${ASSETS_DIR}/images/default-user.png`;
      } catch (error) {
        errorLog(
          `Erro ao tentar pegar dados do usuário ${targetLid}: ${JSON.stringify(
            error,
            null,
            2
          )}`
        );
        profilePicUrl = `${ASSETS_DIR}/images/default-user.png`;
      }

      const groupMetadata = await socket.groupMetadata(remoteJid);

      const participant = groupMetadata.participants.find(
        (participant) => participant.id === targetLid
      );

      if (participant?.admin) {
        userRole = "Administrador";
      }

      const randomPercent = Math.floor(Math.random() * 100);
      const programPrice = (Math.random() * 5000 + 1000).toFixed(2);
      const beautyLevel = Math.floor(Math.random() * 100) + 1;

      const mensagem = `
👤 *Nome:* @${targetLid.split("@")[0]}
🎖️ *Cargo:* ${userRole}

🌚 *Programa:* R$ ${programPrice}
🐮 *Gado:* ${randomPercent + 7 || 5}%
🎱 *Passiva:* ${randomPercent + 5 || 10}%
✨ *Beleza:* ${beautyLevel}%`;

      const mentions = [targetLid];

      await sendSuccessReact();

      await socket.sendMessage(remoteJid, {
        image: { url: profilePicUrl },
        caption: mensagem,
        mentions: mentions,
      });
    } catch (error) {
      console.error(error);
      sendErrorReply("Ocorreu um erro ao tentar verificar o perfil.");
    }
  },
};
