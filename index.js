const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const axios = require('axios');

// --- AYARLAR (Senin Bilgilerin) ---
const CONFIG = {
    FIREBASE_URL: process.env.FIREBASE_URL,
    FIREBASE_SECRET: process.env.FIREBASE_SECRET,
    CLIENT_ID: process.env.CLIENT_ID, // Botunun ID'sini buraya yazmalısın (Tokenin başındaki sayı değil, sağ tık ID kopyala)
    // Eğer ID'yi bilmiyorsan discord developer portal'dan bakabilirsin.
    // Şimdilik tokenin başındaki kısmı deniyorum ama çalışmazsa developer portal'dan 'Application ID' alıp buraya yapıştır.
};
// Not: Tokenin ilk kısmı genelde ID'dir ama base64 kodludur. 
// O yüzden KODU ÇALIŞTIRMADAN ÖNCE: Discord Developer Portal'a gir, "Application ID"ni kopyala ve yukarıdaki CLIENT_ID kısmına yapıştır.

// --- 1. 7/24 AKTİF TUTMA (WEB SERVER) ---
const app = express();
app.get('/', (req, res) => res.send('FAKE LAG V1 Botu Aktif!'));
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Web sunucusu ${port} portunda çalışıyor.`));

// --- 2. BOT KURULUMU ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- 3. KOMUTLARI HAZIRLA ---
const commands = [
    new SlashCommandBuilder()
        .setName('kullanici-ekle')
        .setDescription('Kullanıcıya özel key oluşturur ve DM atar.')
        .addUserOption(option => option.setName('kullanici').setDescription('Kullanıcıyı seç').setRequired(true))
        .addStringOption(option => option.setName('key_ismi').setDescription('Özel Key İsmi').setRequired(true))
        .addIntegerOption(option => option.setName('gun').setDescription('Kaç gün?').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    new SlashCommandBuilder()
        .setName('olustur')
        .setDescription('Rastgele veya özel key oluşturur.')
        .addIntegerOption(option => option.setName('gun').setDescription('Kaç gün?').setRequired(true))
        .addStringOption(option => option.setName('isim').setDescription('Özel isim (Boş bırakırsan rastgele)')),

    new SlashCommandBuilder()
        .setName('sil')
        .setDescription('Bir keyi siler.')
        .addStringOption(option => option.setName('key').setDescription('Silinecek Key').setRequired(true)),

    new SlashCommandBuilder()
        .setName('lisansim')
        .setDescription('Kendi lisans durumunu gör ve yönet.'),
    
    new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Sistem istatistikleri.'),
    
    new SlashCommandBuilder()
        .setName('bakim')
        .setDescription('Sistemi bakıma al veya aç.')
        .addStringOption(option => option.setName('mod').setDescription('AKTIF veya KAPALI').setRequired(true).addChoices({ name: 'Sistemi Aç', value: 'AKTIF' }, { name: 'Sistemi Kapat', value: 'KAPALI' }))

].map(command => command.toJSON());

// --- 4. FIREBASE FONKSİYONLARI ---
async function firebaseRequest(method, path, data = null) {
    const url = `${CONFIG.FIREBASE_URL}${path}.json?auth=${CONFIG.FIREBASE_SECRET}`;
    try {
        const response = await axios({ method, url, data });
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
        const parts = value.split(','); // format: bos,gun,durum,tarih,dcID,pause,reset
        if (parts[4] === discordId) return { key, parts };
    }
    return null;
}

// --- 5. BOT BAŞLATMA VE KOMUT YÜKLEME ---
client.once('ready', async () => {
    console.log(`Bot giriş yaptı: ${client.user.tag}`);
    client.user.setActivity('FAKE LAG V1 | /lisansim');

    // Komutları Yükle
    const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
    try {
        console.log('Komutlar yükleniyor...');
        // Yukarıda CONFIG.CLIENT_ID'yi düzeltmeyi unutma!
        // Eğer client.user.id çalışmazsa manuel girmen gerekebilir.
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Komutlar başarıyla yüklendi!');
    } catch (error) {
        console.error(error);
    }
});

// --- 6. KOMUTLARI DİNLEME ---
client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) return handleButton(interaction);
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, user } = interaction;

    // --- KULLANICI EKLE ---
    if (commandName === 'kullanici-ekle') {
        await interaction.deferReply({ ephemeral: true });
        const targetUser = options.getUser('kullanici');
        const keyIsmi = options.getString('key_ismi').trim().toUpperCase();
        const gun = options.getInteger('gun');
        const tarih = new Date().toISOString().split('T')[0];

        // Format: bos,gun,durum,tarih,dcID,pause,reset
        const data = `bos,${gun},aktif,${tarih},${targetUser.id},0,0`;
        await firebaseRequest('put', keyIsmi, data);

        const embed = new EmbedBuilder()
            .setTitle('✅ Kullanıcı Tanımlandı')
            .setDescription(`${targetUser} kullanıcısına \`${keyIsmi}\` tanımlandı.`)
            .setColor(0x00FF41); // Matrix Yeşili

        await interaction.editReply({ embeds: [embed] });

        // DM At
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('🔑 FAKE LAG V1 LİSANS')
                .setDescription(`Merhaba **${targetUser.username}**, lisansın aktif.`)
                .addFields(
                    { name: 'Lisans', value: `\`${keyIsmi}\`` },
                    { name: 'Süre', value: `${gun} Gün` }
                )
                .setColor(0x00C8FF);
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (e) {
            await interaction.followUp({ content: 'Key oluştu ama DM atılamadı.', ephemeral: true });
        }
    }

    // --- OLUŞTUR ---
    if (commandName === 'olustur') {
        await interaction.deferReply({ ephemeral: true });
        const gun = options.getInteger('gun');
        let key = options.getString('isim');
        if (!key) key = Math.random().toString(36).substring(2, 12).toUpperCase();
        else key = key.toUpperCase();
        
        const tarih = new Date().toISOString().split('T')[0];
        // Discord ID yoksa 0 yazıyoruz
        const data = `bos,${gun},aktif,${tarih},0,0,0`;
        await firebaseRequest('put', key, data);

        const embed = new EmbedBuilder()
            .setTitle('✅ Key Oluşturuldu')
            .setDescription(`Key: \`${key}\`\nSüre: \`${gun} Gün\``)
            .setColor(0x00FF41);
        await interaction.editReply({ embeds: [embed] });
    }

    // --- SİL ---
    if (commandName === 'sil') {
        await interaction.deferReply();
        const key = options.getString('key');
        await firebaseRequest('delete', key);
        const embed = new EmbedBuilder().setTitle('🗑️ Silindi').setDescription(`\`${key}\` silindi.`).setColor(0xFF0032);
        await interaction.editReply({ embeds: [embed] });
    }

    // --- LİSANSIM ---
    if (commandName === 'lisansim') {
        await interaction.deferReply({ ephemeral: true });
        const result = await findUserKey(user.id);
        if (!result) return interaction.editReply('❌ Sana ait bir lisans bulunamadı.');

        const { key, parts } = result;
        const [_, gun, durum, tarih, dcID, pauseUsed, resetUsed] = parts;

        const embed = new EmbedBuilder()
            .setTitle(`⚙️ KONTROL PANELİ: ${user.username}`)
            .addFields(
                { name: '🔑 Lisans', value: `\`${key}\``, inline: true },
                { name: '🛡️ Durum', value: durum.toUpperCase(), inline: true },
                { name: '⏸️ Durdurma Hakkı', value: `${2 - pauseUsed}/2`, inline: true },
                { name: '💻 Reset Hakkı', value: `${1 - resetUsed}/1`, inline: true }
            )
            .setColor(0x00FF41);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('toggle').setLabel('Durdur/Başlat').setStyle(ButtonStyle.Primary).setDisabled(pauseUsed >= 2 && durum === 'aktif'),
            new ButtonBuilder().setCustomId('reset').setLabel('HWID Sıfırla').setStyle(ButtonStyle.Danger).setDisabled(resetUsed >= 1)
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
    }

    // --- DASHBOARD ---
    if (commandName === 'dashboard') {
        await interaction.deferReply();
        const data = await firebaseRequest('get', '');
        let total = 0, active = 0;
        if (data) {
            Object.keys(data).forEach(k => {
                if (!k.startsWith("_")) {
                    total++;
                    if (data[k].includes('aktif')) active++;
                }
            });
        }
        const embed = new EmbedBuilder()
            .setTitle('📊 FAKE LAG V1 İSTATİSTİK')
            .addFields(
                { name: 'Toplam Key', value: `${total}`, inline: true },
                { name: 'Aktif Key', value: `${active}`, inline: true }
            )
            .setColor(0x00C8FF);
        await interaction.editReply({ embeds: [embed] });
    }

    // --- BAKIM ---
    if (commandName === 'bakim') {
        const mod = options.getString('mod');
        await firebaseRequest('put', '_SYSTEM_STATUS', mod);
        await interaction.reply({ content: `Sistem durumu güncellendi: **${mod}**`, ephemeral: false });
    }
});

// --- 7. BUTON YÖNETİMİ ---
async function handleButton(interaction) {
    await interaction.deferUpdate();
    const result = await findUserKey(interaction.user.id);
    if (!result) return;
    
    const { key, parts } = result;
    // Parts: [bos, gun, durum, tarih, dcID, pause, reset]
    // Index:  0    1    2      3      4     5      6

    if (interaction.customId === 'toggle') {
        let yeniDurum = parts[2] === 'aktif' ? 'pasif' : 'aktif';
        let pauseUsed = parseInt(parts[5]);
        if (yeniDurum === 'pasif') pauseUsed++;

        parts[2] = yeniDurum;
        parts[5] = pauseUsed;
        
        await firebaseRequest('put', key, parts.join(','));
        await interaction.followUp({ content: `Durum değişti: ${yeniDurum.toUpperCase()}`, ephemeral: true });
    }

    if (interaction.customId === 'reset') {
        let resetUsed = parseInt(parts[6]);
        resetUsed++;
        parts[6] = resetUsed;
        
        await firebaseRequest('put', key, parts.join(','));
        await interaction.followUp({ content: `HWID Sıfırlandı!`, ephemeral: true });
    }
}

client.login(process.env.TOKEN);