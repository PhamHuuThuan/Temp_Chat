const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const QRCode = require('qrcode');
const mongoose = require('mongoose');
const Room = require('./models/Room');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 600000 * 1024 * 1024 // 60MB để hỗ trợ file lớn
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/temp_message?authSource=admin';

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.static('public'));

// In-memory storage (chỉ lưu user tokens trong session)
const userTokens = new Map(); // token -> { deviceToken, expiresAt }
const roomTokens = new Map(); // token -> roomCode

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// Helper functions
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generatePassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateRandomName() {
  const adjectives = ['Cool', 'Fast', 'Smart', 'Brave', 'Wise', 'Swift', 'Bold', 'Calm'];
  const nouns = ['Tiger', 'Eagle', 'Wolf', 'Lion', 'Fox', 'Bear', 'Hawk', 'Panther'];
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 1000)}`;
}

function generateToken() {
  return jwt.sign({ id: uuidv4() }, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// API Routes

// Tạo room mới
app.post('/api/rooms/create', async (req, res) => {
  const { deviceToken, autoDelete = '1h', password } = req.body;
  
  if (!deviceToken) {
    return res.status(400).json({ error: 'Device token required' });
  }

  try {
    // Kiểm tra giới hạn 5 phòng
    const roomCount = await Room.countDocuments({ deviceToken });
    if (roomCount >= 5) {
      return res.status(400).json({ error: 'Maximum 5 rooms per device. Please delete a room first.' });
    }

    // Tạo room code unique
    let roomCode;
    let exists = true;
    while (exists) {
      roomCode = generateRoomCode();
      const existingRoom = await Room.findOne({ roomCode });
      exists = !!existingRoom;
    }

    const roomPassword = password || generatePassword();
    const userToken = generateToken();
    
    // Tạo room trong MongoDB
    const room = new Room({
      roomCode,
      ownerToken: userToken,
      password: roomPassword,
      autoDelete: autoDelete,
      deviceToken: deviceToken,
      users: [userToken],
      qrCode: null
    });
    
    await room.save();
    
    // Lưu token vào memory (session only)
    userTokens.set(userToken, { deviceToken, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
    roomTokens.set(userToken, roomCode);
    
    res.json({
      roomCode,
      password: roomPassword,
      token: userToken,
      autoDelete
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Join room
app.post('/api/rooms/join', async (req, res) => {
  const { roomCode, password, deviceToken } = req.body;
  
  if (!roomCode || !password) {
    return res.status(400).json({ error: 'Room code and password required' });
  }
  
  try {
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (room.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Kiểm tra nếu room không có ai và token hết hạn, người đầu tiên vào là chủ phòng
    const userToken = generateToken();
    let isOwner = false;
    
    // Kiểm tra owner token có hợp lệ không
    const ownerTokenInfo = userTokens.get(room.ownerToken);
    const isOwnerTokenExpired = !ownerTokenInfo || ownerTokenInfo.expiresAt < Date.now();
    const isRoomEmpty = !room.users || room.users.length === 0;
    
    if (isRoomEmpty && isOwnerTokenExpired) {
      // Room trống và owner token hết hạn, người đầu tiên vào là chủ phòng
      room.ownerToken = userToken;
      isOwner = true;
    }
    
    // Thêm user vào room
    if (!room.users.includes(userToken)) {
      room.users.push(userToken);
      await room.save();
    }
    
    userTokens.set(userToken, { deviceToken: deviceToken || '', expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
    roomTokens.set(userToken, roomCode);
    
    res.json({
      token: userToken,
      roomCode,
      autoDelete: room.autoDelete,
      isOwner
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Lấy thông tin room
app.get('/api/rooms/:roomCode', async (req, res) => {
  const { roomCode } = req.params;
  const { token } = req.query;
  
  try {
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    let isOwner = false;
    if (token) {
      isOwner = room.ownerToken === token;
    }
    
    res.json({
      roomCode,
      autoDelete: room.autoDelete,
      userCount: room.users ? room.users.length : 0,
      isOwner
    });
  } catch (error) {
    console.error('Error getting room:', error);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// Xem password (chỉ owner)
app.get('/api/rooms/:roomCode/password', async (req, res) => {
  const { roomCode } = req.params;
  const { token } = req.query;
  
  try {
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (!token || room.ownerToken !== token) {
      return res.status(403).json({ error: 'Only room owner can view password' });
    }
    
    res.json({
      password: room.password
    });
  } catch (error) {
    console.error('Error getting password:', error);
    res.status(500).json({ error: 'Failed to get password' });
  }
});

// Lấy QR code (tạo mới nếu hết hạn)
app.get('/api/rooms/:roomCode/qr', async (req, res) => {
  const { roomCode } = req.params;
  
  try {
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const now = Date.now();
    const QR_EXPIRY = 2 * 60 * 1000; // 2 phút
    
    // Kiểm tra QR code có hết hạn không
    if (!room.qrCode || !room.qrCode.expiresAt || new Date(room.qrCode.expiresAt).getTime() < now) {
      // Tạo QR code mới với URL để quét được từ app bên ngoài
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:3000';
      const joinUrl = `${protocol}://${host}/?room=${roomCode}&password=${room.password}`;
      
      try {
        const qrImage = await QRCode.toDataURL(joinUrl, {
          width: 300,
          margin: 2,
          errorCorrectionLevel: 'M'
        });
        
        room.qrCode = {
          data: qrImage,
          expiresAt: new Date(now + QR_EXPIRY),
          url: joinUrl
        };
        await room.save();
      } catch (error) {
        return res.status(500).json({ error: 'Failed to generate QR code' });
      }
    }
    
    const expiresAt = new Date(room.qrCode.expiresAt).getTime();
    res.json({
      qrCode: room.qrCode.data,
      url: room.qrCode.url,
      expiresAt: expiresAt,
      expiresIn: Math.max(0, expiresAt - now)
    });
  } catch (error) {
    console.error('Error getting QR code:', error);
    res.status(500).json({ error: 'Failed to get QR code' });
  }
});

// Xóa phòng (chỉ owner)
app.delete('/api/rooms/:roomCode', async (req, res) => {
  const { roomCode } = req.params;
  const { token } = req.query;
  
  try {
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (!token || room.ownerToken !== token) {
      return res.status(403).json({ error: 'Only room owner can delete room' });
    }
    
    // Xóa tất cả users khỏi room tokens
    if (room.users) {
      room.users.forEach(userToken => {
        roomTokens.delete(userToken);
      });
    }
    
    // Xóa room từ database
    await Room.deleteOne({ roomCode: roomCode.toUpperCase() });
    
    // Thông báo đến tất cả users trong room
    io.to(roomCode).emit('room-deleted', {
      message: 'Room has been deleted by owner'
    });
    
    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-room', async ({ roomCode, token, username }) => {
    try {
      const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Kiểm tra token có trong room không, hoặc là owner token (cho phép rejoin)
      const tokenInfo = userTokens.get(token);
      const isTokenInRoom = room.users && room.users.includes(token);
      const isOwnerToken = room.ownerToken === token;
      const isTokenExpired = tokenInfo && tokenInfo.expiresAt < Date.now();
      
      // Cho phép join nếu:
      // 1. Token có trong room.users
      // 2. Token là owner token (cho phép rejoin owner)
      // 3. Token đã hết hạn nhưng là owner token (room trống, owner vào lại)
      if (!isTokenInRoom && !isOwnerToken && !isTokenExpired) {
        socket.emit('error', { message: 'Invalid token' });
        return;
      }
      
      // Nếu token hợp lệ nhưng chưa có trong users, thêm vào (rejoin)
      if (!isTokenInRoom && (isOwnerToken || isTokenInRoom)) {
        if (!room.users) {
          room.users = [];
        }
        if (!room.users.includes(token)) {
          room.users.push(token);
          await room.save();
        }
      }
      
      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.token = token;
      socket.username = username || generateRandomName();
      
      socket.to(roomCode).emit('user-joined', {
        username: socket.username,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error in join-room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  socket.on('send-message', async ({ message, fileInfo, messageId }) => {
    if (!socket.roomCode) return;
    
    try {
      const room = await Room.findOne({ roomCode: socket.roomCode.toUpperCase() });
      if (!room) return;
      
      const messageData = {
        id: messageId || uuidv4(), // Sử dụng ID từ client hoặc tạo mới
        username: socket.username,
        message,
        fileInfo,
        timestamp: Date.now(),
        autoDelete: room.autoDelete
      };
      
      // Gửi message đến tất cả users trong room (client sẽ lưu vào localStorage)
      io.to(socket.roomCode).emit('new-message', messageData);
    } catch (error) {
      console.error('Error in send-message:', error);
    }
  });
  
  socket.on('disconnect', () => {
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('user-left', {
        username: socket.username,
        timestamp: Date.now()
      });
    }
    console.log('User disconnected:', socket.id);
  });
});

// Cleanup: Xóa rooms không có users sau 24h
setInterval(async () => {
  try {
    const now = Date.now();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    
    // Xóa rooms không có users và tạo hơn 24h trước
    await Room.deleteMany({
      $or: [
        { users: { $size: 0 } },
        { users: { $exists: false } }
      ],
      createdAt: { $lt: oneDayAgo }
    });
  } catch (error) {
    console.error('Error in cleanup:', error);
  }
}, 60 * 60 * 1000); // Check mỗi giờ

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

