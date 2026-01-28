require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, 
    REST, Routes, SlashCommandBuilder, PermissionFlagsBits 
} = require('discord.js');
const express = require('express');
const axios = require('axios');

// --- AYARLAR ---
const CONFIG = {
    FIREBASE_URL: process.env.FIREBASE_URL, 
    FIREBASE_SECRET: process.env.FIREBASE_SECRET,
    // BURAYI KONTROL ET: Senin Discord ID'n bu olmalı
    OWNER_ID: "1380526273431994449", 
    
    // LİMİTLER
    DEFAULT_PAUSE_LIMIT: 2,
    DEFAULT_RESET_LIMIT: 1,
    VIP_PAUSE_LIMIT: 999, 
    VIP_RESET_LIMIT: 5
};

// --- 1. 7/24 AKTİF TUTMA (WEB SERVER) ---
const app = express();
app.get('/', (req, res) => res.send('FAKE LAG V1 - SYSTEM ONLINE'));
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Web sunucusu ${port} portunda çalışıyor.`));

// --- 2. BOT KURULUMU ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- 3. KOMUTLARI HAZIRLA ---
const commands = [
    new SlashCommandBuilder().setName('admin-panel').setDescription('👑 (Owner/Admin) Yönetici kontrol merkezi.'),
    new SlashCommandBuilder().setName('vip-ekle').setDescription('💎 (Yetkili) Sınırsız hakka sahip VIP lisans oluştur.').addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true)).addStringOption(o => o.setName('key_ismi').setDescription('Key Adı').setRequired(true)).addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true)),
    new SlashCommandBuilder().setName('kullanici-ekle').setDescription('🛠️ (Yetkili) Standart kullanıcı lisansı oluştur.').addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true)).addStringOption(o => o.setName('key_ismi').setDescription('Key Adı').setRequired(true)).addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true)),
    new SlashCommandBuilder().setName('olustur').setDescription('🛠️ (Yetkili) Boş (Sahipsiz) key oluşturur.').addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true)).addStringOption(o => o.setName('isim').setDescription('İsim (Opsiyonel)')),
    new SlashCommandBuilder().setName('sil').setDescription('🗑️ (Yetkili) Veritabanından key sil (Listeli).'),
    new SlashCommandBuilder().setName('yetkili-ekle').setDescription('👑 (Owner) Yeni bir yönetici ekle.').addUserOption(o => o.setName('kullanici').setDescription('Yetkili yapılacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('yetkili-cikar').setDescription('👑 (Owner) Yetkiyi al.').addUserOption(o => o.setName('kullanici').setDescription('Yetkisi alınacak kişi').setRequired(true)),
    new SlashCommandBuilder().setName('lisansim').setDescription('👤 Lisans panelini aç (Durdur/Başlat/Reset).'),
    new SlashCommandBuilder().setName('lisans-bagla').setDescription('🔗 Elindeki keyi hesabına tanımla.').addStringOption(o => o.setName('key').setDescription('Key').setRequired(true)),
    new SlashCommandBuilder().setName('help').setDescription('❓ Yardım menüsü.'),
].map(command => command.toJSON());

// --- 4. FIREBASE FONKSİYONLARI ---
async function firebaseRequest(method, path, data = null) {
    const url = `${CONFIG.FIREBASE_URL}${path}.json?auth=${CONFIG.FIREBASE_SECRET}`;
    try {
        const payload = data ? JSON.stringify(data) : null;
        const response = await axios({ method, url, data: payload, headers: { 'Content-Type': 'application/json' } });
        return response.data;
    } catch (error) {
        console.error("Firebase Hatası:", error.response ? error.response.data : error.message);
        return null;
    }
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

// --- 5. YETKİ KONTROLÜ ---
async function checkPermission(userId) {
    // Owner ise direkt geç
    if (userId === CONFIG.OWNER_ID) return true;
    
    // Değilse Firebase'e bak
    const admins = await firebaseRequest('get', '_ADMINS_');
    if (admins && admins[userId]) return true;
    
    return false;
}

// --- 6. BOT BAŞLATMA ---
client.once('ready', async () => {
    console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
    client.user.setActivity('FAKE LAG V1 | /help');
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('🔄 Komutlar yenileniyor...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✨ Komutlar hazır!');
    } catch (error) {
        console.error("❌ Komut hatası:", error);
    }
});

// --- 7. ETKİLEŞİM YÖNETİCİSİ ---
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isStringSelectMenu()) return handleSelectMenu(interaction);
        if (interaction.isButton()) return handleButton(interaction);
        if (interaction.isChatInputCommand()) return handleCommand(interaction);
    } catch (e) {
        console.error("Interaction Hatası:", e);
    }
});

// --- 8. KOMUT İŞLEYİCİ ---
async function handleCommand(interaction) {
    const { commandName, options, user } = interaction;
    const userId = user.id;

    // --- HELP ---
    if (commandName === 'help') {
        const isAdmin = await checkPermission(userId);
        const embed = new EmbedBuilder()
            .setTitle('🤖 FAKE LAG V1')
            .setColor('Blurple')
            .addFields({ name: '👤 Kullanıcı', value: '`/lisansim`\n`/lisans-bagla`' });
        if (isAdmin) embed.addFields({ name: '🛡️ Yönetici', value: '`/admin-panel`\n`/vip-ekle`\n`/kullanici-ekle`\n`/olustur`\n`/sil`' });
        if (userId === CONFIG.OWNER_ID) embed.addFields({ name: '👑 Owner', value: '`/yetkili-ekle`\n`/yetkili-cikar`' });
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // --- PUBLIC KOMUTLAR ---
    if (commandName === 'lisans-bagla') {
        await interaction.deferReply({ ephemeral: true });
        const inputKey = options.getString('key').toUpperCase();
        const rawData = await firebaseRequest('get', inputKey);
        if (!rawData) return interaction.editReply('❌ **Key bulunamadı!**');
        
        let parts = rawData.split(',');
        if (parts.length > 4 && parts[4] !== '0' && parts[4] !== userId) return interaction.editReply('❌ **Bu key başkasına ait!**');
        if (parts[4] === userId) return interaction.editReply('⚠️ Zaten sana ait.');

        parts[4] = userId; 
        await firebaseRequest('put', inputKey, parts.join(','));
        return interaction.editReply(`✅ \`${inputKey}\` başarıyla bağlandı!`);
    }

    if (commandName === 'lisansim') {
        await interaction.deferReply({ ephemeral: true });
        const result = await findUserKey(user.id);
        if (!result) return interaction.editReply('❌ **Lisansın Yok!** `/lisans-bagla` kullan.');
        return sendLicensePanel(interaction, result.key, result.parts);
    }

    // --- YETKİ KONTROL NOKTASI ---
    const isAllowed = await checkPermission(userId);
    
    // EĞER YETKİSİ YOKSA BURADA HATA VERİR VE ID GÖSTERİR
    if (!isAllowed) {
        return interaction.reply({ 
            content: `⛔ **BU KOMUT İÇİN YETKİN YOK!**\n\n🆔 **Senin ID:** \`${userId}\`\n👑 **Owner ID:** \`${CONFIG.OWNER_ID}\`\n\n*(Eğer Owner sensen, yukarıdaki iki numaranın aynı olması lazım. Farklıysa koddaki ID'yi değiştir.)*`, 
            ephemeral: true 
        });
    }

    // --- YETKİLİ KOMUTLARI ---
    if (commandName === 'sil') {
        await interaction.deferReply({ ephemeral: true });
        const data = await firebaseRequest('get', '');
        if (!data) return interaction.editReply('Veritabanı boş.');
        const keys = Object.keys(data).filter(k => !k.startsWith("_")).slice(0, 25); 
        if (keys.length === 0) return interaction.editReply('Silinecek key yok.');
        
        const selectMenu = new StringSelectMenuBuilder().setCustomId('delete_key_menu').setPlaceholder('Silinecek Keyi Seç...').addOptions(keys.map(k => new StringSelectMenuOptionBuilder().setLabel(k).setValue(k).setDescription('Silmek için tıkla')));
        return interaction.editReply({ content: '🗑️ **Silinecek keyi seç:**', components: [new ActionRowBuilder().addComponents(selectMenu)] });
    }

    if (commandName === 'vip-ekle' || commandName === 'kullanici-ekle') {
        const target = options.getUser('kullanici');
        const key = options.getString('key_ismi').toUpperCase();
        const gun = options.getInteger('gun');
        const isVip = commandName === 'vip-ekle';
        const type = isVip ? 'VIP' : 'NORMAL';
        
        const data = `bos,${gun},aktif,${new Date().toISOString().split('T')[0]},${target.id},0,0,${type}`;
        await firebaseRequest('put', key, data);
        await interaction.reply(`✅ **${type} Lisans Tanımlandı!**\n👤 ${target}\n🔑 \`${key}\``);
    }

    if (commandName === 'olustur') {
        const gun = options.getInteger('gun');
        let key = options.getString('isim');
        if (!key) key = "KEY-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        else key = key.toUpperCase();
        const data = `bos,${gun},aktif,${new Date().toISOString().split('T')[0]},0,0,0,NORMAL`; 
        await firebaseRequest('put', key, data);
        await interaction.reply({ content: `🔑 **Boş Key:** \`${key}\` (${gun} Gün)\n`/lisans-bagla` ile alınabilir.`, ephemeral: true });
    }

    if (commandName === 'admin-panel') {
        const embed = new EmbedBuilder().setTitle('🛠️ YÖNETİCİ PANELİ').setDescription('`/vip-ekle`, `/kullanici-ekle`, `/sil`, `/olustur` komutlarını kullanabilirsin.').setColor('Gold');
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'yetkili-ekle' || commandName === 'yetkili-cikar') {
        if (userId !== CONFIG.OWNER_ID) return interaction.reply({ content: '❌ Sadece Owner yapabilir!', ephemeral: true });
        const target = options.getUser('kullanici');
        if (commandName === 'yetkili-ekle') {
            await firebaseRequest('put', `_ADMINS_/${target.id}`, { name: target.username });
            await interaction.reply(`✅ ${target} artık yetkili.`);
        } else {
            await firebaseRequest('delete', `_ADMINS_/${target.id}`);
            await interaction.reply(`🗑️ ${target} yetkisi alındı.`);
        }
    }
}

// --- 9. BUTON VE SELECT MENU ---
async function handleButton(interaction) {
    const result = await findUserKey(interaction.user.id);
    if (!result) return interaction.reply({ content: 'Lisans bulunamadı.', ephemeral: true });
    
    let { key, parts } = result;
    while (parts.length < 8) parts.push("0"); 
    const isVIP = parts[7] === 'VIP';
    const LIMITS = { PAUSE: isVIP ? CONFIG.VIP_PAUSE_LIMIT : CONFIG.DEFAULT_PAUSE_LIMIT, RESET: isVIP ? CONFIG.VIP_RESET_LIMIT : CONFIG.DEFAULT_RESET_LIMIT };
    let [durum, pause, reset] = [parts[2], parseInt(parts[5]), parseInt(parts[6])];

    if (interaction.customId === 'toggle') {
        if (durum === 'aktif') {
            if (pause >= LIMITS.PAUSE) return interaction.reply({ content: `❌ Limit Doldu!`, ephemeral: true });
            durum = 'pasif'; pause++;
        } else durum = 'aktif';
        parts[2] = durum; parts[5] = pause;
        await firebaseRequest('put', key, parts.join(','));
        return sendLicensePanel(interaction, key, parts, true);
    }
    if (interaction.customId === 'reset') {
        if (reset >= LIMITS.RESET) return interaction.reply({ content: `❌ Limit Doldu!`, ephemeral: true });
        parts[0] = 'bos'; reset++; parts[6] = reset; // HWID Sıfırla
        await firebaseRequest('put', key, parts.join(','));
        await interaction.reply({ content: '✅ HWID Sıfırlandı!', ephemeral: true });
        return sendLicensePanel(interaction, key, parts, true);
    }
}

async function handleSelectMenu(interaction) {
    if (interaction.customId === 'delete_key_menu') {
        if (!await checkPermission(interaction.user.id)) return interaction.reply({ content: 'Yetkisiz.', ephemeral: true });
        await firebaseRequest('delete', interaction.values[0]);
        await interaction.update({ content: `✅ **${interaction.values[0]}** silindi!`, components: [] });
    }
}

async function sendLicensePanel(interaction, key, parts, isUpdate = false) {
    const isVIP = parts.length > 7 && parts[7] === 'VIP';
    const LIMITS = { PAUSE: isVIP ? CONFIG.VIP_PAUSE_LIMIT : CONFIG.DEFAULT_PAUSE_LIMIT, RESET: isVIP ? CONFIG.VIP_RESET_LIMIT : CONFIG.DEFAULT_RESET_LIMIT };
    let [durum, pause, reset] = [parts[2], parseInt(parts[5] || 0), parseInt(parts[6] || 0)];
    
    const embed = new EmbedBuilder()
        .setTitle(`⚙️ LİSANS: ${isVIP ? '💎 VIP' : 'STANDART'}`)
        .setColor(isVIP ? 'Gold' : 'Green')
        .addFields(
            { name: '🔑 Key', value: `\`${key}\``, inline: true },
            { name: '📡 Durum', value: durum === 'aktif' ? '✅ AKTİF' : '⏸️ DURUK', inline: true },
            { name: '\u200B', value: '\u200B', inline: false },
            { name: '⏸️ Durdurma', value: isVIP ? '∞' : `${LIMITS.PAUSE - pause}/${LIMITS.PAUSE}`, inline: true },
            { name: '💻 Reset', value: `${LIMITS.RESET - reset}/${LIMITS.RESET}`, inline: true }
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('toggle').setLabel(durum === 'aktif' ? 'DURDUR' : 'BAŞLAT').setStyle(durum === 'aktif' ? ButtonStyle.Danger : ButtonStyle.Success).setDisabled(durum === 'aktif' && !isVIP && pause >= LIMITS.PAUSE),
        new ButtonBuilder().setCustomId('reset').setLabel('HWID SIFIRLA').setStyle(ButtonStyle.Primary).setDisabled(reset >= LIMITS.RESET)
    );

    if (isUpdate) try { await interaction.update({ embeds: [embed], components: [row] }); } catch {} else await interaction.editReply({ embeds: [embed], components: [row] });
}

client.login(process.env.TOKEN);