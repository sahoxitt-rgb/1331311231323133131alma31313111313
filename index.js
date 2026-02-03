require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, 
    REST, Routes, SlashCommandBuilder, Partials, PermissionFlagsBits, ChannelType, PermissionsBitField, ActivityType 
} = require('discord.js');
const express = require('express');
const axios = require('axios');

// =====================================================
//                 AYARLAR VE KONFİGÜRASYON
// =====================================================
const CONFIG = {
    FIREBASE_URL: process.env.FIREBASE_URL, 
    FIREBASE_SECRET: process.env.FIREBASE_SECRET,
    OWNER_ID: "1380526273431994449", 
    
    MASTER_VIEW_ID: "1380526273431994449",
    SUPPORT_ROLE_ID: "1380526273431994449", 

    LOG_CHANNEL_ID: "BURAYA_LOG_KANAL_ID_YAZ",       
    CUSTOMER_ROLE_ID: "BURAYA_MUSTERI_ROL_ID_YAZ",   
    
    DEFAULT_PAUSE_LIMIT: 2,
    DEFAULT_RESET_LIMIT: 1,
    VIP_PAUSE_LIMIT: 999,
    VIP_RESET_LIMIT: 5,

    EMBED_COLOR: '#2B2D31', 
    
    // 👇👇👇 BURAYA DİKKAT! 👇👇👇
    // Discord'a yüklediğin o kilitli resmin linkini tırnakların içine yapıştır:
    BANNER_URL: 'BURAYA_RESIM_LINKINI_YAPISTIR' 
};

// =====================================================
//                 1. WEB SERVER (7/24)
// =====================================================
const app = express();
app.get('/', (req, res) => res.send('SAHO CHEATS SUPPORT SYSTEM - OPERATIONAL 🟢'));
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`🌍 Web sunucusu ${port} portunda çalışıyor.`));

// =====================================================
//                 2. BOT KURULUMU
// =====================================================
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers 
    ], 
    partials: [Partials.Channel] 
});

// =====================================================
//                 3. KOMUT LİSTESİ
// =====================================================
const commands = [
    new SlashCommandBuilder().setName('ticket-kur').setDescription('🎫 (Admin) SAHO CHEATS panelini kurar.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('temizle').setDescription('🧹 (Admin) Mesaj siler.').addIntegerOption(o => o.setName('sayi').setDescription('Miktar (1-100)').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('duyuru').setDescription('📢 (Admin) Duyuru yapar.').addStringOption(o => o.setName('mesaj').setDescription('Mesaj').setRequired(true)).addChannelOption(o => o.setName('kanal').setDescription('Kanal').setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('sunucu-bilgi').setDescription('📊 (Admin) Sunucu istatistikleri.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('admin-panel').setDescription('👑 (Admin) Yönetici paneli.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('help').setDescription('❓ (Admin) Yardım menüsü.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('vip-ekle').setDescription('💎 (Admin) VIP lisans ver.').addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true)).addStringOption(o => o.setName('key_ismi').setDescription('Key Adı').setRequired(true)).addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('kullanici-ekle').setDescription('🛠️ (Admin) Normal lisans ver.').addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true)).addStringOption(o => o.setName('key_ismi').setDescription('Key Adı').setRequired(true)).addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('olustur').setDescription('🛠️ (Admin) Boş key oluştur.').addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true)).addStringOption(o => o.setName('isim').setDescription('İsim').setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('sil').setDescription('🗑️ (Admin) Key sil.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('hwid-hak-ekle').setDescription('➕ (Admin) HWID hakkı ekle.').addIntegerOption(o => o.setName('adet').setDescription('Adet').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('durdurma-hak-ekle').setDescription('➕ (Admin) Durdurma hakkı ekle.').addIntegerOption(o => o.setName('adet').setDescription('Adet').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('lisansim').setDescription('👤 Lisans durumunu gör.'),
].map(command => command.toJSON());

// =====================================================
//                 4. YARDIMCI FONKSİYONLAR
// =====================================================

async function firebaseRequest(method, path, data = null) {
    const url = `${CONFIG.FIREBASE_URL}${path}.json?auth=${CONFIG.FIREBASE_SECRET}`;
    try {
        const payload = data ? JSON.stringify(data) : null;
        const response = await axios({ method, url, data: payload, headers: { 'Content-Type': 'application/json' } });
        return response.data;
    } catch (error) { return null; }
}

async function findUserKey(discordId) {
    const data = await firebaseRequest('get', '');
    if (!data) return null;
    for (const [key, value] of Object.entries(data)) {
        if (key.startsWith("_")) continue;
        if (typeof value === 'string') {
            const parts = value.split(',');
            if (parts.length > 4 && parts[4] === discordId) return { key, parts };
        }
    }
    return null;
}

async function checkPermission(userId) {
    if (userId === CONFIG.OWNER_ID) return true;
    const admins = await firebaseRequest('get', '_ADMINS_');
    return admins && admins[userId];
}

async function getNextTicketNumber() {
    let count = await firebaseRequest('get', '_TICKET_COUNT');
    if (!count) count = 0;
    count++;
    await firebaseRequest('put', '_TICKET_COUNT', count);
    return count;
}

async function sendLog(guild, content) {
    if (!guild || !CONFIG.LOG_CHANNEL_ID || CONFIG.LOG_CHANNEL_ID === "BURAYA_LOG_KANAL_ID_YAZ") return;
    const channel = guild.channels.cache.get(CONFIG.LOG_CHANNEL_ID);
    if (channel) channel.send({ content: content }).catch(() => {});
}

function createPanelPayload(key, parts) {
    while (parts.length < 8) parts.push("0");
    const isVIP = parts[7] === 'VIP';
    const LIMITS = { PAUSE: isVIP ? CONFIG.VIP_PAUSE_LIMIT : CONFIG.DEFAULT_PAUSE_LIMIT, RESET: isVIP ? CONFIG.VIP_RESET_LIMIT : CONFIG.DEFAULT_RESET_LIMIT };
    let [durum, pause, reset] = [parts[2], parseInt(parts[5] || 0), parseInt(parts[6] || 0)];
    
    const kalanPause = Math.max(0, LIMITS.PAUSE - pause);
    const kalanReset = Math.max(0, LIMITS.RESET - reset);

    const embed = new EmbedBuilder()
        .setTitle(`⚙️ LİSANS KONTROL: ${isVIP ? '💎 VIP' : '🛠️ STANDART'}`)
        .setDescription(`Lisans detaylarınız aşağıdadır. İşlem yapmak için butonları kullanın.`)
        .setColor(isVIP ? 'Gold' : CONFIG.EMBED_COLOR)
        .addFields(
            { name: '🔑 Lisans Key', value: `\`${key}\``, inline: true },
            { name: '📡 Durum', value: durum === 'aktif' ? '✅ AKTİF' : '⏸️ DURAKLATILDI', inline: true },
            { name: '\u200B', value: '\u200B', inline: false },
            { name: '⏸️ Kalan Durdurma', value: isVIP ? '∞ (Sınırsız)' : `\`${kalanPause} / ${LIMITS.PAUSE}\``, inline: true },
            { name: '💻 Kalan Reset', value: `\`${kalanReset} / ${LIMITS.RESET}\``, inline: true }
        )
        .setImage(CONFIG.BANNER_URL)
        .setFooter({ text: 'SAHO CHEATS Security Systems' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('toggle').setLabel(durum === 'aktif' ? 'DURDUR' : 'BAŞLAT').setStyle(durum === 'aktif' ? ButtonStyle.Danger : ButtonStyle.Success).setEmoji(durum === 'aktif' ? '🛑' : '▶️').setDisabled(durum === 'aktif' && !isVIP && kalanPause <= 0),
        new ButtonBuilder().setCustomId('reset').setLabel('HWID SIFIRLA').setStyle(ButtonStyle.Primary).setEmoji('🔄').setDisabled(kalanReset <= 0)
    );

    return { embeds: [embed], components: [row] };
}

// =====================================================
//                 5. BOT EVENTS
// =====================================================
client.once('ready', async () => {
    console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
    
    client.user.setActivity({
        name: 'SAHO CHEATS SUPPORT TICKET SYSTEM',
        type: ActivityType.Playing
    });

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try { 
        console.log('🔄 Komutlar güncelleniyor...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands }); 
        console.log('✨ Komutlar hazır!');
    } catch (error) { console.error(error); }

    setInterval(async () => {
        const data = await firebaseRequest('get', '');
        if (!data) return;
        const today = new Date();
        for (const [key, value] of Object.entries(data)) {
            if (key.startsWith("_") || typeof value !== 'string') continue;
            let parts = value.split(',');
            if (parts[2] === 'bitik') continue;
            const startDate = new Date(parts[3]);
            const expiryDate = new Date(startDate);
            expiryDate.setDate(startDate.getDate() + parseInt(parts[1]));
            if (today > expiryDate) {
                parts[2] = 'bitik';
                await firebaseRequest('put', key, parts.join(','));
                console.log(`❌ SÜRE DOLDU: ${key}`);
            }
        }
    }, 3600000);
});

client.on('guildMemberAdd', async member => {
    const channel = member.guild.channels.cache.find(ch => 
        ch.name.includes('gelen-giden') || ch.name.includes('hos-geldin') || ch.name.includes('kayıt') || ch.name.includes('chat')
    );
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('🚀 SAHO CHEATS AİLESİNE HOŞ GELDİN!')
        .setDescription(`Selam **${member.user}**! \nSeninle birlikte **${member.guild.memberCount}** kişi olduk.\n\nKalitenin ve güvenin tek adresi.`)
        .setColor(CONFIG.EMBED_COLOR)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setImage(CONFIG.BANNER_URL) 
        .setFooter({ text: 'SAHO CHEATS Community' });

    channel.send({ content: `${member.user}`, embeds: [embed] });
});

// =====================================================
//                 6. ETKİLEŞİM YÖNETİCİSİ
// =====================================================
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isStringSelectMenu()) return handleSelectMenu(interaction);
        if (interaction.isButton()) return handleButton(interaction);
        if (interaction.isChatInputCommand()) return handleCommand(interaction);
    } catch (e) { console.error(e); }
});

// =====================================================
//                 7. SLASH KOMUT HANDLER
// =====================================================
async function handleCommand(interaction) {
    const { commandName, options, user, guild } = interaction;
    const userId = user.id;

    if (commandName === 'ticket-kur') {
        const embed = new EmbedBuilder()
            .setTitle('🔥 SAHO CHEATS | SUPPORT TICKET SYSTEM')
            .setDescription(`
            **Hoş Geldiniz!**
            
            Aşağıdaki butonları kullanarak işlem yapabilirsiniz.
            
            🛒 **ÜRÜNLER & FİYATLAR:** Güncel hile fiyatlarını gör ve satın al.
            🛠️ **CANLI DESTEK:** Kurulum, teknik destek ve yardım.
            
            *Kalite tesadüf değildir.*
            `)
            .setColor(CONFIG.EMBED_COLOR)
            .setImage(CONFIG.BANNER_URL)
            .setFooter({ text: 'SAHO CHEATS Security Systems' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('create_ticket_buy').setLabel('SATIN AL (Fiyatlar)').setStyle(ButtonStyle.Success).setEmoji('🛒'),
            new ButtonBuilder().setCustomId('create_ticket_support').setLabel('CANLI DESTEK').setStyle(ButtonStyle.Secondary).setEmoji('🛠️')
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Panel başarıyla kuruldu!', ephemeral: true });
    }

    else if (commandName === 'temizle') {
        const amount = options.getInteger('sayi');
        if (amount > 100 || amount < 1) return interaction.reply({ content: '⚠️ 1-100 arası sayı girin.', ephemeral: true });
        await interaction.channel.bulkDelete(amount, true).catch(() => interaction.reply({ content: '❌ Mesajlar silinemedi (çok eski olabilir).', ephemeral: true }));
        await interaction.reply({ content: `🧹 **${amount}** mesaj temizlendi.`, ephemeral: true });
    }
    else if (commandName === 'duyuru') {
        const mesaj = options.getString('mesaj');
        const targetChannel = options.getChannel('kanal') || interaction.channel;
        const embed = new EmbedBuilder().setTitle('📢 SAHO CHEATS DUYURU').setDescription(mesaj).setColor(CONFIG.EMBED_COLOR).setImage(CONFIG.BANNER_URL).setFooter({ text: guild.name, iconURL: guild.iconURL() }).setTimestamp();
        await targetChannel.send({ content: '@everyone', embeds: [embed] });
        await interaction.reply({ content: '✅ Duyuru gönderildi.', ephemeral: true });
    }
    else if (commandName === 'sunucu-bilgi') {
        const embed = new EmbedBuilder()
            .setTitle(`📊 ${guild.name} İstatistikleri`)
            .addFields(
                { name: '👥 Üye Sayısı', value: `${guild.memberCount}`, inline: true },
                { name: '📅 Kuruluş Tarihi', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '💬 Kanal Sayısı', value: `${guild.channels.cache.size}`, inline: true }
            ).setColor(CONFIG.EMBED_COLOR).setThumbnail(guild.iconURL({ dynamic: true }));
        interaction.reply({ embeds: [embed] });
    }

    else if (['vip-ekle', 'kullanici-ekle', 'olustur', 'sil', 'hwid-hak-ekle', 'durdurma-hak-ekle'].includes(commandName)) {
        
        if (commandName === 'hwid-hak-ekle' || commandName === 'durdurma-hak-ekle') {
            await interaction.deferReply({ ephemeral: true });
            const data = await firebaseRequest('get', '');
            if (!data) return interaction.editReply({content: 'Veritabanı boş.'});
            const keys = Object.keys(data).filter(k => !k.startsWith("_")).slice(0, 25);
            const adet = options.getInteger('adet');
            const type = commandName === 'hwid-hak-ekle' ? 'hwid' : 'durdurma';
            const menu = new StringSelectMenuBuilder().setCustomId(`add_right_${type}_${adet}`).setPlaceholder('Key Seçiniz...').addOptions(keys.map(k => new StringSelectMenuOptionBuilder().setLabel(k).setValue(k).setEmoji('➕')));
            interaction.editReply({ content: `👇 **${type.toUpperCase()} Hakkı Eklenecek Keyi Seçin:**`, components: [new ActionRowBuilder().addComponents(menu)] });
            return;
        }

        if (commandName === 'sil') {
            await interaction.deferReply({ ephemeral: true });
            const data = await firebaseRequest('get', '');
            if (!data) return interaction.editReply({content: 'Veritabanı boş.'});
            const keys = Object.keys(data).filter(k => !k.startsWith("_")).slice(0, 25);
            const menu = new StringSelectMenuBuilder().setCustomId('delete_key').setPlaceholder('Silinecek Keyi Seçiniz...').addOptions(keys.map(k => new StringSelectMenuOptionBuilder().setLabel(k).setValue(k).setEmoji('🗑️')));
            interaction.editReply({ content: '🗑️ **Silinecek keyi seçin:**', components: [new ActionRowBuilder().addComponents(menu)] });
            return;
        }

        if (commandName.includes('ekle')) {
            await interaction.deferReply({ ephemeral: true });
            const target = options.getUser('kullanici');
            const key = options.getString('key_ismi').toUpperCase();
            const gun = options.getInteger('gun');
            const isVip = commandName === 'vip-ekle';
            const data = `bos,${gun},aktif,${new Date().toISOString().split('T')[0]},${target.id},0,0,${isVip ? 'VIP' : 'NORMAL'}`;
            await firebaseRequest('put', key, data);
            const payload = createPanelPayload(key, data.split(','));
            sendLog(guild, `🚨 **LİSANS OLUŞTURULDU**\n**Yönetici:** ${user.tag}\n**Alan:** ${target.tag}\n**Key:** ${key}\n**Süre:** ${gun} Gün`);
            interaction.editReply({ content: `✅ **${target.username}** kullanıcısına lisans tanımlandı.` });
            try { await target.send({ content: `🎉 **SAHO CHEATS Lisansınız Hazır!**`, embeds: payload.embeds, components: payload.components }); } catch (e) {}
            return;
        }

        if (commandName === 'olustur') {
            const gun = options.getInteger('gun');
            let key = options.getString('isim') || "KEY-" + Math.random().toString(36).substring(2, 8).toUpperCase();
            await firebaseRequest('put', key.toUpperCase(), `bos,${gun},aktif,${new Date().toISOString().split('T')[0]},0,0,0,NORMAL`);
            interaction.reply({ content: `🔑 **Boş Key Oluşturuldu:** \`${key.toUpperCase()}\``, ephemeral: true });
        }
    }

    else if (commandName === 'lisansim') {
        await interaction.deferReply({ ephemeral: true });
        const result = await findUserKey(userId);
        if (!result) return interaction.editReply('❌ **Sisteme kayıtlı bir lisansınız bulunmamaktadır.**');
        interaction.editReply(createPanelPayload(result.key, result.parts));
    }
    
    else if (commandName === 'help') {
        const embed = new EmbedBuilder().setTitle('🤖 SAHO CHEATS BOT').setColor(CONFIG.EMBED_COLOR).setDescription('Yönetici komutları yüklendi.').setImage(CONFIG.BANNER_URL);
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

// =====================================================
//                 8. BUTON HANDLER
// =====================================================
async function handleButton(interaction) {
    const { customId, user, guild, channel } = interaction;

    if (customId.startsWith('create_ticket_')) {
        await interaction.deferReply({ ephemeral: true });
        const type = customId.split('_')[2]; 
        const ticketNum = await getNextTicketNumber();
        const channelName = `${type}-${ticketNum}-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: interaction.channel.parentId, 
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: CONFIG.MASTER_VIEW_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
            ]
        });

        const controlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('Yetkili Çağır').setStyle(ButtonStyle.Primary).setEmoji('🔔')
        );

        if (type === 'buy') {
            const productMenu = new StringSelectMenuBuilder()
                .setCustomId('select_product')
                .setPlaceholder('📦 Bir Ürün Seçiniz...')
                .addOptions(
                    { label: 'PC UID Bypass', value: 'prod_uid', description: 'Aylık 1500₺ | Haftalık 600₺', emoji: '🛡️' },
                    { label: 'PC External', value: 'prod_external', description: 'Aylık 1500₺ | Haftalık 600₺', emoji: '🔮' },
                    { label: 'PC Mod Menü', value: 'prod_modmenu', description: 'Aylık 2000₺ | Haftalık 700₺', emoji: '👑' },
                    { label: 'PC Fake Lag', value: 'prod_fakelag', description: 'Haftalık 200₺ | Sınırsız 500₺', emoji: '💨' },
                    { label: 'Android Fake Lag', value: 'prod_android', description: 'Aylık 800₺', emoji: '📱' }
                );
            
            const menuRow = new ActionRowBuilder().addComponents(productMenu);
            const embed = new EmbedBuilder().setTitle('🛒 SAHO CHEATS MARKET').setDescription(`Hoş geldin **${user.username}**!\n\nAşağıdaki menüden ilgilendiğin ürünü seçerek detaylı fiyat bilgisini görebilirsin.`).setColor(CONFIG.EMBED_COLOR).setImage(CONFIG.BANNER_URL);
            await ticketChannel.send({ content: `${user}`, embeds: [embed], components: [menuRow, controlRow] });
        } else {
            const embed = new EmbedBuilder().setTitle('🛠️ CANLI DESTEK').setDescription(`Merhaba **${user.username}**!\n\nYetkililerimiz en kısa sürede seninle ilgilenecektir. Lütfen sorunu detaylıca yaz.`).setColor(CONFIG.EMBED_COLOR).setImage(CONFIG.BANNER_URL);
            await ticketChannel.send({ content: `${user} | <@&${CONFIG.SUPPORT_ROLE_ID}>`, embeds: [embed], components: [controlRow] });
        }
        await interaction.editReply(`✅ Ticket başarıyla açıldı: ${ticketChannel}`);
        return;
    }

    if (customId === 'close_ticket') {
        interaction.reply('🔴 **Ticket 5 saniye içinde kapatılıyor...**');
        setTimeout(() => channel.delete().catch(() => {}), 5000);
    }
    else if (customId === 'claim_ticket') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.reply({ content: '⛔ Bu komutu sadece yetkililer kullanabilir!', ephemeral: true });
        channel.send({ embeds: [new EmbedBuilder().setDescription(`✅ Bu talep **${user}** tarafından devralındı.`).setColor('Yellow')] });
    }

    if (['toggle', 'reset'].includes(customId)) {
        await interaction.deferReply({ ephemeral: true });
        const result = await findUserKey(user.id);
        if (!result) return interaction.editReply('❌ Sisteme kayıtlı lisansınız bulunamadı.');
        let { key, parts } = result;
        while (parts.length < 8) parts.push("0");
        const isVIP = parts[7] === 'VIP';
        const LIMITS = { PAUSE: isVIP ? CONFIG.VIP_PAUSE_LIMIT : CONFIG.DEFAULT_PAUSE_LIMIT, RESET: isVIP ? CONFIG.VIP_RESET_LIMIT : CONFIG.DEFAULT_RESET_LIMIT };
        let [durum, pause, reset] = [parts[2], parseInt(parts[5]), parseInt(parts[6])];

        if (customId === 'toggle') {
            if (durum === 'aktif') {
                if (!isVIP && pause >= LIMITS.PAUSE) return interaction.editReply('❌ Durdurma limitiniz doldu.');
                durum = 'pasif'; pause++;
            } else durum = 'aktif';
            parts[2] = durum; parts[5] = pause;
        } 
        else if (customId === 'reset') {
            if (reset >= LIMITS.RESET) return interaction.editReply('❌ HWID sıfırlama limitiniz doldu.');
            parts[0] = 'bos'; reset++; parts[6] = reset;
            sendLog(guild, `🔄 **HWID SIFIRLANDI**\n**Kullanıcı:** ${user.tag}\n**Key:** ${key}`);
            interaction.editReply('✅ HWID Başarıyla Sıfırlandı!');
        }
        await firebaseRequest('put', key, parts.join(','));
        await interaction.editReply(createPanelPayload(key, parts));
    }
}

// =====================================================
//                 9. SELECT MENU HANDLER
// =====================================================
async function handleSelectMenu(interaction) {
    
    if (interaction.customId === 'select_product') {
        await interaction.deferReply({ ephemeral: true });
        const val = interaction.values[0];
        let title = "", priceInfo = "";
        switch(val) {
             case 'prod_uid': title = "🛡️ PC UID BYPASS"; priceInfo = "**📆 Haftalık:** 600₺\n**🗓️ Aylık:** 1500₺\n\n*Pcden Girdiginde Mobil Olarak Görünmeni Sağlar.*"; break;
            case 'prod_external': title = "🔮 PC EXTERNAL"; priceInfo = "**📆 Haftalık:** 600₺\n**🗓️ Aylık:** 1500₺\n\n*Aimbot Head Destekli External.*"; break;
            case 'prod_modmenu': title = "👑 PC MOD MENÜ"; priceInfo = "**📆 Haftalık:** 700₺\n**🗓️ Aylık:** 2000₺\n\n*Pull Player Destekli Mod Meü.*"; break;
            case 'prod_fakelag': title = "💨 PC FAKE LAG"; priceInfo = "**📆 Haftalık:** 200₺\n**♾️ SINIRSIZ:** 500₺\n\n*Işınlanmanı Sağlar.*"; break;
            case 'prod_android': title = "📱 ANDROID FAKE LAG"; priceInfo = "**🗓️ Aylık:** 800₺\n\n*Android'de Işıınlanmanı Sağlar.*"; break;
        }
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(`${priceInfo}\n\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n💳 **SATIN ALMAK İÇİN:**\nLütfen bu kanala **IBAN** veya **PAPARA** yazarak ödeme bilgilerini isteyiniz.`)
            .setColor(CONFIG.EMBED_COLOR)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/2543/2543369.png')
            .setImage(CONFIG.BANNER_URL);
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    if (!await checkPermission(interaction.user.id)) return interaction.reply({ content: '⛔ Yetkisiz işlem.', ephemeral: true });
    
    const key = interaction.values[0];
    if (interaction.customId === 'delete_key') {
        await interaction.deferUpdate();
        await firebaseRequest('delete', key);
        interaction.editReply({ content: `✅ **${key}** başarıyla silindi!`, components: [] });
    } 
    else if (interaction.customId.startsWith('add_right_')) {
        await interaction.deferUpdate();
        const [_, __, type, amountStr] = interaction.customId.split('_');
        const amount = parseInt(amountStr);
        const raw = await firebaseRequest('get', key);
        if (raw) {
            let p = raw.split(',');
            while (p.length < 8) p.push("0");
            let idx = type === 'hwid' ? 6 : 5;
            p[idx] = Math.max(0, parseInt(p[idx]) - amount);
            await firebaseRequest('put', key, p.join(','));
            sendLog(interaction.guild, `➕ **HAK EKLENDİ**\n**Admin:** ${interaction.user.tag}\n**Key:** ${key}\n**Miktar:** +${amount} ${type.toUpperCase()}`);
            interaction.editReply({ content: `✅ **${key}** için +${amount} **${type.toUpperCase()}** hakkı eklendi.`, components: [] });
        } else {
            interaction.editReply({ content: '❌ Key bulunamadı.', components: [] });
        }
    }
}

client.login(process.env.TOKEN);
