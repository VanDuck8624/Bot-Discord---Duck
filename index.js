require('dotenv').config();
const fs = require("fs");
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ]
})

let cụm_từ_trước_đó = '';
let người_dùng_trước_đó = '';
let cụm_từ_đã_dùng = []
let timeout; // Biến lưu trữ timeout
const THOI_GIAN_CHO = 60000; // Thời gian chờ (60 giây)

client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;
    const allowedChannels = ['1356635941174771853', '1356636092127772722'];
    if (!allowedChannels.includes(message.channel.id)) return;

    const nội_dung = message.content.trim().toLowerCase();
    const từ = nội_dung.split(' ');

    if (từ[0] === '!start') {
        try {
            const ids = fs.readFileSync('TuVung.txt', 'utf8').split('\n').filter(line => line.trim() !== '');
            if (ids.length === 0) {
                return await message.reply('Từ điển trống, không thể bắt đầu trò chơi.');
            }

            const từ_ngẫu_nhiên = ids[Math.floor(Math.random() * ids.length)];
            cụm_từ_trước_đó = từ_ngẫu_nhiên;
            người_dùng_trước_đó = '';
            cụm_từ_đã_dùng = [từ_ngẫu_nhiên];

            await message.reply(`Trò chơi bắt đầu! Từ đầu tiên là: \`${từ_ngẫu_nhiên}\``);
        } catch (error) {
            console.error('Lỗi khi đọc file:', error);
            return await message.reply('Đã xảy ra lỗi khi bắt đầu trò chơi.');
        }
    }

    if (từ[0] === '!add') 
    {
        if (từ.length === 3)
        {
            try {
                let ids = fs.readFileSync('TuVung.txt', 'utf8').split('\n');
                const thêm = `${từ[1]} ${từ[2]}`;
                if (!ids.includes(thêm)) {
                    ids.push(thêm);
                    fs.writeFileSync('TuVung.txt', ids.join('\n'));
                    await message.reply(`Đã thêm từ: ${thêm}`);
                } else {
                    return await message.reply(`Từ ${thêm} đã có trong từ điển`);
                }
            } catch (error) {
                console.error('Lỗi khi đọc hoặc ghi file:', error);
                return await message.reply('Đã xảy ra lỗi khi xử lý từ điển.');
            }
        }
    } 

    if (message.content.toLowerCase() === '!reset') {
        if (process.env.GIOI_HAN_RESET && !process.env.NGUOI_CO_THE_RESET.split(", ").includes(message.author.id)) {
            return message.reply("Chỉ có Author mới có thể reset");
        }

        // Đặt lại trạng thái trò chơi
        cụm_từ_trước_đó = '';
        người_dùng_trước_đó = '';
        cụm_từ_đã_dùng = [];
        await message.reply('Đã đặt lại trò chơi.');

        // Tự động khởi động lại trò chơi
        try {
            const ids = fs.readFileSync('TuVung.txt', 'utf8').split('\n').filter(line => line.trim() !== '');
            if (ids.length === 0) {
                return await message.channel.send('Từ điển trống, không thể khởi động lại trò chơi.');
            }

            const từ_ngẫu_nhiên = ids[Math.floor(Math.random() * ids.length)];
            cụm_từ_trước_đó = từ_ngẫu_nhiên;
            cụm_từ_đã_dùng = [từ_ngẫu_nhiên];

            await message.channel.send(`Trò chơi mới bắt đầu! Từ đầu tiên là: \`${từ_ngẫu_nhiên}\``);
        } catch (error) {
            console.error('Lỗi khi đọc file:', error);
            await message.channel.send('Đã xảy ra lỗi khi khởi động lại trò chơi.');
        }
    }

    if (từ.length !== 2) return;

    const cụm_từ = `${từ[0]} ${từ[1]}`;

    if (cụm_từ_đã_dùng.includes(cụm_từ))
    {
        await message.react('❌');
        return message.reply(`Cụm Từ \`${cụm_từ}\` Đã Được Sử Dụng.`);
    }

    if (cụm_từ_đã_dùng.length >= parseInt(process.env.MAX_WORD, 10))
    {
        cụm_từ_trước_đó = '';
        người_dùng_trước_đó = '';
        cụm_từ_đã_dùng = [];

        await message.react('❌');
        return message.reply('Giới Hạn Từ Đã Đạt Đến Mức Tối Đa Và Dữ Liệu Đã Được Đặt Lại.');
        
    }

    if (!cụm_từ_trước_đó) return xử_lý_cụm_từ_đầu_tiên(message, cụm_từ);
    else return xử_lý_cụm_từ_tiếp_theo(message, cụm_từ, từ);
});

const kiểm_tra_từ_tồn_tại = require('./kiểm_tra_từ_tồn_tại.js');

async function xử_lý_cụm_từ_đầu_tiên(message, cụm_từ) 
{
    if (!kiểm_tra_từ_tồn_tại(cụm_từ)) 
    {
        await message.react('❌');
        return message.reply(`Cụm Từ \`${cụm_từ}\` Không Tồn Tại Trong Từ Điển Của Bot!`);
    }

    await message.react('✅');
    cụm_từ_trước_đó = cụm_từ;
    người_dùng_trước_đó = message.author.id;
    cụm_từ_đã_dùng.push(cụm_từ);

    // Đặt lại bộ đếm thời gian
    đặt_lại_timeout(message);
}

async function xử_lý_cụm_từ_tiếp_theo(message, cụm_từ, từ) 
{
    if (message.author.id === người_dùng_trước_đó) 
    {
        await message.react('❌');
        return message.reply('Bạn Chỉ Được Nói Một Lần Mỗi Lượt.');
    }

    const từ_thứ_hai_trước_đó = cụm_từ_trước_đó.split(' ')[1];

    if (từ[0] !== từ_thứ_hai_trước_đó) 
    {
        await message.react('❌');
        return message.reply(`Từ Của Bạn Phải Nối Tiếp Từ \`${từ_thứ_hai_trước_đó}\``);
    }

    if (!kiểm_tra_từ_tồn_tại(cụm_từ)) 
    {
        await message.react('❌');
        return message.reply(`Cụm Từ \`${cụm_từ}\` Không Hợp Lệ!`);
    }

    await message.react('✅');
    cụm_từ_trước_đó = cụm_từ;
    người_dùng_trước_đó = message.author.id;
    cụm_từ_đã_dùng.push(cụm_từ);

    // Đặt lại bộ đếm thời gian
    đặt_lại_timeout(message);
}

function đặt_lại_timeout(message) {
    if (timeout) clearTimeout(timeout); // Xóa timeout cũ nếu có

    timeout = setTimeout(async () => {
        if (người_dùng_trước_đó) {
            // Thông báo người chiến thắng
            await message.channel.send(`⏰ Không có ai trả lời trong thời gian dài. Người chiến thắng là <@${người_dùng_trước_đó}>! 🎉`);
        } else {
            // Không có ai tham gia
            await message.channel.send('⏰ Không có ai tham gia trò chơi. Trò chơi kết thúc.');
        }

        // Đặt lại trạng thái trò chơi
        cụm_từ_trước_đó = '';
        người_dùng_trước_đó = '';
        cụm_từ_đã_dùng = [];

        // Tự động khởi động lại trò chơi
        try {
            const ids = fs.readFileSync('TuVung.txt', 'utf8').split('\n').filter(line => line.trim() !== '');
            if (ids.length === 0) {
                return await message.channel.send('Từ điển trống, không thể khởi động lại trò chơi.');
            }

            const từ_ngẫu_nhiên = ids[Math.floor(Math.random() * ids.length)];
            cụm_từ_trước_đó = từ_ngẫu_nhiên;
            cụm_từ_đã_dùng = [từ_ngẫu_nhiên];

            await message.channel.send(`Trò chơi mới bắt đầu! Từ đầu tiên là: \`${từ_ngẫu_nhiên}\``);
        } catch (error) {
            console.error('Lỗi khi đọc file:', error);
            await message.channel.send('Đã xảy ra lỗi khi khởi động lại trò chơi.');
        }
    }, THOI_GIAN_CHO);
}

client.on('ready', () => {
    console.log(`${client.user.tag} đã hoạt động`);
    console.log('Token:', process.env.TOKEN);
});
client.login(process.env.TOKEN);