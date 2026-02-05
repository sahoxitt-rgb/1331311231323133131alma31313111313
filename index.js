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
    
    // 🔥 PATRON (HARDCODED)
    OWNER_ID: "1380526273431994449", 
    MASTER_VIEW_ID: "1380526273431994449",
    SUPPORT_ROLE_ID: "1380526273431994449", 

    // 👇 BURALARI DOLDURMAYI UNUTMA 👇
    LOG_CHANNEL_ID: "BURAYA_LOG_KANAL_ID_YAZ",       
    CUSTOMER_ROLE_ID: "BURAYA_MUSTERI_ROL_ID_YAZ",   
    
    // LİMİTLER
    DEFAULT_PAUSE_LIMIT: 2,
    DEFAULT_RESET_LIMIT: 1,
    VIP_PAUSE_LIMIT: 999,
    VIP_RESET_LIMIT: 5,

    // TASARIM
    EMBED_COLOR: '#2B2D31' 
};

// GLOBAL DEĞİŞKENLER
let isMaintenanceEnabled = false;

// =====================================================
//                 1. WEB SERVER
// =====================================================
const app = express();
app.get('/', (req, res) => res.send('SAHO CHEATS SYSTEM OPERATIONAL 🟢'));
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
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates // Seste kaç kişi var görmek için gerekli
    ], 
    partials: [Partials.Channel] 
});

// =====================================================
//                 3. KOMUT LİSTESİ (BAN/UNBAN EKLENDİ)
// =====================================================
const commands = [
    // --- ADMIN KOMUTLARI ---
    new SlashCommandBuilder().setName('ticket-kur').setDescription('🎫 (Admin) Paneli kurar.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('temizle').setDescription('🧹 (Admin) Mesaj siler.').addIntegerOption(o => o.setName('sayi').setDescription('Miktar').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('duyuru').setDescription('📢 (Admin) Duyuru yapar.').addStringOption(o => o.setName('mesaj').setDescription('Mesaj').setRequired(true)).addChannelOption(o => o.setName('kanal').setDescription('Kanal').setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('sunucu-bilgi').setDescription('📊 (Admin) İstatistikler.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('admin-panel').setDescription('👑 (Admin) Panel.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('bakim-modu').setDescription('🔒 (Admin) Ticket kilitler/açar.').addBooleanOption(o => o.setName('durum').setDescription('Açık mı?').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // --- YENİ: BAN / UNBAN KOMUTLARI ---
    new SlashCommandBuilder().setName('ban').setDescription('🔨 (Admin) Kullanıcıyı sunucudan yasaklar.').addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true)).addStringOption(o => o.setName('sebep').setDescription('Sebep').setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder().setName('unban').setDescription('🔓 (Admin) Kullanıcının yasağını kaldırır.').addStringOption(o => o.setName('id').setDescription('Kullanıcı ID').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    // GÜVENLİK (BOT KARALİSTE)
    new SlashCommandBuilder().setName('karaliste-ekle').setDescription('⛔ (Admin) Bot kullanımını engeller.').addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('karaliste-cikar').setDescription('✅ (Admin) Engel kaldır.').addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    // DURUM KOMUTU
    new SlashCommandBuilder().setName('durum-guncelle').setDescription('📊 (Admin) Hile durum tablosu.')
        .addStringOption(o => o.setName('urun').setDescription('Hile Seç').setRequired(true).addChoices(
            { name: 'PC UID Bypass', value: 'PC UID Bypass' }, { name: 'PC External', value: 'PC External' },
            { name: 'PC Mod Menü', value: 'PC Mod Menü' }, { name: 'PC Fake Lag', value: 'PC Fake Lag' }, { name: 'Android Fake Lag', value: 'Android Fake Lag' }
        ))
        .addStringOption(o => o.setName('durum').setDescription('Durum').setRequired(true).addChoices(
            {name:'🟢 SAFE (Güvenli)', value:'safe'}, {name:'🔴 DETECTED (Riskli)', value:'detected'}, {name:'🟡 UPDATING (Güncelleniyor)', value:'updating'}
        ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('cark-hak-ekle').setDescription('🎡 (Admin) Hak ver.').addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true)).addIntegerOption(o => o.setName('adet').setDescription('Adet').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // LİSANS YÖNETİMİ
    new SlashCommandBuilder().setName('vip-ekle').setDescription('💎 (Admin) VIP lisans.').addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true)).addStringOption(o => o.setName('key_ismi').setDescription('Key Adı').setRequired(true)).addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('kullanici-ekle').setDescription('🛠️ (Admin) Normal lisans.').addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true)).addStringOption(o => o.setName('key_ismi').setDescription('Key Adı').setRequired(true)).addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('olustur').setDescription('🛠️ (Admin) Boş key.').addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true)).addStringOption(o => o.setName('isim').setDescription('İsim').setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('sil').setDescription('🗑️ (Admin) Key sil.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('hwid-hak-ekle').setDescription('➕ (Admin) HWID hakkı.').addIntegerOption(o => o.setName('adet').setDescription('Adet').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('durdurma-hak-ekle').setDescription('➕ (Admin) Durdurma hakkı.').addIntegerOption(o => o.setName('adet').setDescription('Adet').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // KULLANICI KOMUTLARI
    new SlashCommandBuilder().setName('lisansim').setDescription('👤 Lisans durumunu gör.'),
    new SlashCommandBuilder().setName('cevir').setDescription('🎡 Şans Çarkı! (Boş yok, ciddi ödüller)'),
    new SlashCommandBuilder().setName('cark-oranlar').setDescription('📊 Çark Oranları.'),
    new SlashCommandBuilder().setName('referans').setDescription('⭐ Hizmeti puanla.').addIntegerOption(o => o.setName('puan').setDescription('Puan (1-5)').setRequired(true).setMinValue(1).setMaxValue(5)).addStringOption(o => o.setName('yorum').setDescription('Yorum').setRequired(true)),

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
        .setDescription(`Lisans yönetim paneliniz aşağıdadır.`)
        .setColor(isVIP ? 'Gold' : CONFIG.EMBED_COLOR)
        .addFields(
            { name: '🔑 Lisans Key', value: `\`${key}\``, inline: true },
            { name: '📡 Durum', value: durum === 'aktif' ? '✅ AKTİF' : '⏸️ DURAKLATILDI', inline: true },
            { name: '\u200B', value: '\u200B', inline: false },
            { name: '⏸️ Kalan Durdurma', value: isVIP ? '∞ (Sınırsız)' : `\`${kalanPause} / ${LIMITS.PAUSE}\``, inline: true },
            { name: '💻 Kalan Reset', value: `\`${kalanReset} / ${LIMITS.RESET}\``, inline: true }
        )
        .setFooter({ text: 'SAHO CHEATS Security Systems' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('toggle').setLabel(durum === 'aktif' ? 'DURDUR' : 'BAŞLAT').setStyle(durum === 'aktif' ? ButtonStyle.Danger : ButtonStyle.Success).setEmoji(durum === 'aktif' ? '🛑' : '▶️').setDisabled(durum === 'aktif' && !isVIP && kalanPause <= 0),
        new ButtonBuilder().setCustomId('reset').setLabel('HWID SIFIRLA').setStyle(ButtonStyle.Primary).setEmoji('🔄').setDisabled(kalanReset <= 0)
    );

    return { embeds: [embed], components: [row] };
}

// =====================================================
//                 5. BOT EVENTS (GÜNCELLENDİ: SESTEKİ KİŞİ SAYISI)
// =====================================================
client.once('ready', async () => {
    console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
    
    // --- AKTİF SES SAYACI & CRON JOB ---
    const updateActivity = () => {
        // Tüm sunuculardaki seste olan kişilerin toplam sayısını al
        let totalVoiceMembers = 0;
        client.guilds.cache.forEach(guild => {
            totalVoiceMembers += guild.voiceStates.cache.size;
        });

        // Durumu güncelle
        client.user.setActivity({
            name: `SAHO CHEATS | 🔊 ${totalVoiceMembers} Kişi Seste`,
            type: ActivityType.Playing
        });
    };

    // İlk açılışta güncelle
    updateActivity();

    // Her 60 saniyede bir güncelle
    setInterval(updateActivity, 60000); 

    // --- LİSANS SÜRE KONTROLÜ (1 SAATTE BİR) ---
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

    // Komutları Yükle
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try { 
        console.log('🔄 Komutlar güncelleniyor...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands }); 
        console.log('✨ Komutlar hazır!');
    } catch (error) { console.error(error); }
});

client.on('guildMemberAdd', async member => {
    const channel = member.guild.channels.cache.find(ch => ch.name.includes('gelen') || ch.name.includes('kayıt') || ch.name.includes('chat'));
    if (!channel) return;
    const embed = new EmbedBuilder().setTitle('🚀 HOŞ GELDİN!').setDescription(`Selam **${member.user}**!`).setColor(CONFIG.EMBED_COLOR).setThumbnail(member.user.displayAvatarURL({ dynamic: true })).setFooter({ text: 'SAHO CHEATS' });
    channel.send({ content: `${member.user}`, embeds: [embed] });
});

// =====================================================
//                 6. ETKİLEŞİM YÖNETİCİSİ
// =====================================================
client.on('interactionCreate', async interaction => {
    try {
        const blacklist = await firebaseRequest('get', '_BLACKLIST_');
        if (blacklist && blacklist[interaction.user.id]) return interaction.reply({ content: '⛔ **SİSTEM TARAFINDAN ENGELLENDİNİZ.**', ephemeral: true });
        
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

    // --- YENİ: BAN KOMUTU ---
    if (commandName === 'ban') {
        const targetUser = options.getUser('kullanici');
        const reason = options.getString('sebep') || 'Sebep belirtilmedi.';
        const member = guild.members.cache.get(targetUser.id);

        if (!member) return interaction.reply({ content: '❌ Kullanıcı sunucuda bulunamadı.', ephemeral: true });
        if (!member.bannable) return interaction.reply({ content: '❌ Bu kullanıcıyı yasaklayamıyorum (Yetkim yetmiyor).', ephemeral: true });

        await member.ban({ reason: reason });
        const embed = new EmbedBuilder().setTitle('🔨 YASAKLAMA İŞLEMİ').setDescription(`**Yasaklanan:** ${targetUser.tag}\n**Sebep:** ${reason}\n**Yetkili:** ${user.tag}`).setColor('Red');
        interaction.reply({ embeds: [embed] });
    }

    // --- YENİ: UNBAN KOMUTU ---
    else if (commandName === 'unban') {
        const targetId = options.getString('id');
        try {
            await guild.members.unban(targetId);
            interaction.reply({ content: `✅ **${targetId}** ID'li kullanıcının yasağı kaldırıldı.`, ephemeral: true });
        } catch (error) {
            interaction.reply({ content: '❌ Kullanıcı bulunamadı veya yasaklı değil.', ephemeral: true });
        }
    }

    // --- BAKIM MODU ---
    else if (commandName === 'bakim-modu') {
        const durum = options.getBoolean('durum');
        isMaintenanceEnabled = durum;
        interaction.reply({ content: `🔒 **Bakım Modu:** ${durum ? 'AÇIK (Kimse ticket açamaz)' : 'KAPALI (Sistem aktif)'}`, ephemeral: true });
    }

    else if (commandName === 'cark-hak-ekle') {
        const target = options.getUser('kullanici');
        const adet = options.getInteger('adet');
        let currentRight = await firebaseRequest('get', `_SPIN_RIGHTS_/${target.id}`);
        if (!currentRight) currentRight = 0; else currentRight = parseInt(currentRight);
        await firebaseRequest('put', `_SPIN_RIGHTS_/${target.id}`, currentRight + adet);
        interaction.reply({ content: `✅ **${target.tag}** kullanıcısına **+${adet}** hak eklendi.`, ephemeral: true });
    }

    else if (commandName === 'cark-oranlar') {
        const embed = new EmbedBuilder().setTitle('🎡 SAHO CHEATS | ORANLAR').setDescription('💎 %0.5 External\n🔥 %1.5 Bypass\n👑 %3.0 Mod Menü\n🎫 %10 İndirim\n❌ %85 PAS (Tekrar Dene)').setColor('Gold');
        interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'ticket-kur') {
        const embed = new EmbedBuilder()
            .setTitle('🔥 SAHO CHEATS | PREMIUM MARKET')
            .setDescription(`**Hoş Geldiniz!**\n\n🛒 **ÜRÜNLER & FİYATLAR**\n🛠️ **CANLI DESTEK**`)
            .setColor(CONFIG.EMBED_COLOR)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/906/906334.png')
            .setFooter({ text: 'SAHO CHEATS Security Systems' });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('create_ticket_buy').setLabel('SATIN ALIM (Fiyatlar)').setStyle(ButtonStyle.Success).setEmoji('🛒'),
            new ButtonBuilder().setCustomId('create_ticket_support').setLabel('CANLI DESTEK').setStyle(ButtonStyle.Secondary).setEmoji('🛠️')
        );
        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Panel kuruldu!', ephemeral: true });
    }

    else if (commandName === 'karaliste-ekle') {
        const target = options.getUser('kullanici');
        await firebaseRequest('patch', '_BLACKLIST_', { [target.id]: "BAN" });
        interaction.reply({ content: `⛔ **${target.tag}** engellendi.`, ephemeral: true });
    }
    else if (commandName === 'karaliste-cikar') {
        const target = options.getUser('kullanici');
        const url = `${CONFIG.FIREBASE_URL}_BLACKLIST_/${target.id}.json?auth=${CONFIG.FIREBASE_SECRET}`;
        await axios.delete(url);
        interaction.reply({ content: `✅ **${target.tag}** engeli kalktı.`, ephemeral: true });
    }

    else if (commandName === 'durum-guncelle') {
        const urun = options.getString('urun');
        const durum = options.getString('durum');
        let color, statusText, emoji;
        if (durum === 'safe') { color = 'Green'; statusText = 'SAFE / GÜVENLİ'; emoji = '🟢'; }
        else if (durum === 'detected') { color = 'Red'; statusText = 'DETECTED / RİSKLİ'; emoji = '🔴'; }
        else { color = 'Yellow'; statusText = 'UPDATING / GÜNCELLENİYOR'; emoji = '🟡'; }
        const embed = new EmbedBuilder().setTitle(`${emoji} DURUM BİLGİSİ`).addFields({ name: '📂 Yazılım', value: `**${urun}**`, inline: true }, { name: '📡 Durum', value: `\`${statusText}\``, inline: true }).setColor(color).setFooter({ text: 'SAHO CHEATS Status' });
        await interaction.channel.send({ embeds: [embed] });
        await interaction.reply({ content: '✅', ephemeral: true });
    }

    else if (commandName === 'referans') {
        const puan = options.getInteger('puan');
        const yorum = options.getString('yorum');
        const stars = '⭐'.repeat(puan);
        const embed = new EmbedBuilder().setAuthor({ name: `${user.username} referans bıraktı!`, iconURL: user.displayAvatarURL() }).setDescription(`**Puan:** ${stars}\n**Yorum:** ${yorum}`).setColor('Gold');
        const vouchChannel = guild.channels.cache.find(c => c.name.includes('referans') || c.name.includes('vouch'));
        if (vouchChannel) { await vouchChannel.send({ embeds: [embed] }); interaction.reply({ content: '❤️', ephemeral: true }); }
        else interaction.reply({ content: 'Kanal bulunamadı.', ephemeral: true });
    }

    // --- ÇARKIFELEK (GÜNCELLENDİ: TROLL EŞYALAR KALDIRILDI) ---
    else if (commandName === 'cevir') {
        await interaction.deferReply();
        let extraRights = await firebaseRequest('get', `_SPIN_RIGHTS_/${user.id}`);
        if (!extraRights) extraRights = 0; else extraRights = parseInt(extraRights);
        
        let usedExtra = false;
        if (extraRights > 0) {
            extraRights--;
            await firebaseRequest('put', `_SPIN_RIGHTS_/${user.id}`, extraRights);
            usedExtra = true;
        } else {
            const spinData = await firebaseRequest('get', `_SPIN_TIMES_/${user.id}`);
            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000;
            if (spinData) {
                const lastSpin = parseInt(spinData);
                if (now - lastSpin < cooldown) {
                    return interaction.editReply(`⏳ **Günlük hakkın doldu!**\nTekrar denemek için: <t:${Math.floor((lastSpin + cooldown) / 1000)}:R>`);
                }
            }
            await firebaseRequest('patch', '_SPIN_TIMES_', { [user.id]: now });
        }

        const items = [
            { name: "1 AYLIK EXTERNAL 💎", chance: 5, type: 'legendary' },
            { name: "1 HAFTALIK BYPASS 🔥", chance: 15, type: 'epic' },
            { name: "1 GÜNLÜK MOD MENU 👑", chance: 30, type: 'rare' },
            { name: "%10 İndirim Kuponu 🎫", chance: 100, type: 'common' },
            // BOŞ ŞEYLER KALDIRILDI, PAS ORANI ARTIRILDI
            { name: "PAS (Tekrar Dene) ❌", chance: 850, type: 'lose' } 
        ];

        const totalWeight = items.reduce((sum, item) => sum + item.chance, 0);
        let random = Math.floor(Math.random() * totalWeight);
        let selectedItem = items[0];
        for (const item of items) {
            if (random < item.chance) { selectedItem = item; break; }
            random -= item.chance;
        }

        let color = CONFIG.EMBED_COLOR;
        let description = "";
        let footerText = usedExtra ? `Ekstra hak kullanıldı. Kalan: ${extraRights}` : `${user.username} günlük hakkını kullandı`;

        if (selectedItem.type === 'legendary' || selectedItem.type === 'epic' || selectedItem.type === 'rare') {
            color = 'Gold';
            description = `🎉 **TEBRİKLER! ÖDÜL KAZANDIN!**\n\nKazandığın: **${selectedItem.name}**\n\n*Hemen ticket aç ve bu ekranı yetkiliye at!*`;
        } else if (selectedItem.type === 'lose') {
            color = 'Red';
            description = `📉 **Maalesef...**\n\nSonuç: **${selectedItem.name}**\n\n*Yarın tekrar gel veya hak satın al!*`;
        } else {
            color = 'Blue';
            description = `👍 **Fena Değil!**\n\nKazandığın: **${selectedItem.name}**`;
        }
        const embed = new EmbedBuilder().setTitle('🎡 SAHO CHEATS ÇARKIFELEK').setDescription(description).setColor(color).setFooter({ text: footerText });
        await interaction.editReply({ embeds: [embed] });
    }

    // --- SUNUCU YÖNETİMİ ---
    else if (commandName === 'temizle') {
        const amount = options.getInteger('sayi');
        if (amount > 100) return interaction.reply({ content: 'Maksimum 100.', ephemeral: true });
        await interaction.channel.bulkDelete(amount, true).catch(() => {});
        interaction.reply({ content: `🧹 **${amount}** mesaj temizlendi.`, ephemeral: true });
    }
    else if (commandName === 'duyuru') {
        const mesaj = options.getString('mesaj');
        const targetChannel = options.getChannel('kanal') || interaction.channel;
        const embed = new EmbedBuilder().setTitle('📢 SAHO CHEATS DUYURU').setDescription(mesaj).setColor(CONFIG.EMBED_COLOR).setFooter({ text: guild.name }).setTimestamp();
        await targetChannel.send({ content: '@everyone', embeds: [embed] });
        interaction.reply({ content: '✅', ephemeral: true });
    }
    else if (commandName === 'sunucu-bilgi') {
        const embed = new EmbedBuilder().setTitle(`📊 ${guild.name}`).addFields({ name: '👥 Üye', value: `${guild.memberCount}`, inline: true }).setColor(CONFIG.EMBED_COLOR);
        interaction.reply({ embeds: [embed] });
    }

    // --- LİSANS İŞLEMLERİ ---
    else if (['vip-ekle', 'kullanici-ekle', 'olustur', 'sil', 'hwid-hak-ekle', 'durdurma-hak-ekle'].includes(commandName)) {
        if (commandName === 'hwid-hak-ekle' || commandName === 'durdurma-hak-ekle') {
            await interaction.deferReply({ ephemeral: true });
            const data = await firebaseRequest('get', '');
            if (!data) return interaction.editReply('Veri yok.');
            const keys = Object.keys(data).filter(k => !k.startsWith("_")).slice(0, 25);
            const adet = options.getInteger('adet');
            const type = commandName === 'hwid-hak-ekle' ? 'hwid' : 'durdurma';
            const menu = new StringSelectMenuBuilder().setCustomId(`add_right_${type}_${adet}`).setPlaceholder('Key Seç...').addOptions(keys.map(k => new StringSelectMenuOptionBuilder().setLabel(k).setValue(k).setEmoji('➕')));
            interaction.editReply({ content: `👇 **${type.toUpperCase()} Ekle:**`, components: [new ActionRowBuilder().addComponents(menu)] });
            return;
        }
        if (commandName === 'sil') {
            await interaction.deferReply({ ephemeral: true });
            const data = await firebaseRequest('get', '');
            if (!data) return interaction.editReply('Veri yok.');
            const keys = Object.keys(data).filter(k => !k.startsWith("_")).slice(0, 25);
            const menu = new StringSelectMenuBuilder().setCustomId('delete_key').setPlaceholder('Sil...').addOptions(keys.map(k => new StringSelectMenuOptionBuilder().setLabel(k).setValue(k).setEmoji('🗑️')));
            interaction.editReply({ content: '🗑️ **Sil:**', components: [new ActionRowBuilder().addComponents(menu)] });
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
            sendLog(guild, `🚨 **LİSANS OLUŞTURULDU**\n**Yönetici:** ${user.tag}\n**Key:** ${key}`);
            interaction.editReply({ content: `✅ **${target.username}** tanımlandı.` });
            try { await target.send({ content: `🎉 **Lisansınız Hazır!**`, embeds: payload.embeds, components: payload.components }); } catch (e) {}
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
        if (!result) return interaction.editReply('❌ **Lisansınız bulunmamaktadır.**');
        interaction.editReply(createPanelPayload(result.key, result.parts));
    }
    else if (commandName === 'help') {
        const embed = new EmbedBuilder().setTitle('🤖 BOT KOMUTLARI').setColor(CONFIG.EMBED_COLOR).setDescription('Tüm sistemler aktif.');
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

// =====================================================
//                 8. BUTON HANDLER
// =====================================================
async function handleButton(interaction) {
    const { customId, user, guild, channel } = interaction;

    if (customId.startsWith('create_ticket_')) {
        if (isMaintenanceEnabled && !await checkPermission(user.id)) {
            return interaction.reply({ content: '🔒 **SİSTEM BAKIMDA**\nLütfen daha sonra deneyin.', ephemeral: true });
        }

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
                .setPlaceholder('📦 Satın almak istediğiniz ürünü seçin...')
                .addOptions(
                    { label: 'PC UID Bypass', value: 'prod_uid', description: 'Aylık 1500₺ | Haftalık 600₺', emoji: '🛡️' },
                    { label: 'PC External', value: 'prod_external', description: 'Aylık 1500₺ | Haftalık 600₺', emoji: '🔮' },
                    { label: 'PC Mod Menü', value: 'prod_modmenu', description: 'Aylık 2000₺ | Haftalık 700₺', emoji: '👑' },
                    { label: 'PC Fake Lag', value: 'prod_fakelag', description: 'Haftalık 200₺ | Sınırsız 500₺', emoji: '💨' },
                    { label: 'Android Fake Lag', value: 'prod_android', description: 'Aylık 800₺', emoji: '📱' }
                );
            const menuRow = new ActionRowBuilder().addComponents(productMenu);
            const embed = new EmbedBuilder().setTitle('🛒 SAHO CHEATS MARKET').setDescription(`Hoş geldin **${user.username}**!\n\nAşağıdaki menüden bir ürün seçerek fiyat bilgisini görebilir ve satın alma adımlarını öğrenebilirsin.`).setColor(CONFIG.EMBED_COLOR);
            await ticketChannel.send({ content: `${user}`, embeds: [embed], components: [menuRow, controlRow] });
        } else {
            const embed = new EmbedBuilder().setTitle('🛠️ CANLI DESTEK').setDescription(`Merhaba **${user.username}**!\n\nYetkililerimiz en kısa sürede seninle ilgilenecektir. Lütfen sorunu detaylıca yaz.\n*(Gereksiz etiketleme yapmayınız)*`).setColor(CONFIG.EMBED_COLOR);
            await ticketChannel.send({ content: `${user} | <@&${CONFIG.SUPPORT_ROLE_ID}>`, embeds: [embed], components: [controlRow] });
        }
        await interaction.editReply(`✅ Ticket açıldı: ${ticketChannel}`);
        return;
    }

    if (customId === 'close_ticket') {
        interaction.reply('🔴 **Kapatılıyor...**');
        setTimeout(() => channel.delete().catch(() => {}), 5000);
    }
    else if (customId === 'claim_ticket') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.reply({ content: '⛔ Yetkisiz!', ephemeral: true });
        channel.send({ embeds: [new EmbedBuilder().setDescription(`✅ Talep **${user}** tarafından devralındı.`).setColor('Yellow')] });
    }

    if (['toggle', 'reset'].includes(customId)) {
        await interaction.deferReply({ ephemeral: true });
        const result = await findUserKey(user.id);
        if (!result) return interaction.editReply('❌ Lisans yok.');
        let { key, parts } = result;
        while (parts.length < 8) parts.push("0");
        const isVIP = parts[7] === 'VIP';
        const LIMITS = { PAUSE: isVIP ? CONFIG.VIP_PAUSE_LIMIT : CONFIG.DEFAULT_PAUSE_LIMIT, RESET: isVIP ? CONFIG.VIP_RESET_LIMIT : CONFIG.DEFAULT_RESET_LIMIT };
        let [durum, pause, reset] = [parts[2], parseInt(parts[5]), parseInt(parts[6])];

        if (customId === 'toggle') {
            if (durum === 'aktif') {
                if (!isVIP && pause >= LIMITS.PAUSE) return interaction.editReply('❌ Limit doldu.');
                durum = 'pasif'; pause++;
            } else durum = 'aktif';
            parts[2] = durum; parts[5] = pause;
        } 
        else if (customId === 'reset') {
            if (reset >= LIMITS.RESET) return interaction.editReply('❌ Limit doldu.');
            parts[0] = 'bos'; reset++; parts[6] = reset;
            sendLog(guild, `🔄 **HWID SIFIRLANDI**\n**Kullanıcı:** ${user.tag}\n**Key:** ${key}`);
            interaction.editReply('✅ HWID Sıfırlandı!');
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
            case 'prod_uid': title = "🛡️ PC UID BYPASS"; priceInfo = "**📆 Haftalık:** 600₺\n**🗓️ Aylık:** 1500₺\n\n*Ban riskini ortadan kaldıran bypass.*"; break;
            case 'prod_external': title = "🔮 PC EXTERNAL"; priceInfo = "**📆 Haftalık:** 600₺\n**🗓️ Aylık:** 1500₺\n\n*Güvenli external yazılım.*"; break;
            case 'prod_modmenu': title = "👑 PC MOD MENÜ"; priceInfo = "**📆 Haftalık:** 700₺\n**🗓️ Aylık:** 2000₺\n\n*Full özellikli mod menü.*"; break;
            case 'prod_fakelag': title = "💨 PC FAKE LAG"; priceInfo = "**📆 Haftalık:** 200₺\n**♾️ SINIRSIZ:** 500₺\n\n*Laglı görünme sistemi.*"; break;
            case 'prod_android': title = "📱 ANDROID FAKE LAG"; priceInfo = "**🗓️ Aylık:** 800₺\n\n*Mobil özel.*"; break;
        }
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(`${priceInfo}\n\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n💳 **SATIN ALMAK İÇİN:**\nLütfen bu kanala **IBAN** veya **PAPARA** yazarak ödeme bilgilerini isteyiniz.`)
            .setColor(CONFIG.EMBED_COLOR)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/2543/2543369.png');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    if (!await checkPermission(interaction.user.id)) return interaction.reply({ content: '⛔ Yetkisiz.', ephemeral: true });
    
    const key = interaction.values[0];
    if (interaction.customId === 'delete_key') {
        await interaction.deferUpdate();
        await firebaseRequest('delete', key);
        interaction.editReply({ content: `✅ **${key}** silindi!`, components: [] });
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
            sendLog(interaction.guild, `➕ **HAK EKLENDİ**\n**Admin:** ${interaction.user.tag}\n**Key:** ${key}\n**Miktar:** +${amount} ${type}`);
            interaction.editReply({ content: `✅ **${key}** için +${amount} **${type.toUpperCase()}** hakkı eklendi.`, components: [] });
        } else {
            interaction.editReply({ content: '❌ Key bulunamadı.', components: [] });
        }
    }
}

client.login(process.env.TOKEN);
