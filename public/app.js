// State management
let state = {
    currentView: 'setup', // 'setup' | 'create' | 'join' | 'chat'
    roomCode: null,
    token: null,
    username: null,
    autoDelete: '1h',
    socket: null,
    deviceToken: null,
    isOwner: false,
    qrCode: null,
    qrExpiresAt: null
};

// Initialize device token
function getDeviceToken() {
    let deviceToken = localStorage.getItem('deviceToken');
    if (!deviceToken) {
        deviceToken = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('deviceToken', deviceToken);
    }
    return deviceToken;
}

// Initialize
state.deviceToken = getDeviceToken();

// Save user room info to localStorage
function saveUserRoom(token, roomCode, roomInfo) {
    const key = 'userRooms';
    const userRooms = JSON.parse(localStorage.getItem(key) || '{}');
    if (!userRooms[token]) {
        userRooms[token] = [];
    }
    // Kiểm tra xem room đã tồn tại chưa
    const existingIndex = userRooms[token].findIndex(r => r.roomCode === roomCode);
    if (existingIndex >= 0) {
        userRooms[token][existingIndex] = { ...userRooms[token][existingIndex], ...roomInfo };
    } else {
        userRooms[token].push({ roomCode, ...roomInfo, joinedAt: Date.now() });
    }
    localStorage.setItem(key, JSON.stringify(userRooms));
}

// Load user rooms from localStorage
function loadUserRooms(token) {
    const key = 'userRooms';
    const userRooms = JSON.parse(localStorage.getItem(key) || '{}');
    return userRooms[token] || [];
}

// Get all user tokens
function getAllUserTokens() {
    const key = 'userRooms';
    const userRooms = JSON.parse(localStorage.getItem(key) || '{}');
    return Object.keys(userRooms);
}

// Generate UUID
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Auto-delete time in milliseconds
const AUTO_DELETE_TIMES = {
    '1m': 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000
};

// Load messages from localStorage
function loadMessages(roomCode) {
    const key = `messages_${roomCode}`;
    const messages = JSON.parse(localStorage.getItem(key) || '[]');
    return messages.filter(msg => {
        const now = Date.now();
        const deleteTime = AUTO_DELETE_TIMES[msg.autoDelete] || AUTO_DELETE_TIMES['1h'];
        return (now - msg.timestamp) < deleteTime;
    });
}

// Save file data to sessionStorage
function saveFileData(fileId, fileData) {
    sessionStorage.setItem(`file_${fileId}`, fileData);
}

// Get file data from sessionStorage
function getFileData(fileId) {
    return sessionStorage.getItem(`file_${fileId}`);
}

// Delete file data from sessionStorage
function deleteFileData(fileId) {
    sessionStorage.removeItem(`file_${fileId}`);
}

// Save message to localStorage
function saveMessage(roomCode, message) {
    const key = `messages_${roomCode}`;
    const messages = loadMessages(roomCode);
    messages.push(message);
    localStorage.setItem(key, JSON.stringify(messages));
    
    // Lưu file data vào sessionStorage nếu có
    if (message.fileInfo && message.fileInfo.fileData) {
        saveFileData(message.id, message.fileInfo.fileData);
    }
}

// Delete expired messages
function cleanupMessages(roomCode) {
    const key = `messages_${roomCode}`;
    const oldMessages = JSON.parse(localStorage.getItem(key) || '[]');
    const messages = loadMessages(roomCode);
    
    // Xóa file data của các message đã hết hạn
    const oldMessageIds = oldMessages.map(m => m.id);
    const currentMessageIds = messages.map(m => m.id);
    oldMessageIds.forEach(msgId => {
        if (!currentMessageIds.includes(msgId)) {
            deleteFileData(msgId);
        }
    });
    
    localStorage.setItem(key, JSON.stringify(messages));
}

// Compress image
function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            // Không phải ảnh, trả về file gốc
            fileToBase64(file).then(resolve).catch(reject);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Tính toán kích thước mới
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = width * ratio;
                    height = height * ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to base64
                const base64 = canvas.toDataURL(file.type, quality).split(',')[1];
                resolve(base64);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Generate random username
function generateRandomName() {
    const adjectives = ['Cool', 'Fast', 'Smart', 'Brave', 'Wise', 'Swift', 'Bold', 'Calm'];
    const nouns = ['Tiger', 'Eagle', 'Wolf', 'Lion', 'Fox', 'Bear', 'Hawk', 'Panther'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 1000)}`;
}

// Render functions
function render() {
    const root = document.getElementById('root');
    
    if (state.currentView === 'setup') {
        // Load danh sách phòng đã tham gia
        const allTokens = getAllUserTokens();
        let roomsList = [];
        allTokens.forEach(token => {
            const userRooms = loadUserRooms(token);
            userRooms.forEach(room => {
                roomsList.push({ ...room, token });
            });
        });
        const lang = getCurrentLanguage();
        
        root.innerHTML = `
            <div class="container">
                <div class="header">
                    <div class="header-top">
                        <div>
                            <h1>${t('app.title', lang)}</h1>
                            <p>${t('app.subtitle', lang)}</p>
                        </div>
                        <div class="language-selector">
                            <select id="languageSelect" onchange="changeLanguage(this.value)">
                                <option value="vi" ${lang === 'vi' ? 'selected' : ''}>${t('lang.vi', lang)}</option>
                                <option value="en" ${lang === 'en' ? 'selected' : ''}>${t('lang.en', lang)}</option>
                                <option value="zh" ${lang === 'zh' ? 'selected' : ''}>${t('lang.zh', lang)}</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="main-content">
                    <div class="room-setup">
                        <h2>${t('setup.title', lang)}</h2>
                        <button class="btn btn-primary" onclick="showCreateRoom()">${t('common.create', lang)}</button>
                        <button class="btn btn-secondary" onclick="showJoinRoom()">${t('common.join', lang)}</button>
                        
                        ${roomsList.length > 0 ? `
                            <div style="margin-top: 30px;">
                                <h3 style="margin-bottom: 15px; color: #333;">${t('setup.roomsList', lang)}</h3>
                                <div class="rooms-list">
                                    ${roomsList.map(room => `
                                        <div class="room-item" onclick="rejoinRoom('${room.roomCode}', '${room.token}')">
                                            <div class="room-item-header">
                                                <strong>${room.roomCode}</strong>
                                                ${room.isOwner ? `<span class="owner-badge">${t('common.owner', lang)}</span>` : ''}
                                            </div>
                                            <div class="room-item-info">
                                                <span>${t('common.autoDelete', lang)}: ${getAutoDeleteLabel(room.autoDelete || '1h')}</span>
                                                <span>${t('common.joinedAt', lang)}: ${new Date(room.joinedAt).toLocaleString(lang === 'vi' ? 'vi-VN' : lang === 'zh' ? 'zh-CN' : 'en-US')}</span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    } else if (state.currentView === 'create') {
        const lang = getCurrentLanguage();
        root.innerHTML = `
            <div class="container">
                <div class="header">
                    <div class="header-top">
                        <div>
                            <h1>${t('create.title', lang)}</h1>
                        </div>
                        <div class="language-selector">
                            <select id="languageSelect" onchange="changeLanguage(this.value)">
                                <option value="vi" ${lang === 'vi' ? 'selected' : ''}>${t('lang.vi', lang)}</option>
                                <option value="en" ${lang === 'en' ? 'selected' : ''}>${t('lang.en', lang)}</option>
                                <option value="zh" ${lang === 'zh' ? 'selected' : ''}>${t('lang.zh', lang)}</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="main-content">
                    <div class="room-setup">
                        <div class="form-group">
                            <label>${t('create.autoDeleteLabel', lang)}</label>
                            <select id="autoDelete">
                                <option value="1m">${t('time.1m', lang)}</option>
                                <option value="30m" selected>${t('time.30m', lang)}</option>
                                <option value="1h">${t('time.1h', lang)}</option>
                                <option value="24h">${t('time.24h', lang)}</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>${t('create.passwordLabel', lang)}</label>
                            <input type="text" id="password" placeholder="${t('create.passwordPlaceholder', lang)}" maxlength="6" pattern="[0-9]*">
                        </div>
                        <button class="btn btn-primary" onclick="createRoom()">${t('create.button', lang)}</button>
                        <button class="btn btn-secondary" onclick="backToSetup()">${t('common.back', lang)}</button>
                    </div>
                </div>
            </div>
        `;
    } else if (state.currentView === 'join') {
        const lang = getCurrentLanguage();
        root.innerHTML = `
            <div class="container">
                <div class="header">
                    <div class="header-top">
                        <div>
                            <h1>${t('join.title', lang)}</h1>
                        </div>
                        <div class="language-selector">
                            <select id="languageSelect" onchange="changeLanguage(this.value)">
                                <option value="vi" ${lang === 'vi' ? 'selected' : ''}>${t('lang.vi', lang)}</option>
                                <option value="en" ${lang === 'en' ? 'selected' : ''}>${t('lang.en', lang)}</option>
                                <option value="zh" ${lang === 'zh' ? 'selected' : ''}>${t('lang.zh', lang)}</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="main-content">
                    <div class="room-setup">
                        <div class="form-group">
                            <label>${t('join.roomCodeLabel', lang)}</label>
                            <input type="text" id="roomCode" placeholder="${t('join.roomCodePlaceholder', lang)}" style="text-transform: uppercase;">
                        </div>
                        <div class="form-group">
                            <label>${t('join.passwordLabel', lang)}</label>
                            <input type="text" id="joinPassword" placeholder="${t('join.passwordPlaceholder', lang)}" maxlength="6" pattern="[0-9]*">
                        </div>
                        <button class="btn btn-primary" onclick="joinRoom()">${t('join.button', lang)}</button>
                        <button class="btn btn-secondary" onclick="backToSetup()">${t('common.back', lang)}</button>
                    </div>
                </div>
            </div>
        `;
    } else if (state.currentView === 'chat') {
        const messages = loadMessages(state.roomCode);
        cleanupMessages(state.roomCode);
        const lang = getCurrentLanguage();
        
        root.innerHTML = `
            <div class="container">
                <div class="header">
                    <div class="header-top">
                        <div>
                            <h1>${t('chat.title', lang)} ${state.roomCode}</h1>
                            <p>${t('chat.autoDeleteAfter', lang)} ${getAutoDeleteLabel(state.autoDelete)}</p>
                        </div>
                        <div class="language-selector">
                            <select id="languageSelect" onchange="changeLanguage(this.value)">
                                <option value="vi" ${lang === 'vi' ? 'selected' : ''}>${t('lang.vi', lang)}</option>
                                <option value="en" ${lang === 'en' ? 'selected' : ''}>${t('lang.en', lang)}</option>
                                <option value="zh" ${lang === 'zh' ? 'selected' : ''}>${t('lang.zh', lang)}</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="main-content">
                    <div class="chat-container">
                        <div class="chat-header">
                            <div class="chat-header-left">
                                <h3>${state.username}</h3>
                                ${state.isOwner ? `<span class="owner-badge">${t('common.owner', lang)}</span>` : ''}
                            </div>
                            <div class="chat-header-right">
                                ${state.isOwner ? `
                                    <button class="btn btn-owner" onclick="viewPassword()" title="${t('common.viewPassword', lang)}">
                                        🔑 ${t('common.viewPassword', lang)}
                                    </button>
                                    <button class="btn btn-owner" onclick="viewQR()" title="${t('common.viewQR', lang)}">
                                        📱 ${t('common.viewQR', lang)}
                                    </button>
                                    <button class="btn btn-danger" onclick="deleteRoom()" title="${t('common.deleteRoom', lang)}">
                                        🗑️ ${t('common.deleteRoom', lang)}
                                    </button>
                                ` : ''}
                                <button class="leave-btn" onclick="leaveRoom()">${t('common.leave', lang)}</button>
                            </div>
                        </div>
                        ${state.qrCode ? `
                            <div class="qr-display" id="qrDisplay">
                                <div class="qr-header">
                                    <h4>${t('common.viewQR', lang)}</h4>
                                    <button class="qr-close" onclick="closeQR()">×</button>
                                </div>
                                <div class="qr-content">
                                    <img src="${state.qrCode}" alt="QR Code" class="qr-image">
                                    <p class="qr-expires" id="qrExpires">${t('common.qrExpiresIn', lang)} <span id="qrCountdown"></span></p>
                                </div>
                            </div>
                        ` : ''}
                        <div class="messages" id="messages">
                            ${messages.map(msg => renderMessage(msg)).join('')}
                        </div>
                        <div class="chat-input-area">
                            <div id="status"></div>
                            <div class="input-group">
                                <input type="text" id="messageInput" placeholder="${t('chat.messagePlaceholder', lang)}" onkeypress="handleKeyPress(event)">
                                <div class="file-input-wrapper">
                                    <input type="file" id="fileInput" onchange="handleFileSelect(event)">
                                    <label for="fileInput" class="file-input-label">${t('common.file', lang)}</label>
                                </div>
                                <button class="btn btn-primary" onclick="sendMessage()">${t('common.send', lang)}</button>
                            </div>
                            <div id="fileInfo"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Scroll to bottom
        setTimeout(() => {
            const messagesDiv = document.getElementById('messages');
            if (messagesDiv) {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        }, 100);
        
        // Setup file input
        setupFileInput();
    }
}

function renderMessage(msg) {
    const date = new Date(msg.timestamp);
    const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    let fileContent = '';
    if (msg.fileInfo) {
        // Lấy file data từ sessionStorage
        const fileData = getFileData(msg.id);
        
        if (fileData) {
            const dataUrl = `data:${msg.fileInfo.mimetype};base64,${fileData}`;
            
            if (msg.fileInfo.mimetype && msg.fileInfo.mimetype.startsWith('image/')) {
                fileContent = `<div class="message-file"><img src="${dataUrl}" alt="${msg.fileInfo.originalName}"></div>`;
            } else if (msg.fileInfo.mimetype && msg.fileInfo.mimetype.startsWith('video/')) {
                fileContent = `<div class="message-file"><video controls><source src="${dataUrl}" type="${msg.fileInfo.mimetype}"></video></div>`;
            } else {
                // Tạo download link từ data URL
                fileContent = `<div class="message-file"><a href="${dataUrl}" class="file-link" download="${msg.fileInfo.originalName}">📎 ${msg.fileInfo.originalName} (${formatFileSize(msg.fileInfo.size)})</a></div>`;
            }
        } else {
            // File data đã bị mất (có thể do refresh trang - sessionStorage bị xóa)
            const lang = getCurrentLanguage();
            fileContent = `<div class="message-file"><div class="file-info">📎 ${msg.fileInfo.originalName} (${formatFileSize(msg.fileInfo.size)}) - ${t('chat.fileExpired', lang)}</div></div>`;
        }
    }
    
    return `
        <div class="message" data-id="${msg.id}">
            <div class="message-header">
                <span class="message-username">${msg.username}</span>
                <span class="message-time">${timeStr}</span>
            </div>
            <div class="message-content">
                ${msg.message ? `<div>${escapeHtml(msg.message)}</div>` : ''}
                ${fileContent}
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getAutoDeleteLabel(value) {
    return t(`time.${value}`, getCurrentLanguage()) || value;
}

// Copy to clipboard function
window.copyToClipboard = function(text, elementId) {
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById(elementId);
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = t('common.copied', getCurrentLanguage());
            btn.style.background = '#28a745';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Change language
window.changeLanguage = function(lang) {
    setLanguage(lang);
    render();
}

// Show room info modal with copy buttons
function showRoomInfoModal(roomCode, password, lang) {
    const modal = document.createElement('div');
    modal.className = 'room-info-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeRoomInfoModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2>${t('create.success', lang)}</h2>
                <button class="modal-close" onclick="closeRoomInfoModal()">×</button>
            </div>
            <div class="modal-body">
                <p class="modal-description">${t('create.shareInfo', lang)}</p>
                <div class="room-info-box">
                    <div class="info-row">
                        <label>${t('create.roomCodeLabel', lang)}</label>
                        <div class="info-value-box">
                            <span class="info-value" id="roomCodeValue">${roomCode}</span>
                            <button class="copy-btn" id="copyRoomCode" onclick="copyToClipboard('${roomCode}', 'copyRoomCode')">
                                ${t('common.copy', lang)}
                            </button>
                        </div>
                    </div>
                    <div class="info-row">
                        <label>${t('create.passwordLabel2', lang)}</label>
                        <div class="info-value-box">
                            <span class="info-value" id="passwordValue">${password}</span>
                            <button class="copy-btn" id="copyPassword" onclick="copyToClipboard('${password}', 'copyPassword')">
                                ${t('common.copy', lang)}
                            </button>
                        </div>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="closeRoomInfoModalAndJoin()" style="width: 100%; margin-top: 20px;">
                    ${t('common.join', lang)}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    state.pendingRoomCode = roomCode;
    state.pendingPassword = password;
}

window.closeRoomInfoModal = function() {
    const modal = document.querySelector('.room-info-modal');
    if (modal) {
        modal.remove();
    }
}

window.closeRoomInfoModalAndJoin = function() {
    closeRoomInfoModal();
    // connectToRoom sẽ được gọi tự động vì state đã được set trong createRoom
    setTimeout(() => {
        connectToRoom();
    }, 100);
}

// Navigation functions
window.showCreateRoom = function() {
    state.currentView = 'create';
    render();
};

window.showJoinRoom = function() {
    state.currentView = 'join';
    render();
};

window.backToSetup = function() {
    state.currentView = 'setup';
    render();
};

// Rejoin room from saved list
window.rejoinRoom = async function(roomCode, token) {
    // Kiểm tra token còn hợp lệ không
    try {
        const response = await fetch(`/api/rooms/${roomCode}?token=${encodeURIComponent(token)}`);
        const roomData = await response.json();
        
        if (response.ok) {
            state.roomCode = roomCode;
            state.token = token;
            state.autoDelete = roomData.autoDelete;
            state.username = generateRandomName();
            state.isOwner = roomData.isOwner || false;
            
            // Cập nhật thông tin phòng
            const userRooms = loadUserRooms(token);
            const roomInfo = userRooms.find(r => r.roomCode === roomCode);
            if (roomInfo) {
                saveUserRoom(token, roomCode, {
                    ...roomInfo,
                    autoDelete: roomData.autoDelete,
                    isOwner: roomData.isOwner || false
                });
            }
            
            connectToRoom();
        } else {
            const lang = getCurrentLanguage();
            showStatus(t('chat.roomNotFound', lang), 'error');
            // Xóa phòng khỏi danh sách
            const key = 'userRooms';
            const userRooms = JSON.parse(localStorage.getItem(key) || '{}');
            if (userRooms[token]) {
                userRooms[token] = userRooms[token].filter(r => r.roomCode !== roomCode);
                localStorage.setItem(key, JSON.stringify(userRooms));
            }
            render();
        }
    } catch (error) {
        const lang = getCurrentLanguage();
        showStatus(t('chat.connectionError', lang), 'error');
    }
};

// Room functions
window.createRoom = async function() {
    const autoDelete = document.getElementById('autoDelete').value;
    const password = document.getElementById('password').value;
    
    const lang = getCurrentLanguage();
    if (password && (!/^\d{6}$/.test(password))) {
        showStatus(t('chat.invalidPassword', lang), 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/rooms/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deviceToken: state.deviceToken,
                autoDelete: autoDelete,
                password: password || undefined
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            state.roomCode = data.roomCode;
            state.token = data.token;
            state.autoDelete = data.autoDelete;
            state.username = generateRandomName();
            state.isOwner = true; // Người tạo phòng là owner
            
            // Lưu token và room info vào localStorage
            saveUserRoom(data.token, data.roomCode, {
                autoDelete: data.autoDelete,
                password: data.password,
                isOwner: true
            });
            
            const lang = getCurrentLanguage();
            // Hiển thị modal với thông tin phòng
            showRoomInfoModal(data.roomCode, data.password, lang);
        } else {
            const lang = getCurrentLanguage();
            showStatus(data.error || t('chat.createError', lang), 'error');
        }
    } catch (error) {
        const lang = getCurrentLanguage();
        showStatus(t('chat.connectionError', lang), 'error');
    }
};

window.joinRoom = async function() {
    const roomCode = document.getElementById('roomCode').value.toUpperCase();
    const password = document.getElementById('joinPassword').value;
    
    const lang = getCurrentLanguage();
    if (!roomCode || !password) {
        showStatus(t('chat.requiredFields', lang), 'error');
        return;
    }
    
    if (!/^\d{6}$/.test(password)) {
        showStatus(t('chat.invalidPassword', lang), 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/rooms/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomCode: roomCode,
                password: password,
                deviceToken: state.deviceToken
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            state.roomCode = roomCode;
            state.token = data.token;
            state.autoDelete = data.autoDelete;
            state.username = generateRandomName();
            state.isOwner = data.isOwner || false;
            
            // Lưu token và room info vào localStorage
            saveUserRoom(data.token, roomCode, {
                autoDelete: data.autoDelete,
                isOwner: data.isOwner || false
            });
            
            connectToRoom();
        } else {
            const lang = getCurrentLanguage();
            showStatus(data.error || t('chat.joinError', lang), 'error');
        }
    } catch (error) {
        const lang = getCurrentLanguage();
        showStatus(t('chat.connectionError', lang), 'error');
    }
};

function connectToRoom() {
    // Connect to socket
    state.socket = io();
    
    state.socket.on('connect', () => {
        state.socket.emit('join-room', {
            roomCode: state.roomCode,
            token: state.token,
            username: state.username
        });
        
        state.currentView = 'chat';
        render();
    });
    
    state.socket.on('new-message', (messageData) => {
        // Lưu file data vào sessionStorage nếu có
        if (messageData.fileInfo && messageData.fileInfo.fileData) {
            saveFileData(messageData.id, messageData.fileInfo.fileData);
            // Không lưu fileData trong localStorage, chỉ lưu metadata
            const messageToSave = {
                ...messageData,
                fileInfo: {
                    originalName: messageData.fileInfo.originalName,
                    size: messageData.fileInfo.size,
                    mimetype: messageData.fileInfo.mimetype
                }
            };
            saveMessage(state.roomCode, messageToSave);
        } else {
            saveMessage(state.roomCode, messageData);
        }
        
        const messagesDiv = document.getElementById('messages');
        if (messagesDiv) {
            messagesDiv.innerHTML += renderMessage(messageData);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        // Auto delete after time
        setTimeout(() => {
            const msgElement = document.querySelector(`[data-id="${messageData.id}"]`);
            if (msgElement) {
                msgElement.remove();
            }
            // Xóa file data khi message hết hạn
            deleteFileData(messageData.id);
            cleanupMessages(state.roomCode);
        }, AUTO_DELETE_TIMES[messageData.autoDelete] || AUTO_DELETE_TIMES['1h']);
    });
    
    state.socket.on('user-joined', (data) => {
        const lang = getCurrentLanguage();
        showStatus(`${data.username} ${t('chat.userJoined', lang)}`, 'info');
    });
    
    state.socket.on('user-left', (data) => {
        const lang = getCurrentLanguage();
        showStatus(`${data.username} ${t('chat.userLeft', lang)}`, 'info');
    });
    
    state.socket.on('error', (data) => {
        const lang = getCurrentLanguage();
        showStatus(data.message || t('chat.connectionError', lang), 'error');
    });
    
    state.socket.on('room-deleted', (data) => {
        const lang = getCurrentLanguage();
        showStatus(t('chat.roomDeleted', lang), 'error');
        setTimeout(() => {
            leaveRoom();
        }, 2000);
    });
    
    // Load QR code khi vào phòng
    if (state.isOwner) {
        loadQRCode();
    }
}

// Owner functions
window.viewPassword = async function() {
    if (!state.isOwner) return;
    
    try {
        const response = await fetch(`/api/rooms/${state.roomCode}/password?token=${encodeURIComponent(state.token)}`);
        const data = await response.json();
        
        if (response.ok) {
            const lang = getCurrentLanguage();
            // Hiển thị password trong modal
            showPasswordModal(data.password, lang);
        } else {
            const lang = getCurrentLanguage();
            showStatus(data.error || t('chat.viewPasswordError', lang), 'error');
        }
    } catch (error) {
        const lang = getCurrentLanguage();
        showStatus(t('chat.viewPasswordError', lang), 'error');
    }
};

window.viewQR = async function() {
    if (!state.isOwner) return;
    
    try {
        const response = await fetch(`/api/rooms/${state.roomCode}/qr`);
        const data = await response.json();
        
        if (response.ok) {
            state.qrCode = data.qrCode;
            state.qrExpiresAt = data.expiresAt;
            render();
            startQRCountdown();
        } else {
            const lang = getCurrentLanguage();
            showStatus(data.error || t('chat.viewQRError', lang), 'error');
        }
    } catch (error) {
        const lang = getCurrentLanguage();
        showStatus(t('chat.viewQRError', lang), 'error');
    }
};

window.closeQR = function() {
    state.qrCode = null;
    state.qrExpiresAt = null;
    render();
};

window.deleteRoom = async function() {
    if (!state.isOwner) return;
    
    const lang = getCurrentLanguage();
    if (!confirm(t('common.confirmDelete', lang))) {
        return;
    }
    
    try {
        const response = await fetch(`/api/rooms/${state.roomCode}?token=${encodeURIComponent(state.token)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showStatus(t('chat.deleteRoomSuccess', lang), 'success');
            setTimeout(() => {
                leaveRoom();
            }, 1500);
        } else {
            showStatus(data.error || t('chat.deleteRoomError', lang), 'error');
        }
    } catch (error) {
        showStatus(t('chat.deleteRoomError', lang), 'error');
    }
};

// Load QR code
async function loadQRCode() {
    try {
        const response = await fetch(`/api/rooms/${state.roomCode}/qr`);
        const data = await response.json();
        
        if (response.ok) {
            state.qrCode = data.qrCode;
            state.qrExpiresAt = data.expiresAt;
            render();
            startQRCountdown();
        }
    } catch (error) {
        // Ignore error, QR will be generated when owner clicks view
    }
}

// Start QR countdown timer
function startQRCountdown() {
    if (!state.qrExpiresAt) return;
    
    const updateCountdown = () => {
        const now = Date.now();
        const remaining = Math.max(0, state.qrExpiresAt - now);
        const seconds = Math.floor(remaining / 1000);
        
        const countdownEl = document.getElementById('qrCountdown');
        if (countdownEl) {
            const lang = getCurrentLanguage();
            countdownEl.textContent = `${seconds} ${t('common.seconds', lang)}`;
        }
        
        if (remaining <= 0) {
            // QR code hết hạn, tự động đóng
            closeQR();
        } else {
            setTimeout(updateCountdown, 1000);
        }
    };
    
    updateCountdown();
}

// Show password modal
function showPasswordModal(password, lang) {
    const modal = document.createElement('div');
    modal.className = 'room-info-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closePasswordModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2>${t('common.viewPassword', lang)}</h2>
                <button class="modal-close" onclick="closePasswordModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="room-info-box">
                    <div class="info-row">
                        <label>${t('common.password', lang)}</label>
                        <div class="info-value-box">
                            <span class="info-value" id="passwordValueModal">${password}</span>
                            <button class="copy-btn" id="copyPasswordModal" onclick="copyToClipboard('${password}', 'copyPasswordModal')">
                                ${t('common.copy', lang)}
                            </button>
                        </div>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="closePasswordModal()" style="width: 100%; margin-top: 20px;">
                    ${t('common.back', lang)}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.closePasswordModal = function() {
    const modal = document.querySelector('.room-info-modal');
    if (modal && modal.querySelector('#passwordValueModal')) {
        modal.remove();
    }
}

window.leaveRoom = function() {
    if (state.socket) {
        state.socket.disconnect();
    }
    state.currentView = 'setup';
    state.roomCode = null;
    state.token = null;
    state.socket = null;
    render();
};

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data URL prefix (data:image/png;base64,)
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Message functions
window.sendMessage = async function() {
    const input = document.getElementById('messageInput');
    const fileInput = document.getElementById('fileInput');
    const message = input.value.trim();
    const file = fileInput.files[0];
    
    if (!message && !file) return;
    
    let fileInfo = null;
    const messageId = uuidv4(); // Tạo ID cho message
    
    if (file) {
        try {
            const lang = getCurrentLanguage();
            // Kiểm tra kích thước file (giới hạn 50MB để tránh vấn đề với WebSocket)
            if (file.size > 50 * 1024 * 1024) {
                showStatus(t('chat.fileTooLarge', lang), 'error');
                return;
            }
            
            showStatus(t('chat.processingFile', lang), 'info');
            
            // Nén ảnh nếu là file ảnh, file khác thì đọc bình thường
            let fileData;
            let finalSize = file.size;
            
            if (file.type && file.type.startsWith('image/')) {
                // Nén ảnh: max 1920x1080, quality 0.8
                fileData = await compressImage(file, 1920, 1080, 0.8);
                // Tính lại kích thước sau khi nén (xấp xỉ)
                finalSize = Math.round((fileData.length * 3) / 4);
            } else {
                // File khác, đọc bình thường
                fileData = await fileToBase64(file);
            }
            
            fileInfo = {
                originalName: file.name,
                size: finalSize, // Kích thước sau khi nén (nếu có)
                originalSize: file.size, // Kích thước gốc
                mimetype: file.type || 'application/octet-stream',
                fileData: fileData // Gửi file data qua WebSocket
            };
            
            // Lưu file vào sessionStorage ngay lập tức (cho message của chính mình)
            saveFileData(messageId, fileData);
            
        } catch (error) {
            const lang = getCurrentLanguage();
            showStatus(t('chat.fileError', lang), 'error');
            return;
        }
    }
    
    if (state.socket) {
        // Tạo message với ID để lưu file
        const messageData = {
            id: messageId,
            username: state.username,
            message: message,
            fileInfo: fileInfo,
            timestamp: Date.now(),
            autoDelete: state.autoDelete
        };
        
        // Gửi qua WebSocket với messageId
        state.socket.emit('send-message', {
            message: message,
            messageId: messageId,
            fileInfo: fileInfo ? {
                originalName: fileInfo.originalName,
                size: fileInfo.size,
                mimetype: fileInfo.mimetype,
                fileData: fileInfo.fileData
            } : null
        });
        
        // Lưu message vào localStorage (với file data đã lưu trong sessionStorage)
        if (fileInfo) {
            // Không lưu fileData trong localStorage, chỉ lưu metadata
            const messageToSave = {
                ...messageData,
                fileInfo: {
                    originalName: fileInfo.originalName,
                    size: fileInfo.size,
                    mimetype: fileInfo.mimetype
                }
            };
            saveMessage(state.roomCode, messageToSave);
        } else {
            // Lưu message không có file
            saveMessage(state.roomCode, messageData);
        }
        
        input.value = '';
        fileInput.value = '';
        document.getElementById('fileInfo').innerHTML = '';
        
        // Re-render để hiển thị message mới
        if (state.currentView === 'chat') {
            const messages = loadMessages(state.roomCode);
            const messagesDiv = document.getElementById('messages');
            if (messagesDiv) {
                messagesDiv.innerHTML = messages.map(msg => renderMessage(msg)).join('');
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        }
    }
};

window.handleKeyPress = function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
};

window.handleFileSelect = function(event) {
    const file = event.target.files[0];
    if (file) {
        const fileInfoDiv = document.getElementById('fileInfo');
        if (fileInfoDiv) {
            fileInfoDiv.innerHTML = `<div class="file-info">📎 ${file.name} (${formatFileSize(file.size)})</div>`;
        }
    }
};

function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.className = `status ${type}`;
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

// Auto cleanup messages periodically
setInterval(() => {
    if (state.roomCode) {
        cleanupMessages(state.roomCode);
        if (state.currentView === 'chat') {
            const messagesDiv = document.getElementById('messages');
            if (messagesDiv) {
                const messages = loadMessages(state.roomCode);
                messagesDiv.innerHTML = messages.map(msg => renderMessage(msg)).join('');
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        }
    }
}, 60000); // Check every minute

// Initial render
render();

