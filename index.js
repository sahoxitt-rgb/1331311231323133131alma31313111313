require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    Partials, 
    PermissionFlagsBits, 
    ChannelType, 
    PermissionsBitField, 
    ActivityType 
} = require('discord.js');
const express = require('express');
const axios = require('axios');

// =============================================================================
//                             AYARLAR VE KONFİGÜRASYON
// =============================================================================
// Bu bölüm botun beynidir. Tüm ayarlar buradan yönetilir.
const CONFIG = {
    // Firebase Veritabanı Bağlantıları
    FIREBASE_URL: process.env.FIREBASE_URL, 
    FIREBASE_SECRET: process.env.FIREBASE_SECRET,
    
    // 🔥 BOT SAHİBİ VE MASTER YETKİLİ (SENİN ID)
    OWNER_ID: "1380526273431994449", 
    
    // TICKETLARI GÖRECEK VE YÖNETECEK ANA YETKİLİ ID
    MASTER_VIEW_ID: "1380526273431994449",
    
    // DESTEK EKİBİ ROL ID (Ticket kanalını görebilecek rol)
    SUPPORT_ROLE_ID: "1380526273431994449", 

    // 👇 LOG VE MÜŞTERİ ROLÜ (BURALARI KESİN DOLDUR)
    LOG_CHANNEL_ID: "BURAYA_LOG_KANAL_ID_YAZ",       
    CUSTOMER_ROLE_ID: "BURAYA_MUSTERI_ROL_ID_YAZ",   
    
    // LİSANS SİSTEMİ LİMİTLERİ
    DEFAULT_PAUSE_LIMIT: 2, // Normal üye kaç kere durdurabilir
    DEFAULT_RESET_LIMIT: 1, // Normal üye kaç kere HWID sıfırlayabilir
    VIP_PAUSE_LIMIT: 999,   // VIP üye (Sınırsız)
    VIP_RESET_LIMIT: 5,     // VIP üye reset hakkı

    // TASARIM RENK PALETİ (PREMIUM GÖRÜNÜM)
    EMBED_COLOR: '#2B2D31', // Koyu Discord Grisi (Ana Tema)
    SUCCESS_COLOR: '#57F287', // Başarılı İşlem Yeşili
    ERROR_COLOR: '#ED4245',   // Hata Kırmızısı
    INFO_COLOR: '#5865F2',    // Bilgi Mavisi
    GOLD_COLOR: '#F1C40F'     // Premium Altın Sarısı
};

// GLOBAL DEĞİŞKENLER (RAM ÜZERİNDE TUTULAN GEÇİCİ VERİLER)
let isMaintenanceEnabled = false; // Bakım modu kapalı başlar
let loaderStatus = "UNDETECTED 🟢"; // Loader durumu varsayılan olarak güvenli

// =============================================================================
//                             1. WEB SERVER (7/24 AKTİFLİK)
// =============================================================================
// Bu kısım Render gibi platformlarda botun uyumasını engeller.
const app = express();

app.get('/', (req, res) => {
    res.send('SAHO CHEATS SYSTEM - ALL SYSTEMS OPERATIONAL 🟢');
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`🌍 Web sunucusu ${port} portunda başarıyla başlatıldı.`);
});

// =============================================================================
//                             2. BOT İSTEMCİSİ (CLIENT)
// =============================================================================
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates // Seste kaç kişi var saymak için
    ], 
    partials: [Partials.Channel] 
});

// =============================================================================
//                             3. KOMUT LİSTESİ VE TANIMLAMALAR
// =============================================================================
const commands = [
    // --- VİTRİN KOMUTU (4 RESİMLİ GALERİ MODU) ---
    new SlashCommandBuilder()
        .setName('format')
        .setDescription('📸 (Admin) 4 Fotoğraflı, profesyonel ürün vitrini oluşturur.')
        .addStringOption(o => o.setName('urun').setDescription('Ürün Adı').setRequired(true))
        .addStringOption(o => o.setName('haftalik').setDescription('Haftalık Fiyat').setRequired(true))
        .addStringOption(o => o.setName('aylik').setDescription('Aylık Fiyat').setRequired(true))
        .addAttachmentOption(o => o.setName('gorsel1').setDescription('Ana Resim (Zorunlu)').setRequired(true))
        .addAttachmentOption(o => o.setName('gorsel2').setDescription('Ek Resim 1 (İsteğe bağlı)').setRequired(false))
        .addAttachmentOption(o => o.setName('gorsel3').setDescription('Ek Resim 2 (İsteğe bağlı)').setRequired(false))
        .addAttachmentOption(o => o.setName('gorsel4').setDescription('Ek Resim 3 (İsteğe bağlı)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // --- YARDIM VE BİLGİ KOMUTLARI ---
    new SlashCommandBuilder()
        .setName('sss')
        .setDescription('❓ Sıkça Sorulan Sorular (Ban riski, ödeme, iade vb.)'),
    
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('📚 Bot kullanım rehberi ve tüm komutlar.'),

    // --- YÖNETİM VE DURUM KOMUTLARI ---
    new SlashCommandBuilder()
        .setName('tum-lisanslar')
        .setDescription('📜 (Admin) Aktif tüm lisansları veritabanından çeker listeler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('loader-durum')
        .setDescription('🛡️ (Admin) Loader güvenlik durumunu değiştirir.')
        .addStringOption(o => o.setName('durum').setDescription('Durum ne?').setRequired(true)
            .addChoices(
                {name:'🟢 UNDETECTED', value:'UNDETECTED 🟢'}, 
                {name:'🟡 TESTING', value:'TESTING 🟡'}, 
                {name:'🔴 DETECTED', value:'DETECTED 🔴'}, 
                {name:'🛠️ UPDATING', value:'UPDATING 🛠️'}
            ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('dm')
        .setDescription('📨 (Admin) Bot üzerinden kullanıcıya özel mesaj atar.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kime?').setRequired(true))
        .addStringOption(o => o.setName('mesaj').setDescription('Ne yazılacak?').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('👢 (Admin) Kullanıcıyı sunucudan atar.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true))
        .addStringOption(o => o.setName('sebep').setDescription('Sebep').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
        .setName('ticket-kur')
        .setDescription('🎫 (Admin) Gelişmiş Ticket Panelini (Dikey Butonlu) Kurar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('temizle')
        .setDescription('🧹 (Admin) Sohbeti temizler.')
        .addIntegerOption(o => o.setName('sayi').setDescription('Silinecek miktar (1-100)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('📢 (Admin) Özel embed ile duyuru yapar.')
        .addStringOption(o => o.setName('mesaj').setDescription('Mesaj').setRequired(true))
        .addChannelOption(o => o.setName('kanal').setDescription('Kanal').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('sunucu-bilgi')
        .setDescription('📊 Sunucu istatistiklerini gösterir.'),

    new SlashCommandBuilder()
        .setName('bakim-modu')
        .setDescription('🔒 (Admin) Bakım modunu açar/kapatır (Ticketları kilitler).')
        .addBooleanOption(o => o.setName('durum').setDescription('Açık mı?').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('🔨 (Admin) Kullanıcıyı yasaklar.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true))
        .addStringOption(o => o.setName('sebep').setDescription('Sebep').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('🔓 (Admin) Kullanıcının yasağını kaldırır.')
        .addStringOption(o => o.setName('id').setDescription('Kullanıcı ID').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('karaliste-ekle')
        .setDescription('⛔ (Admin) Kullanıcının botu kullanmasını engeller.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('karaliste-cikar')
        .setDescription('✅ (Admin) Kullanıcının bot engelini kaldırır.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    // --- HİLE VE MARKET YÖNETİMİ ---
    new SlashCommandBuilder()
        .setName('durum-guncelle')
        .setDescription('📊 (Admin) Ürünlerin durum tablosunu yayınlar.')
        .addStringOption(o => o.setName('urun').setDescription('Hile Seç').setRequired(true)
            .addChoices(
                { name: 'PC UID Bypass', value: 'PC UID Bypass' }, 
                { name: 'PC External', value: 'PC External' }, 
                { name: 'PC Mod Menü', value: 'PC Mod Menü' }, 
                { name: 'PC Fake Lag', value: 'PC Fake Lag' }, 
                { name: 'Android Fake Lag', value: 'Android Fake Lag' }
            ))
        .addStringOption(o => o.setName('durum').setDescription('Durum').setRequired(true)
            .addChoices(
                {name:'🟢 SAFE', value:'safe'}, 
                {name:'🔴 DETECTED', value:'detected'}, 
                {name:'🟡 UPDATING', value:'updating'}
            ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('cark-hak-ekle')
        .setDescription('🎡 (Admin) Kullanıcıya çark çevirme hakkı verir.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true))
        .addIntegerOption(o => o.setName('adet').setDescription('Adet').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // --- LİSANS İŞLEMLERİ ---
    new SlashCommandBuilder()
        .setName('vip-ekle')
        .setDescription('💎 (Admin) VIP lisans tanımlar.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
        .addStringOption(o => o.setName('key_ismi').setDescription('Key Adı').setRequired(true))
        .addIntegerOption(o => o.setName('gun').setDescription('Süre (Gün)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('kullanici-ekle')
        .setDescription('🛠️ (Admin) Normal lisans tanımlar.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
        .addStringOption(o => o.setName('key_ismi').setDescription('Key Adı').setRequired(true))
        .addIntegerOption(o => o.setName('gun').setDescription('Süre (Gün)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('olustur')
        .setDescription('🛠️ (Admin) Boş (sahipsiz) key oluşturur.')
        .addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true))
        .addStringOption(o => o.setName('isim').setDescription('İsim (Opsiyonel)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('sil')
        .setDescription('🗑️ (Admin) Veritabanından key siler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('hwid-hak-ekle')
        .setDescription('➕ (Admin) Keye HWID reset hakkı ekler.')
        .addIntegerOption(o => o.setName('adet').setDescription('Adet').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('durdurma-hak-ekle')
        .setDescription('➕ (Admin) Keye durdurma hakkı ekler.')
        .addIntegerOption(o => o.setName('adet').setDescription('Adet').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // --- KULLANICI KOMUTLARI ---
    new SlashCommandBuilder()
        .setName('lisansim')
        .setDescription('👤 Lisans durumunu, kalan süreni ve haklarını gör.'),
    
    new SlashCommandBuilder()
        .setName('cevir')
        .setDescription('🎡 Şans Çarkı! (Ödül kazanma şansı).'),
    
    new SlashCommandBuilder()
        .setName('cark-oranlar')
        .setDescription('📊 Çarkıfelekteki ödüllerin oranlarını gösterir.'),
    
    new SlashCommandBuilder()
        .setName('referans')
        .setDescription('⭐ Hizmeti puanla ve yorum bırak.')
        .addIntegerOption(o => o.setName('puan').setDescription('Puan (1-5)').setRequired(true).setMinValue(1).setMaxValue(5))
        .addStringOption(o => o.setName('yorum').setDescription('Yorum').setRequired(true)),

].map(command => command.toJSON());

// =============================================================================
//                             4. YARDIMCI FONKSİYONLAR
// =============================================================================

// Firebase Veritabanı İsteği
async function firebaseRequest(method, path, data = null) {
    const url = `${CONFIG.FIREBASE_URL}${path}.json?auth=${CONFIG.FIREBASE_SECRET}`;
    try {
        const payload = data ? JSON.stringify(data) : null;
        const response = await axios({ 
            method, 
            url, 
            data: payload, 
            headers: { 'Content-Type': 'application/json' } 
        });
        return response.data;
    } catch (error) { 
        console.error("Firebase Hatası:", error);
        return null; 
    }
}

// Kullanıcının Keyini Bulma
async function findUserKey(discordId) {
    const data = await firebaseRequest('get', '');
    if (!data) return null;
    
    for (const [key, value] of Object.entries(data)) {
        if (key.startsWith("_")) continue; // Sistem dosyalarını atla
        if (typeof value === 'string') {
            const parts = value.split(',');
            // CSV: durum, süre, aktiflik, tarih, DISCORD_ID, pause, reset, tip
            if (parts.length > 4 && parts[4] === discordId) return { key, parts };
        }
    }
    return null;
}

// Yetki Kontrolü
async function checkPermission(userId) {
    if (userId === CONFIG.OWNER_ID) return true;
    const admins = await firebaseRequest('get', '_ADMINS_');
    return admins && admins[userId];
}

// Ticket Sayacı
async function getNextTicketNumber() {
    let count = await firebaseRequest('get', '_TICKET_COUNT');
    if (!count) count = 0;
    count++;
    await firebaseRequest('put', '_TICKET_COUNT', count);
    return count;
}

// Log Gönderme
async function sendLog(guild, content) {
    if (!guild || !CONFIG.LOG_CHANNEL_ID || CONFIG.LOG_CHANNEL_ID === "BURAYA_LOG_KANAL_ID_YAZ") return;
    const channel = guild.channels.cache.get(CONFIG.LOG_CHANNEL_ID);
    if (channel) channel.send({ content: content }).catch(() => {});
}

// Lisans Paneli Oluşturma (Görsel ve Butonlar)
function createPanelPayload(key, parts) {
    // Eski verileri uyarla
    while (parts.length < 8) parts.push("0");
    
    const isVIP = parts[7] === 'VIP';
    const LIMITS = { 
        PAUSE: isVIP ? CONFIG.VIP_PAUSE_LIMIT : CONFIG.DEFAULT_PAUSE_LIMIT, 
        RESET: isVIP ? CONFIG.VIP_RESET_LIMIT : CONFIG.DEFAULT_RESET_LIMIT 
    };
    
    let [durum, pause, reset] = [parts[2], parseInt(parts[5] || 0), parseInt(parts[6] || 0)];
    
    const kalanPause = Math.max(0, LIMITS.PAUSE - pause);
    const kalanReset = Math.max(0, LIMITS.RESET - reset);

    const embed = new EmbedBuilder()
        .setTitle(`⚙️ LİSANS KONTROL: ${isVIP ? '💎 VIP' : '🛠️ STANDART'}`)
        .setDescription(`Lisans yönetim paneliniz aşağıdadır. Buradan hilenizi yönetebilirsiniz.`)
        .setColor(isVIP ? 'Gold' : CONFIG.EMBED_COLOR)
        .addFields(
            { name: '🔑 Lisans Key', value: `\`${key}\``, inline: true },
            { name: '📡 Durum', value: durum === 'aktif' ? '✅ AKTİF' : '⏸️ DURAKLATILDI', inline: true },
            { name: '\u200B', value: '\u200B', inline: false },
            { name: '⏸️ Kalan Durdurma', value: isVIP ? '∞ (Sınırsız)' : `\`${kalanPause} / ${LIMITS.PAUSE}\``, inline: true },
            { name: '💻 Kalan Reset', value: `\`${kalanReset} / ${LIMITS.RESET}\``, inline: true }
        )
        .setFooter({ text: 'SAHO CHEATS Security Systems' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('toggle')
            .setLabel(durum === 'aktif' ? 'DURDUR (Pause)' : 'BAŞLAT (Resume)')
            .setStyle(durum === 'aktif' ? ButtonStyle.Danger : ButtonStyle.Success)
            .setEmoji(durum === 'aktif' ? '🛑' : '▶️')
            .setDisabled(durum === 'aktif' && !isVIP && kalanPause <= 0),
        
        new ButtonBuilder()
            .setCustomId('reset')
            .setLabel('HWID SIFIRLA')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄')
            .setDisabled(kalanReset <= 0)
    );

    return { embeds: [embed], components: [row] };
}

// =============================================================================
//                             5. BOT EVENTS (OLAYLAR)
// =============================================================================
client.once('ready', async () => {
    console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
    console.log('🚀 Sistemler yükleniyor...');
    
    // --- DİNAMİK DURUM DÖNGÜSÜ ---
    // Botun "Oynuyor" kısmını sürekli değiştirerek canlı tutar.
    let index = 0;
    setInterval(() => {
        let totalVoice = 0;
        // Tüm sunuculardaki seste olan kişileri say
        client.guilds.cache.forEach(g => totalVoice += g.voiceStates.cache.size);

        const activities = [
            `SAHO CHEATS`,
            `🔊 ${totalVoice} Kişi Seste`,
            `🛡️ Loader: ${loaderStatus}`,
            `7/24 Destek Hattı`,
            `discord.gg/sahocheats`
        ];

        client.user.setActivity({ name: activities[index], type: ActivityType.Playing });
        index = (index + 1) % activities.length;
    }, 5000); // 5 saniyede bir değiştir

    // --- LİSANS SÜRE KONTROLÜ (CRON JOB) ---
    // Her saat başı veritabanını tarar ve süresi biten keyleri pasife alır.
    setInterval(async () => {
        const data = await firebaseRequest('get', '');
        if (!data) return;
        
        const today = new Date();
        for (const [key, value] of Object.entries(data)) {
            // Sistem verilerini atla
            if (key.startsWith("_") || typeof value !== 'string') continue;
            
            let parts = value.split(',');
            // Zaten bitmişse atla
            if (parts[2] === 'bitik') continue;
            
            const startDate = new Date(parts[3]);
            const expiryDate = new Date(startDate);
            // Gün sayısını ekle
            expiryDate.setDate(startDate.getDate() + parseInt(parts[1]));
            
            // Tarih geçmişse süreyi bitir
            if (today > expiryDate) {
                parts[2] = 'bitik';
                await firebaseRequest('put', key, parts.join(','));
                console.log(`❌ SÜRE DOLDU: ${key}`);
            }
        }
    }, 3600000); // 1 Saat (ms cinsinden)

    // --- SLASH KOMUTLARINI YÜKLE ---
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try { 
        console.log('🔄 Komutlar API\'ye gönderiliyor...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✨ Komutlar başarıyla yüklendi!');
    } catch (e) {
        console.error('Komut yükleme hatası:', e);
    }
});

// --- HOŞ GELDİN MESAJI ---
client.on('guildMemberAdd', async member => {
    // "gelen-giden", "kayıt", "chat" gibi kanalları arar
    const channel = member.guild.channels.cache.find(ch => ch.name.includes('gelen') || ch.name.includes('kayıt') || ch.name.includes('chat'));
    if (!channel) return;
    
    const embed = new EmbedBuilder()
        .setTitle('🚀 SAHO CHEATS AİLESİNE HOŞ GELDİN!')
        .setDescription(`Selam **${member.user}**! \nSeninle birlikte **${member.guild.memberCount}** kişi olduk.\n\nKalitenin ve güvenin tek adresi.`)
        .setColor(CONFIG.EMBED_COLOR)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'SAHO CHEATS Community' });
        
    channel.send({ content: `${member.user}`, embeds: [embed] });
});

// =============================================================================
//                             6. ETKİLEŞİM YÖNETİCİSİ
// =============================================================================
client.on('interactionCreate', async interaction => {
    try {
        // --- KARA LİSTE KONTROLÜ (GLOBAL BAN) ---
        const blacklist = await firebaseRequest('get', '_BLACKLIST_');
        if (blacklist && blacklist[interaction.user.id]) {
            return interaction.reply({ content: '⛔ **SİSTEM TARAFINDAN ENGELLENDİNİZ.**\nBu botu kullanamazsınız.', ephemeral: true });
        }
        
        if (interaction.isStringSelectMenu()) return handleSelectMenu(interaction);
        if (interaction.isButton()) return handleButton(interaction);
        if (interaction.isChatInputCommand()) return handleCommand(interaction);
    } catch (e) { console.error('Etkileşim Hatası:', e); }
});

// =============================================================================
//                             7. SLASH KOMUT HANDLER
// =============================================================================
async function handleCommand(interaction) {
    const { commandName, options, user, guild } = interaction;

    // --- FORMAT (ÜRÜN VİTRİNİ - GALERİ MODU) ---
    if (commandName === 'format') {
        const urun = options.getString('urun');
        const haftalik = options.getString('haftalik');
        const aylik = options.getString('aylik');
        
        // 4 Tane Resim Değişkeni
        const gorsel1 = options.getAttachment('gorsel1');
        const gorsel2 = options.getAttachment('gorsel2');
        const gorsel3 = options.getAttachment('gorsel3');
        const gorsel4 = options.getAttachment('gorsel4');

        const embeds = [];

        // 1. ANA EMBED (Bilgi ve İlk Resim)
        const mainEmbed = new EmbedBuilder()
            .setTitle(`💎 ${urun} | FİYAT LİSTESİ`)
            .setDescription(`**${urun}** için güncel fiyat listesi ve detaylar aşağıdadır.\n\n` +
                            `🛡️ **Güvenlik:** ${loaderStatus}\n` +
                            `🚀 **Teslimat:** Otomatik / Anında`)
            .setColor(CONFIG.GOLD_COLOR)
            .addFields(
                { name: '📅 Haftalık Lisans', value: `\`\`\`${haftalik}\`\`\``, inline: true },
                { name: '🗓️ Aylık Lisans', value: `\`\`\`${aylik}\`\`\``, inline: true },
                { name: '\u200B', value: '\u200B', inline: false }, // Boşluk
                { name: '🛒 Nasıl Satın Alırım?', value: 'Satın almak için `#ticket-kur` kanalını kullanabilirsiniz.', inline: false }
            )
            .setImage(gorsel1.url) // İlk resmi buraya koy
            .setFooter({ text: 'SAHO CHEATS Marketplace', iconURL: guild.iconURL() })
            .setTimestamp();
        
        embeds.push(mainEmbed);

        // 2. EKSTRA RESİMLER (Varsa Embed Olarak Ekle)
        // Discord'da galeri yapmak için birden fazla embed gönderilir ama sadece URL'leri aynı set edilir (Burada basit yöntem: Alt alta atma)
        if (gorsel2) embeds.push(new EmbedBuilder().setURL('https://discord.gg/sahocheats').setImage(gorsel2.url).setColor(CONFIG.GOLD_COLOR));
        if (gorsel3) embeds.push(new EmbedBuilder().setURL('https://discord.gg/sahocheats').setImage(gorsel3.url).setColor(CONFIG.GOLD_COLOR));
        if (gorsel4) embeds.push(new EmbedBuilder().setURL('https://discord.gg/sahocheats').setImage(gorsel4.url).setColor(CONFIG.GOLD_COLOR));

        await interaction.channel.send({ embeds: embeds });
        await interaction.reply({ content: '✅ Ürün vitrini (Galeri Modu) başarıyla oluşturuldu!', ephemeral: true });
    }

    // --- SSS (SIKÇA SORULAN SORULAR) ---
    else if (commandName === 'sss') {
        const embed = new EmbedBuilder()
            .setTitle('❓ SIKÇA SORULAN SORULAR')
            .setDescription('Aşağıdaki menüden merak ettiğiniz konuyu seçin.')
            .setColor(CONFIG.INFO_COLOR)
            .setFooter({ text: 'SAHO CHEATS Knowledge Base' });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('faq_select')
            .setPlaceholder('Bir konu seçin...')
            .addOptions(
                { label: 'Ban Riski Var Mı?', description: 'Güvenlik durumu hakkında bilgi.', value: 'faq_ban', emoji: '🛡️' },
                { label: 'Nasıl Satın Alırım?', description: 'Ödeme yöntemleri ve teslimat.', value: 'faq_buy', emoji: '💳' },
                { label: 'İade Var Mı?', description: 'İade politikamız.', value: 'faq_refund', emoji: '🔄' },
                { label: 'Destek Saatleri', description: 'Ne zaman cevap alabilirim?', value: 'faq_support', emoji: '⏰' },
                { label: 'Kurulum Zor Mu?', description: 'Teknik bilgi gerekir mi?', value: 'faq_install', emoji: '🛠️' }
            );

        await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
    }

    // --- YARDIM MENÜSÜ ---
    else if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('📚 SAHO CHEATS | BOT YARDIM MENÜSÜ')
            .setColor(CONFIG.EMBED_COLOR)
            .setDescription('Botun tüm komutları aşağıda listelenmiştir.')
            .addFields(
                { 
                    name: '👤 **Kullanıcı Komutları**', 
                    value: '> `/lisansim` - Lisansını ve HWID durumunu gör.\n> `/cevir` - Şans çarkını çevir (Ödül kazan).\n> `/referans` - Hizmetimizi puanla ve yorum yap.\n> `/sss` - Sıkça sorulan sorular.' 
                },
                { 
                    name: '🛡️ **Yetkili Komutları**', 
                    value: '> `/format` - Ürün vitrini oluşturur (4 Resimli).\n> `/ticket-kur` - Destek panelini kurar.\n> `/durum-guncelle` - Hile durumunu bildirir.\n> `/loader-durum` - Loader güvenliğini değiştirir.\n> `/dm` - Özel mesaj atar.\n> `/kick`, `/ban`, `/unban` - Ceza sistemi.\n> `/vip-ekle`, `/kullanici-ekle` - Lisans verir.\n> `/tum-lisanslar` - Tüm aktif lisansları görür.' 
                }
            )
            .setFooter({ text: 'SAHO CHEATS Automation' });
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // --- TÜM LİSANSLAR ---
    else if (commandName === 'tum-lisanslar') {
        await interaction.deferReply({ ephemeral: true });
        const data = await firebaseRequest('get', '');
        if (!data) return interaction.editReply('Veri bulunamadı.');
        
        let text = "**📜 AKTİF LİSANSLAR LİSTESİ**\n\n";
        let count = 0;
        
        for (const [key, value] of Object.entries(data)) {
            if (key.startsWith("_") || typeof value !== 'string') continue;
            let parts = value.split(',');
            if (parts[4] !== "0") { 
                text += `🔑 \`${key}\` - <@${parts[4]}> (${parts[7] || 'NORMAL'})\n`; 
                count++; 
            }
        }
        
        if (count === 0) text += "🚫 Hiçbir kullanıcıya lisans tanımlanmamış.";
        
        const embed = new EmbedBuilder()
            .setDescription(text.substring(0, 4000))
            .setColor(CONFIG.EMBED_COLOR)
            .setFooter({ text: `Toplam ${count} aktif lisans` });
        
        interaction.editReply({ embeds: [embed] });
    }

    // --- LOADER DURUM ---
    else if (commandName === 'loader-durum') {
        loaderStatus = options.getString('durum');
        interaction.reply({ content: `🛡️ Loader durumu güncellendi: **${loaderStatus}**`, ephemeral: true });
    }

    // --- LİSANSIM ---
    else if (commandName === 'lisansim') {
        await interaction.deferReply({ ephemeral: true });
        const result = await findUserKey(user.id);
        if (!result) return interaction.editReply('❌ **Sisteme kayıtlı bir lisansınız bulunmamaktadır.**');
        interaction.editReply(createPanelPayload(result.key, result.parts));
    }

    // --- DM KOMUTU ---
    else if (commandName === 'dm') {
        const targetUser = options.getUser('kullanici');
        const msg = options.getString('mesaj');
        try {
            const embed = new EmbedBuilder()
                .setTitle('📨 SAHO CHEATS MESAJ')
                .setDescription(msg)
                .setColor(CONFIG.EMBED_COLOR)
                .setFooter({text:'Bu mesaj yetkililer tarafından gönderildi.'});
            
            await targetUser.send({embeds: [embed]});
            interaction.reply({content:`✅ Mesaj **${targetUser.tag}** kullanıcısına gönderildi.`, ephemeral:true});
        } catch (e) {
            interaction.reply({content:'❌ Kullanıcının DM kutusu kapalı.', ephemeral:true});
        }
    }

    // --- KICK KOMUTU ---
    else if (commandName === 'kick') {
        const targetUser = options.getUser('kullanici');
        const reason = options.getString('sebep') || 'Sebep belirtilmedi';
        const member = guild.members.cache.get(targetUser.id);
        
        if (!member) return interaction.reply({content:'Kullanıcı sunucuda bulunamadı.', ephemeral:true});
        if (!member.kickable) return interaction.reply({content:'Bu kullanıcıyı atamam (Yetkim yetersiz).', ephemeral:true});
        
        await member.kick(reason);
        
        const embed = new EmbedBuilder()
            .setTitle('👢 KICK İŞLEMİ')
            .setDescription(`**Atılan:** ${targetUser.tag}\n**Sebep:** ${reason}\n**Yetkili:** ${user.tag}`)
            .setColor(CONFIG.ERROR_COLOR);
        
        interaction.reply({embeds: [embed]});
    }

    // --- TICKET KUR (DİKEY BUTONLU) ---
    else if (commandName === 'ticket-kur') {
        const embed = new EmbedBuilder()
            .setTitle('🔥 SAHO CHEATS | PREMIUM DESTEK MERKEZİ')
            .setDescription(`
            **Değerli Müşterimiz, Hoş Geldiniz!**
            
            SAHO CHEATS olarak size en kaliteli hizmeti sunuyoruz.
            Lütfen işleminize uygun butona tıklayınız.
            
            💳 **SATIN ALIM & FİYATLAR**
            > Güncel fiyat listesi ve satın alma işlemleri.
            
            🛠️ **TEKNİK DESTEK**
            > Kurulum yardımı ve teknik sorunlar.
            
            🤝 **DİĞER İŞLEMLER**
            > Ortaklık, şikayet ve genel sorular.
            `)
            .setColor(CONFIG.EMBED_COLOR)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/4712/4712109.png')
            .setFooter({ text: 'SAHO CHEATS Security Systems' });

        // Butonları dikey sıralamak için her birini ayrı bir ActionRow'a koyuyoruz.
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_buy')
                .setLabel('💳 SATIN ALIM (Fiyatlar)')
                .setStyle(ButtonStyle.Success)
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_tech')
                .setLabel('🛠️ TEKNİK DESTEK')
                .setStyle(ButtonStyle.Primary)
        );
        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_other')
                .setLabel('🤝 DİĞER / ORTAKLIK')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row1, row2, row3] });
        await interaction.reply({ content: '✅ Gelişmiş panel (Dikey) kuruldu!', ephemeral: true });
    }

    // --- BAN KOMUTU ---
    else if (commandName === 'ban') { 
        const targetUser = options.getUser('kullanici'); 
        const reason = options.getString('sebep') || 'Sebep yok'; 
        const member = guild.members.cache.get(targetUser.id); 
        
        if (!member) return interaction.reply({ content: '❌ Kullanıcı yok.', ephemeral: true }); 
        if (!member.bannable) return interaction.reply({ content: '❌ Yasaklayamıyorum.', ephemeral: true }); 
        
        await member.ban({ reason: reason }); 
        
        const embed = new EmbedBuilder()
            .setTitle('🔨 YASAKLAMA')
            .setDescription(`**Yasaklanan:** ${targetUser.tag}\n**Sebep:** ${reason}`)
            .setColor(CONFIG.ERROR_COLOR);
            
        interaction.reply({ embeds: [embed] }); 
    }

    // --- UNBAN KOMUTU ---
    else if (commandName === 'unban') { 
        const targetId = options.getString('id'); 
        try { 
            await guild.members.unban(targetId); 
            interaction.reply({ content: `✅ **${targetId}** yasağı kaldırıldı.`, ephemeral: true }); 
        } 
        catch (error) { 
            interaction.reply({ content: '❌ Hata: Kullanıcı bulunamadı veya yasaklı değil.', ephemeral: true }); 
        } 
    }

    // --- BAKIM MODU ---
    else if (commandName === 'bakim-modu') { 
        isMaintenanceEnabled = options.getBoolean('durum'); 
        interaction.reply({content: `🔒 Bakım Modu: ${isMaintenanceEnabled ? 'AÇIK' : 'KAPALI'}`, ephemeral:true}); 
    }

    // --- TEMİZLE ---
    else if (commandName === 'temizle') { 
        const amount = options.getInteger('sayi'); 
        if (amount > 100) return interaction.reply({ content: 'Maksimum 100 mesaj silebilirsin.', ephemeral: true });
        
        await interaction.channel.bulkDelete(amount, true).catch(() => {}); 
        interaction.reply({ content: `🧹 **${amount}** mesaj silindi.`, ephemeral: true }); 
    }

    // --- DUYURU ---
    else if (commandName === 'duyuru') { 
        const mesaj = options.getString('mesaj'); 
        const targetChannel = options.getChannel('kanal') || interaction.channel; 
        
        const embed = new EmbedBuilder()
            .setTitle('📢 SAHO CHEATS DUYURU')
            .setDescription(mesaj)
            .setColor(CONFIG.EMBED_COLOR)
            .setFooter({ text: guild.name })
            .setTimestamp(); 
            
        await targetChannel.send({ content: '@everyone', embeds: [embed] }); 
        interaction.reply({ content: '✅ Duyuru gönderildi.', ephemeral: true }); 
    }

    // --- SUNUCU BİLGİ ---
    else if (commandName === 'sunucu-bilgi') { 
        const embed = new EmbedBuilder()
            .setTitle(`📊 ${guild.name} İstatistikleri`)
            .addFields(
                { name: '👥 Üye Sayısı', value: `${guild.memberCount}`, inline: true },
                { name: '💬 Kanal Sayısı', value: `${guild.channels.cache.size}`, inline: true }
            )
            .setColor(CONFIG.EMBED_COLOR); 
            
        interaction.reply({ embeds: [embed] }); 
    }

    // --- KARA LİSTE EKLE ---
    else if (commandName === 'karaliste-ekle') { 
        const target = options.getUser('kullanici'); 
        await firebaseRequest('patch', '_BLACKLIST_', { [target.id]: "BAN" }); 
        interaction.reply({ content: `⛔ **${target.tag}** engellendi.`, ephemeral: true }); 
    }

    // --- KARA LİSTE ÇIKAR ---
    else if (commandName === 'karaliste-cikar') { 
        const target = options.getUser('kullanici'); 
        const url = `${CONFIG.FIREBASE_URL}_BLACKLIST_/${target.id}.json?auth=${CONFIG.FIREBASE_SECRET}`; 
        await axios.delete(url); 
        interaction.reply({ content: `✅ **${target.tag}** engeli kalktı.`, ephemeral: true }); 
    }

    // --- DURUM GÜNCELLEME ---
    else if (commandName === 'durum-guncelle') { 
        const urun = options.getString('urun'); 
        const durum = options.getString('durum'); 
        let color, statusText, emoji; 
        
        if (durum === 'safe') { color = 'Green'; statusText = 'SAFE / GÜVENLİ'; emoji = '🟢'; } 
        else if (durum === 'detected') { color = 'Red'; statusText = 'DETECTED / RİSKLİ'; emoji = '🔴'; } 
        else { color = 'Yellow'; statusText = 'UPDATING / BAKIMDA'; emoji = '🟡'; } 
        
        const embed = new EmbedBuilder()
            .setTitle(`${emoji} SİSTEM DURUM BİLGİSİ`)
            .addFields(
                { name: '📂 Yazılım', value: `**${urun}**`, inline: true }, 
                { name: '📡 Durum', value: `\`${statusText}\``, inline: true }
            )
            .setColor(color)
            .setFooter({ text: 'SAHO CHEATS Status' }); 
            
        await interaction.channel.send({ embeds: [embed] }); 
        await interaction.reply({ content: '✅ Durum güncellendi.', ephemeral: true }); 
    }

    // --- ÇARK HAK EKLE ---
    else if (commandName === 'cark-hak-ekle') { 
        const target = options.getUser('kullanici'); 
        const adet = options.getInteger('adet'); 
        let currentRight = await firebaseRequest('get', `_SPIN_RIGHTS_/${target.id}`); 
        if (!currentRight) currentRight = 0; else currentRight = parseInt(currentRight); 
        await firebaseRequest('put', `_SPIN_RIGHTS_/${target.id}`, currentRight + adet); 
        interaction.reply({ content: `✅ **${target.tag}** kullanıcısına **+${adet}** hak eklendi.`, ephemeral: true }); 
    }

    // --- ÇARK ORANLARI ---
    else if (commandName === 'cark-oranlar') { 
        const embed = new EmbedBuilder()
            .setTitle('🎡 SAHO CHEATS | ORANLAR')
            .setDescription('💎 %0.5 External\n🔥 %1.5 Bypass\n👑 %3.0 Mod Menü\n🎫 %10 İndirim\n❌ %85 PAS')
            .setColor('Gold'); 
        interaction.reply({ embeds: [embed] }); 
    }

    // --- REFERANS ---
    else if (commandName === 'referans') { 
        const puan = options.getInteger('puan'); 
        const yorum = options.getString('yorum'); 
        const stars = '⭐'.repeat(puan); 
        
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${user.username} referans bıraktı!`, iconURL: user.displayAvatarURL() })
            .setDescription(`**Puan:** ${stars}\n**Yorum:** ${yorum}`)
            .setColor('Gold'); 
            
        const vouchChannel = guild.channels.cache.find(c => c.name.includes('referans') || c.name.includes('vouch')); 
        if (vouchChannel) { 
            await vouchChannel.send({ embeds: [embed] }); 
            interaction.reply({ content: '❤️ Referansınız için teşekkürler!', ephemeral: true }); 
        } 
        else interaction.reply({ content: 'Referans kanalı bulunamadı.', ephemeral: true }); 
    }
    
    // --- ÇARKIFELEK (SPIN) ---
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
            const cooldown = 24 * 60 * 60 * 1000; // 24 Saat
            if (spinData) {
                const lastSpin = parseInt(spinData);
                if (now - lastSpin < cooldown) return interaction.editReply(`⏳ **Günlük hakkın doldu!**\nTekrar denemek için: <t:${Math.floor((lastSpin + cooldown) / 1000)}:R>`);
            }
            await firebaseRequest('patch', '_SPIN_TIMES_', { [user.id]: now });
        }

        const items = [
            { name: "1 AYLIK EXTERNAL 💎", chance: 5, type: 'legendary' }, 
            { name: "1 HAFTALIK BYPASS 🔥", chance: 15, type: 'epic' }, 
            { name: "1 GÜNLÜK MOD MENU 👑", chance: 30, type: 'rare' }, 
            { name: "%10 İndirim Kuponu 🎫", chance: 100, type: 'common' }, 
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
            description = `🎉 **TEBRİKLER! ÖDÜL KAZANDIN!**\n\nKazandığın: **${selectedItem.name}**\n\n*Hemen ticket aç ve bu ekranın görüntüsünü at!*`; 
        } else if (selectedItem.type === 'lose') { 
            color = 'Red'; 
            description = `📉 **Maalesef...**\n\nSonuç: **${selectedItem.name}**\n\n*Yarın tekrar gel veya hak satın al!*`; 
        } else { 
            color = 'Blue'; 
            description = `👍 **Fena Değil!**\n\nKazandığın: **${selectedItem.name}**\n*Ticket açıp indirimini kullanabilirsin.*`; 
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🎡 SAHO CHEATS ÇARKIFELEK')
            .setDescription(description)
            .setColor(color)
            .setFooter({ text: footerText });
            
        await interaction.editReply({ embeds: [embed] }); 
    }

    // --- LİSANS YÖNETİMİ (VIP/NORMAL/SİLME) ---
    else if (['vip-ekle', 'kullanici-ekle', 'olustur', 'sil', 'hwid-hak-ekle', 'durdurma-hak-ekle'].includes(commandName)) {
        // HWID HAK EKLE
        if (commandName === 'hwid-hak-ekle' || commandName === 'durdurma-hak-ekle') { 
            await interaction.deferReply({ ephemeral: true }); 
            const data = await firebaseRequest('get', ''); 
            if (!data) return interaction.editReply('Veri yok.'); 
            
            const keys = Object.keys(data).filter(k => !k.startsWith("_")).slice(0, 25); 
            const adet = options.getInteger('adet'); 
            const type = commandName === 'hwid-hak-ekle' ? 'hwid' : 'durdurma'; 
            
            const menu = new StringSelectMenuBuilder()
                .setCustomId(`add_right_${type}_${adet}`)
                .setPlaceholder('Key Seç...')
                .addOptions(keys.map(k => new StringSelectMenuOptionBuilder().setLabel(k).setValue(k).setEmoji('➕'))); 
                
            interaction.editReply({ content: `👇 **${type.toUpperCase()} Ekle:**`, components: [new ActionRowBuilder().addComponents(menu)] }); 
            return; 
        }
        
        // KEY SİL
        if (commandName === 'sil') { 
            await interaction.deferReply({ ephemeral: true }); 
            const data = await firebaseRequest('get', ''); 
            if (!data) return interaction.editReply('Veri yok.'); 
            
            const keys = Object.keys(data).filter(k => !k.startsWith("_")).slice(0, 25); 
            
            const menu = new StringSelectMenuBuilder()
                .setCustomId('delete_key')
                .setPlaceholder('Sil...')
                .addOptions(keys.map(k => new StringSelectMenuOptionBuilder().setLabel(k).setValue(k).setEmoji('🗑️'))); 
                
            interaction.editReply({ content: '🗑️ **Silinecek keyi seçin:**', components: [new ActionRowBuilder().addComponents(menu)] }); 
            return; 
        }
        
        // KEY EKLE (VIP/NORMAL)
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
            
            interaction.editReply({ content: `✅ **${target.username}** kullanıcısına lisans tanımlandı.` }); 
            try { await target.send({ content: `🎉 **Lisansınız Hazır!**`, embeds: payload.embeds, components: payload.components }); } catch (e) {} 
            return; 
        }
        
        // BOŞ KEY OLUŞTUR
        if (commandName === 'olustur') { 
            const gun = options.getInteger('gun'); 
            let key = options.getString('isim') || "KEY-" + Math.random().toString(36).substring(2, 8).toUpperCase(); 
            await firebaseRequest('put', key.toUpperCase(), `bos,${gun},aktif,${new Date().toISOString().split('T')[0]},0,0,0,NORMAL`); 
            interaction.reply({ content: `🔑 **Boş Key:** \`${key.toUpperCase()}\``, ephemeral: true }); 
        }
    }
}

// =============================================================================
//                             8. BUTON HANDLER (GELİŞMİŞ TICKET)
// =============================================================================
async function handleButton(interaction) {
    const { customId, user, guild, channel } = interaction;

    // --- TICKET AÇMA ---
    if (customId.startsWith('ticket_')) {
        // Bakım modu kontrolü
        if (isMaintenanceEnabled && !await checkPermission(user.id)) {
            return interaction.reply({ content: '🔒 **SİSTEM BAKIMDA**\nŞu anda yeni destek talebi oluşturamazsınız.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });
        const type = customId.split('_')[1];
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

        // TICKET İÇİ KONTROL PANELİ
        const controlEmbed = new EmbedBuilder()
            .setTitle('👋 Hoş Geldiniz')
            .setDescription(`Sayın **${user}**,\n\nYetkililerimiz birazdan sizinle ilgilenecektir. Lütfen sorununuzu detaylı bir şekilde yazınız.\n\n*Ticket işlemlerini aşağıdaki butonlardan yapabilirsiniz.*`)
            .setColor(CONFIG.EMBED_COLOR);

        const controlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Kapat & Arşivle').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('Yetkili: Sahiplen').setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️')
        );

        if (type === 'buy') {
            const productMenu = new StringSelectMenuBuilder().setCustomId('select_product').setPlaceholder('📦 Hangi ürünü almak istiyorsunuz?').addOptions(
                { label: 'PC UID Bypass', value: 'prod_uid', emoji: '🛡️' },
                { label: 'PC External', value: 'prod_external', emoji: '🔮' },
                { label: 'PC Mod Menü', value: 'prod_modmenu', emoji: '👑' },
                { label: 'PC Fake Lag', value: 'prod_fakelag', emoji: '💨' },
                { label: 'Android Fake Lag', value: 'prod_android', emoji: '📱' }
            );
            
            await ticketChannel.send({ 
                content: `${user} | <@&${CONFIG.SUPPORT_ROLE_ID}>`, 
                embeds: [controlEmbed], 
                components: [new ActionRowBuilder().addComponents(productMenu), controlRow] 
            });
        } else {
            await ticketChannel.send({ 
                content: `${user} | <@&${CONFIG.SUPPORT_ROLE_ID}>`, 
                embeds: [controlEmbed], 
                components: [controlRow] 
            });
        }

        await interaction.editReply(`✅ Ticket açıldı: ${ticketChannel}`);
        return; 
    }

    // --- TICKET KAPATMA ---
    if (customId === 'close_ticket') {
        const modal = new EmbedBuilder().setDescription('🔒 **Ticket 5 saniye içinde kapatılıyor...**').setColor(CONFIG.ERROR_COLOR);
        interaction.reply({ embeds: [modal] });
        sendLog(guild, `📕 **TICKET KAPANDI**\n**Kapatan:** ${user.tag}\n**Kanal:** ${channel.name}`);
        setTimeout(() => channel.delete().catch(() => {}), 5000);
    }
    else if (customId === 'claim_ticket') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.reply({ content: '⛔ Yetkisiz!', ephemeral: true });
        channel.send({ embeds: [new EmbedBuilder().setDescription(`✅ Bu talep **${user}** tarafından devralındı.`).setColor(CONFIG.SUCCESS_COLOR)] });
    }

    // --- LİSANS İŞLEMLERİ (DURDUR / SIFIRLA) ---
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

// =============================================================================
//                             9. SELECT MENU HANDLER
// =============================================================================
async function handleSelectMenu(interaction) {
    
    // --- SSS (SIKÇA SORULAN SORULAR) ---
    if (interaction.customId === 'faq_select') {
        const val = interaction.values[0];
        let title, desc;
        
        switch(val) {
            case 'faq_ban': title = '🛡️ Ban Riski Var Mı?'; desc = 'Yazılımlarımız %100 External ve güvenlidir. Ancak her hilede olduğu gibi düşük de olsa risk vardır. Legit (belli etmeden) oynarsanız sorun yaşamazsınız.'; break;
            case 'faq_buy': title = '💳 Nasıl Satın Alırım?'; desc = 'Satın almak için `#ticket-kur` kanalından "Satın Alım" ticketı oluşturun. IBAN, Papara ve Kripto kabul ediyoruz.'; break;
            case 'faq_refund': title = '🔄 İade Var Mı?'; desc = 'Dijital ürünlerde (Key teslim edildikten sonra) iade mümkün değildir. Ancak ürün bizden kaynaklı çalışmazsa iade yapılır.'; break;
            case 'faq_support': title = '⏰ Destek Saatleri'; desc = 'Otomatik sistemimiz 7/24 aktiftir. Yetkili ekibimiz genellikle 10:00 - 02:00 saatleri arasında canlı destek verir.'; break;
            case 'faq_install': title = '🛠️ Kurulum Zor Mu?'; desc = 'Hayır! Tek tıkla çalışan Loader sistemimiz mevcuttur. Ayrıca satın alım sonrası kurulum videosu iletmekteyiz.'; break;
        }
        
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle(title).setDescription(desc).setColor(CONFIG.SUCCESS_COLOR)], ephemeral: true });
    }

    // --- MARKET FİYAT GÖSTERİMİ ---
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

    // --- LİSANS İŞLEMLERİ (SİLME / HAK EKLEME) ---
    if (interaction.customId === 'delete_key' || interaction.customId.startsWith('add_right_')) {
        if (!await checkPermission(interaction.user.id)) return interaction.reply({ content: '⛔ Yetkisiz.', ephemeral: true });
        
        const key = interaction.values[0];
        
        if (interaction.customId === 'delete_key') { 
            await interaction.deferUpdate(); 
            await firebaseRequest('delete', key); 
            interaction.editReply({ content: `✅ **${key}** silindi!`, components: [] }); 
        } 
        else {
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
            } 
            else interaction.editReply({ content: '❌ Key bulunamadı.', components: [] });
        }
    }
}

// =============================================================================
//                             10. CRASH ENGELLEYİCİ (ANTI-CRASH)
// =============================================================================
process.on('unhandledRejection', error => { 
    console.error('Beklenmeyen Hata:', error); 
    // Botun çökmesini engeller
});

client.login(process.env.TOKEN);
