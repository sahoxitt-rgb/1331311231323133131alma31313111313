require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, 
    REST, Routes, SlashCommandBuilder, Partials, PermissionFlagsBits, ChannelType, PermissionsBitField 
} = require('discord.js');
const express = require('express');
const axios = require('axios');

// =====================================================
//                 AYARLAR VE KONFİGÜRASYON
// =====================================================
const CONFIG = {
    FIREBASE_URL: process.env.FIREBASE_URL, 
    FIREBASE_SECRET: process.env.FIREBASE_SECRET,
    OWNER_ID: "1380526273431994449", // SENİN ID'N
    
    // YETKİLİ ROLÜ (Ticketları görecek rol ID'si)
    // Buraya sunucundaki "Yetkili" veya "Destek Ekibi" rolünün ID'sini yaz.
    SUPPORT_ROLE_ID: "BURAYA_YETKILI_ROL_ID_YAZ",
    
    // LİMİTLER
    DEFAULT_PAUSE_LIMIT: 2,
    DEFAULT_RESET_LIMIT: 1,
    VIP_PAUSE_LIMIT: 999, // VIP Sınırsız
    VIP_RESET_LIMIT: 5
};

// =====================================================
//                 1. WEB SERVER (7/24 AKTİFLİK İÇİN)
// =====================================================
const app = express();
app.get('/', (req, res) => res.send('FAKE LAG V1 - SYSTEM OPERATIONAL 🟢'));
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
        GatewayIntentBits.MessageContent
    ], 
    partials: [Partials.Channel] // DM Kutusunu dinlemek için şart
});

// =====================================================
//                 3. KOMUT LİSTESİ
// =====================================================
const commands = [
    // --- TICKET KOMUTU ---
    new SlashCommandBuilder()
        .setName('ticket-kur')
        .setDescription('🎫 (Admin) Ticket panelini OLDUĞUNUZ KANALA kurar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // --- LİSANS KOMUTLARI ---
    new SlashCommandBuilder().setName('admin-panel').setDescription('👑 (Admin) Yönetici kontrol merkezi.'),
    new SlashCommandBuilder().setName('vip-ekle').setDescription('💎 (Admin) Kullanıcıya VIP lisans ver ve DM at.').addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true)).addStringOption(o => o.setName('key_ismi').setDescription('Key Adı').setRequired(true)).addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true)),
    new SlashCommandBuilder().setName('kullanici-ekle').setDescription('🛠️ (Admin) Normal lisans ver ve DM at.').addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true)).addStringOption(o => o.setName('key_ismi').setDescription('Key Adı').setRequired(true)).addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true)),
    new SlashCommandBuilder().setName('olustur').setDescription('🛠️ (Admin) Boş key oluştur.').addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true)).addStringOption(o => o.setName('isim').setDescription('İsim').setRequired(false)),
    new SlashCommandBuilder().setName('sil').setDescription('🗑️ (Admin) Key sil.'),
    new SlashCommandBuilder().setName('hwid-hak-ekle').setDescription('➕ (Admin) HWID reset hakkı ekle.').addIntegerOption(o => o.setName('adet').setDescription('Adet').setRequired(true)),
    new SlashCommandBuilder().setName('durdurma-hak-ekle').setDescription('➕ (Admin) Durdurma hakkı ekle.').addIntegerOption(o => o.setName('adet').setDescription('Adet').setRequired(true)),
    new SlashCommandBuilder().setName('yetkili-ekle').setDescription('👑 (Owner) Yönetici ekle.').addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true)),
    new SlashCommandBuilder().setName('yetkili-cikar').setDescription('👑 (Owner) Yetkiyi al.').addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true)),
    new SlashCommandBuilder().setName('lisansim').setDescription('👤 Lisans panelini aç.'),
    new SlashCommandBuilder().setName('lisans-bagla').setDescription('🔗 Key tanımla.').addStringOption(o => o.setName('key').setDescription('Key').setRequired(true)),
    new SlashCommandBuilder().setName('help').setDescription('❓ Yardım menüsü.'),

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

// PANEL OLUŞTURUCU (DM VE SUNUCU İÇİN ORTAK)
function createPanelPayload(key, parts) {
    while (parts.length < 8) parts.push("0");
    const isVIP = parts[7] === 'VIP';
    const LIMITS = { PAUSE: isVIP ? CONFIG.VIP_PAUSE_LIMIT : CONFIG.DEFAULT_PAUSE_LIMIT, RESET: isVIP ? CONFIG.VIP_RESET_LIMIT : CONFIG.DEFAULT_RESET_LIMIT };
    let [durum, pause, reset] = [parts[2], parseInt(parts[5] || 0), parseInt(parts[6] || 0)];
    
    const kalanPause = Math.max(0, LIMITS.PAUSE - pause);
    const kalanReset = Math.max(0, LIMITS.RESET - reset);

    const embed = new EmbedBuilder()
        .setTitle(`⚙️ LİSANS KONTROL: ${isVIP ? '💎 VIP' : '🛠️ STANDART'}`)
        .setDescription(`Aşağıdaki butonları kullanarak lisansını yönetebilirsin.`)
        .setColor(isVIP ? 'Gold' : 'Green')
        .addFields(
            { name: '🔑 Lisans Key', value: `\`${key}\``, inline: true },
            { name: '📡 Durum', value: durum === 'aktif' ? '✅ AKTİF' : '⏸️ DURAKLATILDI', inline: true },
            { name: '\u200B', value: '\u200B', inline: false },
            { name: '⏸️ Kalan Durdurma', value: isVIP ? '∞ (Sınırsız)' : `\`${kalanPause} / ${LIMITS.PAUSE}\``, inline: true },
            { name: '💻 Kalan Reset', value: `\`${kalanReset} / ${LIMITS.RESET}\``, inline: true }
        )
        .setFooter({ text: 'Fake Lag V1 Security Systems' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('toggle').setLabel(durum === 'aktif' ? 'DURDUR' : 'BAŞLAT').setStyle(durum === 'aktif' ? ButtonStyle.Danger : ButtonStyle.Success).setEmoji(durum === 'aktif' ? '🛑' : '▶️').setDisabled(durum === 'aktif' && !isVIP && kalanPause <= 0),
        new ButtonBuilder().setCustomId('reset').setLabel('HWID SIFIRLA').setStyle(ButtonStyle.Primary).setEmoji('🔄').setDisabled(kalanReset <= 0)
    );

    return { embeds: [embed], components: [row] };
}

// =====================================================
//                 5. BOT BAŞLATMA
// =====================================================
client.once('ready', async () => {
    console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
    client.user.setActivity('FAKE LAG V1 | /help 🤖');
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try { 
        console.log('🔄 Komutlar güncelleniyor...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands }); 
        console.log('✨ Komutlar hazır!');
    } catch (error) { console.error(error); }
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
//                 7. SLASH KOMUTLARI
// =====================================================
async function handleCommand(interaction) {
    const { commandName, options, user, guild } = interaction;
    const userId = user.id;

    // --- TICKET KUR (OTOMATİK KATEGORİLİ) ---
    if (commandName === 'ticket-kur') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) 
            return interaction.reply({ content: '⛔ Yetkin yok!', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('📩 DESTEK MERKEZİ')
            .setDescription(`
            👋 **Hoş Geldiniz!**
            
            1️⃣ **Lisans Satın Alma**
            2️⃣ **Teknik Destek / Kurulum**
            3️⃣ **Hata Bildirimi**
            
            *Yetkililerle görüşmek için aşağıdaki butona tıklayın.*
            `)
            .setColor('Blue')
            .setFooter({ text: 'FAKE LAG V1 Support Team' })
            .setThumbnail(client.user.displayAvatarURL());

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('create_ticket').setLabel('Destek Talebi Oluştur').setStyle(ButtonStyle.Primary).setEmoji('🎫')
        );

        // Paneli komutun yazıldığı kanala gönder
        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Ticket paneli bu kanala kuruldu!', ephemeral: true });
    }

    // --- LİSANS VE YÖNETİM KOMUTLARI ---
    else if (['vip-ekle', 'kullanici-ekle', 'olustur', 'sil', 'hwid-hak-ekle', 'durdurma-hak-ekle'].includes(commandName)) {
        if (!await checkPermission(userId)) return interaction.reply({ content: '⛔ Yetkin Yok!', ephemeral: true });
        
        // HAK EKLEME (LİSTELİ)
        if (commandName === 'hwid-hak-ekle' || commandName === 'durdurma-hak-ekle') {
            const data = await firebaseRequest('get', '');
            if (!data) return interaction.reply({content: 'Veritabanı boş.', ephemeral:true});
            const keys = Object.keys(data).filter(k => !k.startsWith("_")).slice(0, 25);
            const adet = options.getInteger('adet');
            const type = commandName === 'hwid-hak-ekle' ? 'hwid' : 'durdurma';
            const menu = new StringSelectMenuBuilder()
                .setCustomId(`add_right_${type}_${adet}`)
                .setPlaceholder(`Hangi keye +${adet} hak eklensin?`)
                .addOptions(keys.map(k => new StringSelectMenuOptionBuilder().setLabel(k).setValue(k).setDescription(`+${adet} ${type.toUpperCase()} Hakkı`).setEmoji('➕')));
            
            interaction.reply({ content: `👇 **${type === 'hwid' ? 'HWID' : 'Durdurma'} hakkı eklenecek keyi seç:**`, components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
            return;
        }

        // SİLME
        if (commandName === 'sil') {
            const data = await firebaseRequest('get', '');
            if (!data) return interaction.reply({content: 'Boş.', ephemeral:true});
            const keys = Object.keys(data).filter(k => !k.startsWith("_")).slice(0, 25);
            const menu = new StringSelectMenuBuilder().setCustomId('delete_key').setPlaceholder('Silinecek Keyi Seç...').addOptions(keys.map(k => new StringSelectMenuOptionBuilder().setLabel(k).setValue(k).setEmoji('🗑️')));
            interaction.reply({ content: '🗑️ **Silinecek keyi seç:**', components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
            return;
        }

        // KULLANICI / VIP EKLEME (DM ÖZELLİĞİ)
        if (commandName.includes('ekle')) {
            const target = options.getUser('kullanici');
            const key = options.getString('key_ismi').toUpperCase();
            const gun = options.getInteger('gun');
            const isVip = commandName === 'vip-ekle';
            const data = `bos,${gun},aktif,${new Date().toISOString().split('T')[0]},${target.id},0,0,${isVip ? 'VIP' : 'NORMAL'}`;
            
            // 1. Veritabanına kaydet
            await firebaseRequest('put', key, data);
            
            // 2. Paneli oluştur
            const payload = createPanelPayload(key, data.split(','));
            
            // 3. Admin'e cevap ver
            interaction.reply({ content: `✅ **${target.username}** kullanıcısına ${isVip ? '💎 VIP' : '🛠️'} lisans verildi.`, ephemeral: true });
            
            // 4. KULLANICIYA DM AT
            try { 
                await target.send({ 
                    content: `🎉 **Merhaba ${target.username}!** Lisansınız tanımlandı.`, 
                    embeds: payload.embeds, 
                    components: payload.components 
                }); 
            } catch (error) {
                interaction.followUp({ content: `⚠️ **Uyarı:** Kullanıcının DM kutusu kapalı olduğu için panel gönderilemedi.`, ephemeral: true });
            }
            return;
        }

        if (commandName === 'olustur') {
            const gun = options.getInteger('gun');
            let key = options.getString('isim') || "KEY-" + Math.random().toString(36).substring(2, 8).toUpperCase();
            await firebaseRequest('put', key.toUpperCase(), `bos,${gun},aktif,${new Date().toISOString().split('T')[0]},0,0,0,NORMAL`);
            interaction.reply({ content: `🔑 **Boş Key:** \`${key.toUpperCase()}\``, ephemeral: true });
        }
    }

    else if (commandName === 'lisansim') {
        await interaction.deferReply({ ephemeral: true });
        const result = await findUserKey(userId);
        if (!result) return interaction.editReply('❌ **Lisansın Yok.** `/lisans-bagla` kullanarak keyini tanımla.');
        interaction.editReply(createPanelPayload(result.key, result.parts));
    }
    else if (commandName === 'lisans-bagla') {
        await interaction.deferReply({ ephemeral: true });
        const key = options.getString('key').toUpperCase();
        const raw = await firebaseRequest('get', key);
        if (!raw) return interaction.editReply('❌ **Geçersiz Key.**');
        let p = raw.split(',');
        if (p[4] !== '0' && p[4] !== userId) return interaction.editReply('❌ **Bu key kullanımda.**');
        if (p[4] === userId) return interaction.editReply('⚠️ **Zaten senin.**');
        p[4] = userId; await firebaseRequest('put', key, p.join(','));
        interaction.editReply('✅ **Başarıyla Bağlandı!** Keyfine bak.');
    }
    else if (commandName === 'help') {
        const isAdmin = await checkPermission(userId);
        const embed = new EmbedBuilder().setTitle('🤖 BOT KOMUTLARI').setColor('Blurple')
            .addFields({ name: '👤 Kullanıcı', value: '`/lisansim`, `/lisans-bagla`' });
        if (isAdmin) embed.addFields({ name: '🛡️ Yönetici', value: '`/vip-ekle`, `/kullanici-ekle`, `/olustur`, `/sil`, `/ticket-kur`' });
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

// =====================================================
//                 8. BUTON YÖNETİMİ (TICKET + LİSANS)
// =====================================================
async function handleButton(interaction) {
    const { customId, user, guild, channel } = interaction;

    // --- TICKET OLUŞTURMA (OTOMATİK KATEGORİ TESPİTİ) ---
    if (customId === 'create_ticket') {
        await interaction.deferReply({ ephemeral: true });
        
        const ticketNum = await getNextTicketNumber();
        const channelName = `ticket-${ticketNum}-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

        // Panel hangi kategorideyse oraya açar (interaction.channel.parentId)
        // Eğer panel kategori dışındaysa, ticket da kategori dışında açılır (null)
        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: interaction.channel.parentId, // <--- OTOMATİK KATEGORİ
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                ...(CONFIG.SUPPORT_ROLE_ID !== "BURAYA_YETKILI_ROL_ID_YAZ" ? [{ id: CONFIG.SUPPORT_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }] : [])
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle(`🎫 DESTEK TALEBİ #${ticketNum}`)
            .setDescription(`
            👋 Merhaba **${user.username}**, hoş geldin!
            
            1️⃣ **Lütfen sorununuzu detaylıca yazın.**
            2️⃣ **Yetkililerimiz kısa sürede ilgilenecektir.**
            3️⃣ **Gereksiz etiket atmayınız.**
            
            *Yetkili Ekibi*
            `)
            .setColor('Green')
            .setThumbnail(user.displayAvatarURL());

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('Yetkili: Sahiplen').setStyle(ButtonStyle.Success).setEmoji('✋')
        );

        await ticketChannel.send({ content: `${user} | <@&${CONFIG.SUPPORT_ROLE_ID}>`, embeds: [embed], components: [row] });
        await interaction.editReply(`✅ Ticket oluşturuldu: ${ticketChannel}`);
    }

    // --- TICKET KAPATMA ---
    else if (customId === 'close_ticket') {
        await interaction.reply({ content: '🔴 **Ticket 5 saniye içinde kapatılıyor...**' });
        setTimeout(() => channel.delete().catch(() => {}), 5000);
    }

    // --- TICKET SAHİPLENME ---
    else if (customId === 'claim_ticket') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) 
            return interaction.reply({ content: '⛔ Sadece yetkililer!', ephemeral: true });

        const embed = new EmbedBuilder().setDescription(`✅ Bu talep **${user}** tarafından devralındı.`).setColor('Yellow');
        
        const row = new ActionRowBuilder().addComponents(
             new ButtonBuilder().setCustomId('close_ticket').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
             new ButtonBuilder().setCustomId('claimed').setLabel(`Sahiplenen: ${user.username}`).setStyle(ButtonStyle.Secondary).setEmoji('👤').setDisabled(true)
        );

        await interaction.update({ components: [row] });
        await channel.send({ embeds: [embed] });
    }

    // --- LİSANS İŞLEMLERİ ---
    else if (['toggle', 'reset'].includes(customId)) {
        const result = await findUserKey(user.id);
        if (!result) return interaction.reply({ content: 'Lisans bulunamadı.', ephemeral: true });
        
        let { key, parts } = result;
        while (parts.length < 8) parts.push("0");
        const isVIP = parts[7] === 'VIP';
        const LIMITS = { PAUSE: isVIP ? CONFIG.VIP_PAUSE_LIMIT : CONFIG.DEFAULT_PAUSE_LIMIT, RESET: isVIP ? CONFIG.VIP_RESET_LIMIT : CONFIG.DEFAULT_RESET_LIMIT };
        let [durum, pause, reset] = [parts[2], parseInt(parts[5]), parseInt(parts[6])];

        if (customId === 'toggle') {
            if (durum === 'aktif') {
                if (!isVIP && pause >= LIMITS.PAUSE) return interaction.reply({ content: '❌ Limit doldu.', ephemeral: true });
                durum = 'pasif'; pause++;
            } else durum = 'aktif';
            parts[2] = durum; parts[5] = pause;
        } 
        else if (customId === 'reset') {
            if (reset >= LIMITS.RESET) return interaction.reply({ content: '❌ Limit doldu.', ephemeral: true });
            parts[0] = 'bos'; reset++; parts[6] = reset;
            await interaction.reply({ content: '✅ HWID Sıfırlandı!', ephemeral: true });
        }

        await firebaseRequest('put', key, parts.join(','));
        const payload = createPanelPayload(key, parts);
        try { if (!interaction.replied) await interaction.update(payload); } catch (e) {}
    }
}

// =====================================================
//                 9. SELECT MENU (LİSTEDEN SEÇİM)
// =====================================================
async function handleSelectMenu(interaction) {
    if (!await checkPermission(interaction.user.id)) return interaction.reply({ content: 'Yetkisiz.', ephemeral: true });
    
    const key = interaction.values[0];

    if (interaction.customId === 'delete_key') {
        await firebaseRequest('delete', key);
        interaction.update({ content: `✅ **${key}** silindi!`, components: [] });
    } 
    else if (interaction.customId.startsWith('add_right_')) {
        const [_, __, type, amountStr] = interaction.customId.split('_');
        const amount = parseInt(amountStr);
        const raw = await firebaseRequest('get', key);
        if (raw) {
            let p = raw.split(',');
            while (p.length < 8) p.push("0");
            let idx = type === 'hwid' ? 6 : 5;
            p[idx] = Math.max(0, parseInt(p[idx]) - amount);
            await firebaseRequest('put', key, p.join(','));
            interaction.update({ content: `✅ **${key}** için +${amount} **${type.toUpperCase()}** hakkı eklendi.`, components: [] });
        } else {
            interaction.update({ content: '❌ Key bulunamadı.', components: [] });
        }
    }
}

client.login(process.env.TOKEN);