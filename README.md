# Temp Message - Web Server Nhắn Tin Tạm Thời

Web server cho phép nhắn tin với tính năng tự động xóa tin nhắn theo thời gian (1m, 30m, 1h, 24h). Tin nhắn được lưu trữ trong localStorage của client, không lưu trên server.

## Tính năng

- ✅ Tạo phòng chat với mã phòng và mật khẩu
- ✅ Tham gia phòng bằng mã phòng và mật khẩu
- ✅ Tự động xóa tin nhắn (1 phút, 30 phút, 1 giờ, 24 giờ)
- ✅ Gửi và nhận file (lưu trong sessionStorage của client)
- ✅ Xem trực tiếp hình ảnh và video
- ✅ Tự động nén ảnh trước khi gửi (giảm kích thước)
- ✅ Lưu token và danh sách phòng đã tham gia (localStorage)
- ✅ Reload trang vẫn giữ danh sách phòng, có thể vào lại
- ✅ Quyền chủ phòng: Xem password, Xem QR Code, Xóa phòng
- ✅ QR Code có hiệu lực 2 phút, tự động tạo mới khi hết hạn
- ✅ Giới hạn tối đa 5 phòng mỗi device
- ✅ Lưu thông tin phòng vào MongoDB
- ✅ Random tên người dùng khi vào phòng
- ✅ Random mật khẩu nếu không thiết lập
- ✅ Responsive design
- ✅ Real-time chat với WebSocket
- ✅ Đa ngôn ngữ (Tiếng Việt, English, 中文)

## Cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd Temp_Message
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Khởi động MongoDB với Docker

```bash
docker-compose up -d
```

MongoDB sẽ chạy tại `mongodb://admin:admin123@localhost:27017/temp_message`

### 4. Chạy server

```bash
npm start
```

Hoặc chạy ở chế độ development:

```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:3000`

### 5. Deploy lên VPS (tùy chọn)

```bash
# Setup VPS lần đầu
scp -i ~/.ssh/gcloud_key setup-vps.sh user@vps:~/setup-vps.sh
ssh -i ~/.ssh/gcloud_key user@vps "chmod +x ~/setup-vps.sh && ~/setup-vps.sh"

# Upload files và deploy
scp -i ~/.ssh/gcloud_key -r * user@vps:~/temp-message/
ssh -i ~/.ssh/gcloud_key user@vps "cd ~/temp-message && npm install && docker-compose up -d && pm2 start server.js --name temp-message"
```

## Cấu trúc

- `server.js` - Express server với Socket.IO và MongoDB
- `models/Room.js` - Mongoose schema cho Room
- `docker-compose.yml` - Docker configuration cho MongoDB
- `public/` - Frontend
  - `index.html` - HTML chính
  - `app.js` - Logic frontend
  - `styles.css` - Styling
  - `translations.js` - Đa ngôn ngữ

## API Endpoints

- `POST /api/rooms/create` - Tạo phòng mới (giới hạn 5 phòng/device)
- `POST /api/rooms/join` - Tham gia phòng
- `GET /api/rooms/:roomCode` - Lấy thông tin phòng
- `GET /api/rooms/:roomCode/password` - Xem password (chỉ owner)
- `GET /api/rooms/:roomCode/qr` - Lấy QR code (tự động tạo mới nếu hết hạn)
- `DELETE /api/rooms/:roomCode` - Xóa phòng (chỉ owner)

## WebSocket Events

- `join-room` - Tham gia phòng
- `send-message` - Gửi tin nhắn
- `new-message` - Nhận tin nhắn mới
- `user-joined` - User tham gia
- `user-left` - User rời phòng
- `room-deleted` - Phòng bị xóa

## Database

- **MongoDB**: Lưu thông tin phòng và config
- **localStorage**: Lưu tin nhắn và danh sách phòng của user
- **sessionStorage**: Lưu file data (tạm thời)

## Environment Variables

Tạo file `.env` (optional):

```env
PORT=3000
MONGODB_URI=mongodb://admin:admin123@localhost:27017/temp_message?authSource=admin
NODE_ENV=production
JWT_SECRET=your-secret-key-here
```

- `PORT` - Port của server (mặc định: 3000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key cho JWT (tự động generate nếu không có)

## Lưu ý

- Tin nhắn được lưu trong localStorage của từng client
- File được lưu trong sessionStorage của từng client (không lưu trên server)
- File được chuyển trực tiếp qua WebSocket (base64)
- Ảnh tự động nén xuống tối đa 1920x1080, quality 0.8
- Giới hạn file: 50MB
- Giới hạn phòng: 5 phòng mỗi device
- Token có thời hạn 30 ngày, lưu trong localStorage
- Danh sách phòng đã tham gia được lưu theo token
- Token hết hạn: người đầu tiên vào phòng trống sẽ trở thành chủ phòng
- Phòng tự động xóa sau 24h nếu không có ai truy cập
- File tự động xóa khi message hết hạn
- QR Code có hiệu lực 2 phút
