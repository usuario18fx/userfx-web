const fs = require('fs');
const path = 'api/telegram.js';
let text = fs.readFileSync(path, 'utf8');

const oldBlock = `  function getChannelsKeyboard() {
      return Markup.keyboard([
        [ BTN_SMOKELANDIA,
          BTN_USERFX_SITE, ] ,
        [ BTN_BACK_MENU, ] ,]).resize();
        }`;

const newBlock = `  function getChannelsKeyboard() {
      return Markup.inlineKeyboard([
        [ Markup.button.url(
            BTN_SMOKELANDIA,
            SMOKELANDIA_GROUP_LINK), ],
        [ Markup.button.url(
            BTN_USERFX_SITE,
            USERFX_SITE_URL), ],
        [ Markup.button.callback(
            BTN_BACK_MENU,
            "channels_back"), ],
        ]);
        }`;

if (!text.includes(oldBlock)) {
  throw new Error('getChannelsKeyboard block not found; refusing to patch');
}

text = text.replace(oldBlock, newBlock);

if (!text.includes('"channels_back", async (ctx)')) {
  const marker = '//// PRE CHECKOUT // ';
  const action = `//// CHANNELS BACK ACTION //
    bot.action(
        "channels_back", async (ctx) => {
        try {
        await ctx.answerCbQuery();
        return await sendMainPanel(ctx);
        }
        catch (error) {logger.error(
        "CHANNELS BACK ERROR", getTelegramError(error));
        }
        });
`;

  if (!text.includes(marker)) {
    throw new Error('PRE CHECKOUT marker not found; refusing to patch');
  }
  text = text.replace(marker, action + marker);
}

fs.writeFileSync(path, text, 'utf8');
