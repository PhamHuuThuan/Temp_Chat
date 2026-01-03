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
    userCount: 0
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

// Save message to localStorage (check duplicate by ID)
function saveMessage(roomCode, message) {
    const key = `messages_${roomCode}`;
    const messages = loadMessages(roomCode);
    
    // Kiểm tra duplicate bằng message ID
    const existingIndex = messages.findIndex(msg => msg.id === message.id);
    if (existingIndex >= 0) {
        // Message đã tồn tại, không lưu lại
        return;
    }
    
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
        // Load danh sách phòng đã tham gia (tránh duplicate)
        const allTokens = getAllUserTokens();
        let roomsList = [];
        const seenRooms = new Set(); // Track room codes đã thấy
        
        allTokens.forEach(token => {
            const userRooms = loadUserRooms(token);
            userRooms.forEach(room => {
                // Chỉ thêm room nếu chưa thấy roomCode này
                if (!seenRooms.has(room.roomCode)) {
                    seenRooms.add(room.roomCode);
                    roomsList.push({ ...room, token });
                }
            });
        });
        const lang = getCurrentLanguage();
        
        root.innerHTML = `
            <div class="container">
                <div class="header">
                    <div class="header-top">
                        <div>
                            <h1><i class="fas fa-comments"></i> ${t('app.title', lang)}</h1>
                            <p>${t('app.subtitle', lang)} <a href="#" onclick="showTerms(); return false;" style="color: #4A90E2; text-decoration: none; font-size: 12px; margin-left: 10px;">${t('common.terms', lang)}</a></p>
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
                        <button class="btn btn-primary" onclick="showCreateRoom()"><i class="fas fa-plus-circle"></i> ${t('common.create', lang)}</button>
                        <button class="btn btn-secondary" onclick="showJoinRoom()"><i class="fas fa-sign-in-alt"></i> ${t('common.join', lang)}</button>
                        
                        ${roomsList.length > 0 ? `
                            <div style="margin-top: 30px;">
                                <h3 style="margin-bottom: 15px; color: #333;"><i class="fas fa-door-open"></i> ${t('setup.roomsList', lang)}</h3>
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
                            <h1><i class="fas fa-plus-circle"></i> ${t('create.title', lang)}</h1>
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
                        <button class="btn btn-primary" onclick="createRoom()" title="${t('create.button', lang)}"><i class="fas fa-plus"></i></button>
                        <button class="btn btn-secondary" onclick="backToSetup()" title="${t('common.back', lang)}"><i class="fas fa-arrow-left"></i></button>
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
                            <h1><i class="fas fa-sign-in-alt"></i> ${t('join.title', lang)}</h1>
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
                        <button class="btn btn-primary" onclick="joinRoom()" title="${t('join.button', lang)}"><i class="fas fa-sign-in-alt"></i></button>
                        <button class="btn btn-secondary" onclick="backToSetup()" title="${t('common.back', lang)}"><i class="fas fa-arrow-left"></i></button>
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
                            <p>${t('chat.autoDeleteAfter', lang)} ${getAutoDeleteLabel(state.autoDelete)} <span class="user-count-badge"><i class="fas fa-users"></i> ${state.userCount || 0}</span></p>
                        </div>
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <div class="language-selector">
                                <select id="languageSelect" onchange="changeLanguage(this.value)">
                                    <option value="vi" ${lang === 'vi' ? 'selected' : ''}>${t('lang.vi', lang)}</option>
                                    <option value="en" ${lang === 'en' ? 'selected' : ''}>${t('lang.en', lang)}</option>
                                    <option value="zh" ${lang === 'zh' ? 'selected' : ''}>${t('lang.zh', lang)}</option>
                                </select>
                            </div>
                            <button class="btn btn-secondary" onclick="leaveRoom()" style="margin: 0;"><i class="fas fa-sign-out-alt"></i> ${t('common.leave', lang)}</button>
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
                                        <i class="fas fa-key"></i>
                                    </button>
                                    <button class="btn btn-owner" onclick="viewQR()" title="${t('common.viewQR', lang)}">
                                        <i class="fas fa-qrcode"></i>
                                    </button>
                                    <button class="btn btn-danger" onclick="deleteRoom()" title="${t('common.deleteRoom', lang)}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        <div class="messages" id="messages">
                            ${messages.map(msg => renderMessage(msg)).join('')}
                        </div>
                        <div class="chat-input-area">
                            <div id="status"></div>
                            <div class="input-group">
                                <input type="text" id="messageInput" placeholder="${t('chat.messagePlaceholder', lang)}" onkeypress="handleKeyPress(event)">
                                <div class="file-input-wrapper">
                                    <input type="file" id="fileInput" onchange="handleFileSelect(event)">
                                </div>
                                <button class="btn btn-primary" onclick="sendMessage()" title="${t('common.send', lang)}"><i class="fas fa-paper-plane"></i></button>
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
    
    // Tính thời gian còn lại trước khi message bị xóa
    const autoDeleteTime = AUTO_DELETE_TIMES[msg.autoDelete] || AUTO_DELETE_TIMES['1h'];
    const expiresAt = msg.timestamp + autoDeleteTime;
    const now = Date.now();
    const timeLeft = Math.max(0, expiresAt - now);
    
    // Format countdown
    const lang = getCurrentLanguage();
    let countdownText = '';
    if (timeLeft > 0) {
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        if (minutes > 0) {
            countdownText = `${minutes}m ${seconds}s`;
        } else {
            countdownText = `${seconds}s`;
        }
    } else {
        countdownText = t('chat.expired', lang);
    }
    
    let fileContent = '';
    if (msg.fileInfo) {
        // Lấy file data từ sessionStorage
        const fileData = getFileData(msg.id);
        
        if (fileData) {
            const dataUrl = `data:${msg.fileInfo.mimetype};base64,${fileData}`;
            
            if (msg.fileInfo.mimetype && msg.fileInfo.mimetype.startsWith('image/')) {
                fileContent = `<div class="message-file"><img src="${dataUrl}" alt="${msg.fileInfo.originalName}" onclick="viewFile('${msg.id}', 'image')" class="message-image-thumbnail"></div>`;
            } else if (msg.fileInfo.mimetype && msg.fileInfo.mimetype.startsWith('video/')) {
                fileContent = `<div class="message-file"><video controls class="message-video-thumbnail"><source src="${dataUrl}" type="${msg.fileInfo.mimetype}"></video></div>`;
            } else {
                // Tạo download link từ data URL
                fileContent = `<div class="message-file"><a href="${dataUrl}" class="file-link" download="${msg.fileInfo.originalName}" onclick="viewFile('${msg.id}', 'file')"><i class="fas fa-paperclip"></i> ${msg.fileInfo.originalName} (${formatFileSize(msg.fileInfo.size)})</a></div>`;
            }
        } else {
            // File data đã bị mất (có thể do refresh trang - sessionStorage bị xóa)
            const lang = getCurrentLanguage();
            fileContent = `<div class="message-file"><div class="file-info"><i class="fas fa-paperclip"></i> ${msg.fileInfo.originalName} (${formatFileSize(msg.fileInfo.size)}) - ${t('chat.fileExpired', lang)}</div></div>`;
        }
    }
    
    // Calculate progress percentage for circular countdown
    const deleteTime = AUTO_DELETE_TIMES[msg.autoDelete] || AUTO_DELETE_TIMES['1h'];
    const progress = timeLeft > 0 ? Math.min(100, (timeLeft / deleteTime) * 100) : 0;
    const circumference = 2 * Math.PI * 18; // radius = 18
    const offset = circumference - (progress / 100) * circumference;
    
    return `
        <div class="message" data-id="${msg.id}" data-expires-at="${expiresAt}">
            <div class="message-header">
                <span class="message-username">${msg.username}</span>
                <span class="message-time">${timeStr}</span>
                <div class="countdown-circle" id="countdown-${msg.id}">
                    <svg class="countdown-svg" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="18" class="countdown-bg"></circle>
                        <circle cx="20" cy="20" r="18" class="countdown-progress" 
                                stroke-dasharray="${circumference}" 
                                stroke-dashoffset="${offset}"></circle>
                    </svg>
                    <span class="countdown-text">${countdownText}</span>
                </div>
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
                <h2><i class="fas fa-check-circle"></i> ${t('create.success', lang)}</h2>
                <button class="modal-close" onclick="closeRoomInfoModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <p class="modal-description">${t('create.shareInfo', lang)}</p>
                <div class="room-info-box">
                    <div class="info-row">
                        <label>${t('create.roomCodeLabel', lang)}</label>
                        <div class="info-value-box">
                            <span class="info-value" id="roomCodeValue">${roomCode}</span>
                            <button class="copy-btn" id="copyRoomCode" onclick="copyToClipboard('${roomCode}', 'copyRoomCode')" title="${t('common.copy', lang)}">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="info-row">
                        <label>${t('create.passwordLabel2', lang)}</label>
                        <div class="info-value-box">
                            <span class="info-value" id="passwordValue">${password}</span>
                            <button class="copy-btn" id="copyPassword" onclick="copyToClipboard('${password}', 'copyPassword')" title="${t('common.copy', lang)}">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="closeRoomInfoModalAndJoin()" style="width: 100%; margin-top: 20px;">
                    <i class="fas fa-sign-in-alt"></i> ${t('common.join', lang)}
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

window.showQRScanner = function() {
    const lang = getCurrentLanguage();
    
    // Tạo modal cho QR scanner
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-qrcode"></i> ${t('common.scanQR', lang)}</h3>
                <button class="modal-close" onclick="closeQRScanner()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 20px; color: #666;">${t('common.scanQRInstruction', lang)}</p>
                <div id="qr-scanner-container" style="text-align: center; position: relative;">
                    <video id="qr-video" width="100%" style="max-width: 400px; border-radius: 8px; background: #000; display: none;"></video>
                    <canvas id="qr-canvas" style="display: none;"></canvas>
                    <div id="qr-scanning-indicator" style="display: none; padding: 20px; color: #666;">
                        <i class="fas fa-camera" style="font-size: 48px; margin-bottom: 10px;"></i>
                        <p>${t('common.scanningQR', lang)}</p>
                    </div>
                </div>
                <div style="margin-top: 20px;">
                    <div style="text-align: center; margin-bottom: 15px; color: #666; font-size: 14px;">${t('common.or', lang)}</div>
                    <input type="text" id="qr-manual-input" placeholder="${t('common.orEnterURL', lang)}" style="width: 100%; padding: 12px; border: 1px solid #E1E8ED; border-radius: 8px; font-size: 14px;">
                    <button class="btn btn-primary" onclick="processQRInput()" style="width: 100%; margin-top: 10px;"><i class="fas fa-check"></i> ${t('common.join', lang)}</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Lưu modal để cleanup sau
    window.qrScannerModal = modal;
    window.qrScannerStream = null;
    
    // Thử sử dụng camera để quét QR
    const video = document.getElementById('qr-video');
    const canvas = document.getElementById('qr-canvas');
    const scanningIndicator = document.getElementById('qr-scanning-indicator');
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Kiểm tra jsQR có sẵn không
        if (typeof jsQR === 'undefined') {
            console.log('jsQR library not loaded');
            video.style.display = 'none';
            scanningIndicator.style.display = 'none';
        } else {
            // Request camera access
            navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            })
                .then(stream => {
                    window.qrScannerStream = stream;
                    video.srcObject = stream;
                    video.style.display = 'block';
                    scanningIndicator.style.display = 'block';
                    
                    // Wait for video to be ready
                    video.onloadedmetadata = () => {
                        video.play();
                        
                        const context = canvas.getContext('2d');
                        let scanning = true;
                        
                        function scanQR() {
                            if (!scanning || !video || video.readyState !== video.HAVE_ENOUGH_DATA) {
                                if (scanning) {
                                    requestAnimationFrame(scanQR);
                                }
                                return;
                            }
                            
                            try {
                                canvas.width = video.videoWidth;
                                canvas.height = video.videoHeight;
                                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                                
                                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                                const code = jsQR(imageData.data, imageData.width, imageData.height);
                                
                                if (code && code.data) {
                                    scanning = false;
                                    // Tìm thấy QR code
                                    const url = code.data;
                                    closeQRScanner();
                                    processQRFromURL(url);
                                    return;
                                }
                            } catch (error) {
                                console.error('Error scanning QR:', error);
                            }
                            
                            if (scanning) {
                                requestAnimationFrame(scanQR);
                            }
                        }
                        
                        // Start scanning
                        scanQR();
                    };
                })
                .catch(err => {
                    console.log('Camera access denied or not available:', err);
                    video.style.display = 'none';
                    scanningIndicator.style.display = 'none';
                });
        }
    } else {
        video.style.display = 'none';
        scanningIndicator.style.display = 'none';
    }
};

window.closeQRScanner = function() {
    if (window.qrScannerStream) {
        window.qrScannerStream.getTracks().forEach(track => track.stop());
        window.qrScannerStream = null;
    }
    if (window.qrScannerModal) {
        window.qrScannerModal.remove();
        window.qrScannerModal = null;
    }
};

window.processQRFromURL = function(url) {
    // Parse URL để lấy room code và password
    let roomCode = null;
    let password = null;
    
    try {
        // Thử parse như URL đầy đủ
        const urlObj = new URL(url);
        roomCode = urlObj.searchParams.get('room');
        password = urlObj.searchParams.get('password');
    } catch (e) {
        // Nếu không phải URL hợp lệ, thử parse trực tiếp từ string
        const match = url.match(/[?&]room=([A-Z0-9]+).*[&]?password=(\d{6})/i);
        if (match) {
            roomCode = match[1];
            password = match[2];
        } else {
            // Thử parse từ format khác
            const match2 = url.match(/room=([A-Z0-9]+).*password=(\d{6})/i);
            if (match2) {
                roomCode = match2[1];
                password = match2[2];
            }
        }
    }
    
    if (roomCode && password) {
        // Join room
        window.joinRoomFromURL(roomCode, password);
    } else {
        const lang = getCurrentLanguage();
        showStatus(t('common.invalidQRURL', lang), 'error');
    }
};

window.processQRInput = function() {
    const input = document.getElementById('qr-manual-input');
    const url = input.value.trim();
    
    if (!url) {
        const lang = getCurrentLanguage();
        showStatus(t('common.pleaseEnterURL', lang), 'error');
        return;
    }
    
    // Parse URL để lấy room code và password
    let roomCode = null;
    let password = null;
    
    try {
        // Thử parse như URL đầy đủ
        const urlObj = new URL(url);
        roomCode = urlObj.searchParams.get('room');
        password = urlObj.searchParams.get('password');
    } catch (e) {
        // Nếu không phải URL hợp lệ, thử parse trực tiếp từ string
        const match = url.match(/[?&]room=([A-Z0-9]+).*[&]?password=(\d{6})/i);
        if (match) {
            roomCode = match[1];
            password = match[2];
        } else {
            // Thử parse từ format khác
            const match2 = url.match(/room=([A-Z0-9]+).*password=(\d{6})/i);
            if (match2) {
                roomCode = match2[1];
                password = match2[2];
            }
        }
    }
    
    if (roomCode && password) {
        // Đóng modal
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            const video = document.getElementById('qr-video');
            if (video && video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
            }
            modal.remove();
        }
        // Join room
        window.joinRoomFromURL(roomCode, password);
    } else {
        const lang = getCurrentLanguage();
        showStatus(t('common.invalidQRURL', lang), 'error');
    }
};

window.showTerms = function() {
    const lang = getCurrentLanguage();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
            <div class="modal-header">
                <h3><i class="fas fa-file-contract"></i> ${t('terms.title', lang)}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body" style="text-align: left; line-height: 1.6;">
                <h4>${t('terms.section1.title', lang)}</h4>
                <p>${t('terms.section1.content', lang)}</p>
                
                <h4>${t('terms.section2.title', lang)}</h4>
                <p>${t('terms.section2.content', lang)}</p>
                
                <h4>${t('terms.section3.title', lang)}</h4>
                <p>${t('terms.section3.content', lang)}</p>
                
                <h4>${t('terms.section4.title', lang)}</h4>
                <p>${t('terms.section4.content', lang)}</p>
                
                <h4>${t('terms.section5.title', lang)}</h4>
                <p>${t('terms.section5.content', lang)}</p>
                
                <h4>${t('terms.section6.title', lang)}</h4>
                <p>${t('terms.section6.content', lang)}</p>
                
                <p style="margin-top: 20px; font-size: 12px; color: #666;">${t('terms.lastUpdated', lang)}</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
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
            state.userCount = data.userCount || 1;
            
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
            state.userCount = data.userCount || 0;
            
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
        
        // Load messages và start countdown timers
        const messages = loadMessages(state.roomCode);
        messages.forEach(msg => {
            const deleteTime = AUTO_DELETE_TIMES[msg.autoDelete] || AUTO_DELETE_TIMES['1h'];
            const expiresAt = msg.timestamp + deleteTime;
            if (expiresAt > Date.now()) {
                startMessageCountdown(msg.id, msg.timestamp, msg.autoDelete);
            }
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
            // Kiểm tra message đã tồn tại chưa (tránh duplicate)
            const existingMsg = messagesDiv.querySelector(`[data-id="${messageData.id}"]`);
            if (!existingMsg) {
                messagesDiv.innerHTML += renderMessage(messageData);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                
                // Start countdown timer cho message mới
                startMessageCountdown(messageData.id, messageData.timestamp, messageData.autoDelete);
            }
        }
    });
    
    state.socket.on('user-joined', (data) => {
        const lang = getCurrentLanguage();
        if (data.userCount !== undefined) {
            state.userCount = data.userCount;
        }
        showStatus(`${data.username} ${t('chat.userJoined', lang)}`, 'info');
        if (state.currentView === 'chat') {
            render();
        }
    });
    
    state.socket.on('user-left', (data) => {
        const lang = getCurrentLanguage();
        if (data.userCount !== undefined) {
            state.userCount = data.userCount;
        }
        showStatus(`${data.username} ${t('chat.userLeft', lang)}`, 'info');
        if (state.currentView === 'chat') {
            render();
        }
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
            const lang = getCurrentLanguage();
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content qr-modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-qrcode"></i> ${t('common.viewQR', lang)}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body qr-modal-body">
                        <div class="qr-image-container">
                            <img src="${data.qrCode}" alt="QR Code" class="qr-modal-image">
                        </div>
                        <p class="qr-expires-text">${t('common.qrExpiresIn', lang)} <span id="qrModalCountdown"></span></p>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Start countdown
            let expiresAt = data.expiresAt;
            function updateQRCountdown() {
                const now = Date.now();
                const timeLeft = Math.max(0, expiresAt - now);
                const countdownEl = document.getElementById('qrModalCountdown');
                if (countdownEl) {
                    const minutes = Math.floor(timeLeft / 60000);
                    const seconds = Math.floor((timeLeft % 60000) / 1000);
                    countdownEl.textContent = `${minutes}m ${seconds}s`;
                    if (timeLeft > 0) {
                        setTimeout(updateQRCountdown, 1000);
                    }
                }
            }
            updateQRCountdown();
            
            // Close modal handler
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.remove();
            });
        } else {
            const lang = getCurrentLanguage();
            showStatus(data.error || t('chat.viewQRError', lang), 'error');
        }
    } catch (error) {
        const lang = getCurrentLanguage();
        showStatus(t('chat.viewQRError', lang), 'error');
    }
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


// Show password modal
function showPasswordModal(password, lang) {
    const modal = document.createElement('div');
    modal.className = 'room-info-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closePasswordModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-key"></i> ${t('common.viewPassword', lang)}</h2>
                <button class="modal-close" onclick="closePasswordModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="room-info-box">
                    <div class="info-row">
                        <label>${t('common.password', lang)}</label>
                        <div class="info-value-box">
                            <span class="info-value" id="passwordValueModal">${password}</span>
                            <button class="copy-btn" id="copyPasswordModal" onclick="copyToClipboard('${password}', 'copyPasswordModal')" title="${t('common.copy', lang)}">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="closePasswordModal()" style="width: 100%; margin-top: 20px;">
                    <i class="fas fa-arrow-left"></i> ${t('common.back', lang)}
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
        
        // KHÔNG lưu vào localStorage ở đây - sẽ lưu khi nhận từ socket
        // Điều này tránh duplicate messages
        
        input.value = '';
        fileInput.value = '';
        document.getElementById('fileInfo').innerHTML = '';
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
            fileInfoDiv.innerHTML = `<div class="file-info"><i class="fas fa-paperclip"></i> ${file.name} (${formatFileSize(file.size)})</div>`;
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

// Store active countdown timers to avoid duplicates
const activeCountdowns = new Set();

// Start countdown timer for a message
function startMessageCountdown(messageId, timestamp, autoDelete) {
    // Tránh duplicate countdown
    if (activeCountdowns.has(messageId)) {
        return;
    }
    activeCountdowns.add(messageId);
    
    const deleteTime = AUTO_DELETE_TIMES[autoDelete] || AUTO_DELETE_TIMES['1h'];
    const expiresAt = timestamp + deleteTime;
    
    function updateCountdown() {
        const countdownEl = document.getElementById(`countdown-${messageId}`);
        if (!countdownEl) {
            activeCountdowns.delete(messageId);
            return;
        }
        
        const now = Date.now();
        const timeLeft = Math.max(0, expiresAt - now);
        
        const lang = getCurrentLanguage();
        const deleteTime = AUTO_DELETE_TIMES[autoDelete] || AUTO_DELETE_TIMES['1h'];
        const progress = timeLeft > 0 ? Math.min(100, (timeLeft / deleteTime) * 100) : 0;
        const circumference = 2 * Math.PI * 18;
        const offset = circumference - (progress / 100) * circumference;
        
        // Update circular progress
        const svg = countdownEl.querySelector('.countdown-svg');
        const progressCircle = svg ? svg.querySelector('.countdown-progress') : null;
        const textSpan = countdownEl.querySelector('.countdown-text');
        
        if (progressCircle) {
            progressCircle.setAttribute('stroke-dashoffset', offset);
        }
        
        if (timeLeft > 0) {
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            let countdownText = '';
            if (minutes > 0) {
                countdownText = `${minutes}m`;
            } else {
                countdownText = `${seconds}s`;
            }
            if (textSpan) {
                textSpan.textContent = countdownText;
            }
            
            // Update every second
            setTimeout(updateCountdown, 1000);
        } else {
            // Message expired, remove it
            activeCountdowns.delete(messageId);
            const msgElement = document.querySelector(`[data-id="${messageId}"]`);
            if (msgElement) {
                msgElement.remove();
            }
            deleteFileData(messageId);
            cleanupMessages(state.roomCode);
        }
    }
    
    updateCountdown();
}

// Auto cleanup messages periodically - chỉ cleanup, không re-render để tránh làm dừng countdown
setInterval(() => {
    if (state.roomCode) {
        cleanupMessages(state.roomCode);
        // Không re-render messages ở đây để tránh làm dừng countdown timers
        // Countdown timers sẽ tự động update và xóa message khi hết hạn
    }
}, 60000); // Check every minute

// Check URL params for auto join
function checkURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    // Kiểm tra lỗi từ QR token
    if (error === 'qr_expired') {
        const lang = getCurrentLanguage();
        showStatus(t('chat.qrExpired', lang), 'error');
        return;
    }
    if (error === 'invalid_token') {
        const lang = getCurrentLanguage();
        showStatus(t('chat.invalidQRToken', lang), 'error');
        return;
    }
    
    let roomCode = urlParams.get('room');
    let password = urlParams.get('password');
    
    // Nếu không có trong query params, thử parse từ hash hoặc path
    if (!roomCode || !password) {
        const hash = window.location.hash;
        const match = hash.match(/room=([A-Z0-9]+).*password=(\d{6})/i);
        if (match) {
            roomCode = match[1];
            password = match[2];
        }
    }
    
    // Nếu vẫn không có, thử parse từ toàn bộ URL
    if (!roomCode || !password) {
        const fullUrl = window.location.href;
        const match = fullUrl.match(/[?&#]room=([A-Z0-9]+).*[&#]password=(\d{6})/i);
        if (match) {
            roomCode = match[1];
            password = match[2];
        }
    }
    
    if (roomCode && password) {
        // Auto join room from URL
        state.roomCode = roomCode.toUpperCase();
        window.joinRoomFromURL(roomCode, password);
    }
}

window.joinRoomFromURL = async function(roomCode, password) {
    const lang = getCurrentLanguage();
    
    if (!/^\d{6}$/.test(password)) {
        showStatus(t('chat.invalidPassword', lang), 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/rooms/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomCode: roomCode.toUpperCase(),
                password: password,
                deviceToken: state.deviceToken
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            state.roomCode = roomCode.toUpperCase();
            state.token = data.token;
            state.autoDelete = data.autoDelete;
            state.username = generateRandomName();
            state.isOwner = data.isOwner || false;
            state.userCount = data.userCount || 0;
            
            saveUserRoom(data.token, roomCode.toUpperCase(), {
                autoDelete: data.autoDelete,
                isOwner: data.isOwner || false
            });
            
            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname);
            
            connectToRoom();
        } else {
            showStatus(data.error || t('chat.joinError', lang), 'error');
            state.currentView = 'join';
            render();
        }
    } catch (error) {
        showStatus(t('chat.connectionError', lang), 'error');
        state.currentView = 'join';
        render();
    }
};

// View file in modal
window.viewFile = function(messageId, fileType) {
    const messages = loadMessages(state.roomCode);
    const message = messages.find(m => m.id === messageId);
    
    if (!message || !message.fileInfo) return;
    
    const fileData = getFileData(messageId);
    if (!fileData) {
        const lang = getCurrentLanguage();
        showStatus(t('chat.fileExpired', lang), 'error');
        return;
    }
    
    const dataUrl = `data:${message.fileInfo.mimetype};base64,${fileData}`;
    const lang = getCurrentLanguage();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    let content = '';
    if (fileType === 'image') {
        content = `<img src="${dataUrl}" alt="${message.fileInfo.originalName}" style="max-width: 100%; max-height: 80vh; object-fit: contain;">`;
    } else if (fileType === 'video') {
        content = `<video controls style="max-width: 100%; max-height: 80vh;"><source src="${dataUrl}" type="${message.fileInfo.mimetype}"></video>`;
    } else {
        content = `<div style="padding: 40px; text-align: center;">
            <i class="fas fa-file" style="font-size: 64px; color: #666; margin-bottom: 20px;"></i>
            <p style="font-size: 18px; color: #333; margin-bottom: 10px;">${message.fileInfo.originalName}</p>
            <p style="font-size: 14px; color: #666;">${formatFileSize(message.fileInfo.size)}</p>
        </div>`;
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90vw; max-height: 90vh; overflow: auto;">
            <div class="modal-header">
                <h3>${message.fileInfo.originalName}</h3>
                <div style="display: flex; gap: 10px;">
                    <a href="${dataUrl}" download="${message.fileInfo.originalName}" class="btn btn-primary" style="text-decoration: none;">
                        <i class="fas fa-download"></i> ${t('common.download', lang)}
                    </a>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div class="modal-body" style="text-align: center; padding: 20px;">
                ${content}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

// Initial render
checkURLParams();
if (state.currentView === 'setup') {
    render();
}


