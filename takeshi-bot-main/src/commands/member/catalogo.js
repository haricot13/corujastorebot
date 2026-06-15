import { PREFIX } from "../../config.js";
import { errorLog } from "../../utils/logger.js";

export default {
  name: "catalogo",
  description: "Consulta o catálogo de produtos da loja na API direta.",
  commands: ["catalogo", "catalog", "produtos", "produtosloja", "p"],
  usage: `${PREFIX}catalogo`,
  handle: async ({ sendReply, sendWaitReply, sendReact }) => {
    await sendReact("🛒");
    await sendWaitReply("Buscando catálogo de produtos na loja...");

    try {
      const response = await fetch("http://localhost:3000/api/bot/products", {
        headers: {
          "X-Bot-Token": "{corujabot_1lv0KF2mAxgqgkHPrMbVeuW5zag4}"
        }
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const products = await response.json();
      if (!Array.isArray(products) || products.length === 0) {
        await sendReply("🛍️ Nenhum produto cadastrado no catálogo atualmente.");
        return;
      }

      let text = `📦 *CATÁLOGO DE PRODUTOS DA LOJA* 🛍️\n`;
      text += `==============================\n\n`;

      products.forEach((prod, index) => {
        text += `*${index + 1}. ${prod.name}*\n`;
        text += `🔹 Código: \`${prod.id}\`\n`;
        text += `💰 Preço: R$ ${parseFloat(prod.price).toFixed(2)}\n`;
        text += `🏷️ Categoria: _${prod.category || "Geral"}_\n`;
        text += `📦 Estoque: ${prod.stock} un.\n`;
        text += `\n------------------------------\n\n`;
      });

      text += `🪐 Para consultar um pedido específico use: *${PREFIX}pedido ID*`;

      await sendReply(text);
    } catch (error) {
      errorLog(`Erro ao buscar produtos no WhatsApp Bot: ${error.message}`);
      await sendReply("❌ Desculpe, não consegui carregar o catálogo de produtos no momento. Tente novamente mais tarde.");
    }
  }
};
