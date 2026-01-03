// Translations for multi-language support
const translations = {
    vi: {
        // Common
        'app.title': 'Temp Message',
        'app.subtitle': 'Nhắn tin tạm thời - Tự động xóa',
        'common.create': 'Tạo phòng mới',
        'common.join': 'Tham gia phòng',
        'common.back': 'Quay lại',
        'common.leave': 'Rời phòng',
        'common.send': 'Gửi',
        'common.file': 'File',
        'common.copy': 'Sao chép',
        'common.copied': 'Đã sao chép!',
        'common.roomCode': 'Mã phòng',
        'common.password': 'Mật khẩu',
        'common.owner': 'Chủ phòng',
        'common.autoDelete': 'Tự động xóa',
        'common.joinedAt': 'Tham gia',
        'common.viewPassword': 'Xem mật khẩu',
        'common.viewQR': 'Xem QR Code',
        'common.deleteRoom': 'Xóa phòng',
        'common.confirmDelete': 'Bạn có chắc muốn xóa phòng này?',
        'common.yes': 'Có',
        'common.no': 'Không',
        'common.qrExpiresIn': 'QR hết hạn sau:',
        'common.seconds': 'giây',
        'common.scanQR': 'Quét QR Code',
        'common.scanQRInstruction': 'Quét QR code hoặc nhập URL để tham gia phòng',
        'common.orEnterURL': 'Hoặc nhập URL từ QR code',
        'common.pleaseEnterURL': 'Vui lòng nhập URL',
        'common.invalidQRURL': 'URL không hợp lệ',
        'common.terms': 'Điều khoản',
        
        // Setup
        'setup.title': 'Chọn hành động',
        'setup.roomsList': 'Phòng đã tham gia:',
        
        // Create room
        'create.title': 'Tạo phòng mới',
        'create.autoDeleteLabel': 'Thời gian tự động xóa:',
        'create.passwordLabel': 'Mật khẩu (để trống để tự động tạo):',
        'create.passwordPlaceholder': '6 chữ số',
        'create.button': 'Tạo phòng',
        'create.success': 'Phòng đã được tạo!',
        'create.roomCodeLabel': 'Mã phòng:',
        'create.passwordLabel2': 'Mật khẩu:',
        'create.shareInfo': 'Chia sẻ thông tin này để người khác tham gia:',
        
        // Join room
        'join.title': 'Tham gia phòng',
        'join.roomCodeLabel': 'Mã phòng:',
        'join.roomCodePlaceholder': 'Nhập mã phòng',
        'join.passwordLabel': 'Mật khẩu:',
        'join.passwordPlaceholder': '6 chữ số',
        'join.button': 'Tham gia',
        
        // Chat
        'chat.title': 'Phòng:',
        'chat.autoDeleteAfter': 'Tự động xóa sau:',
        'chat.messagePlaceholder': 'Nhập tin nhắn...',
        'chat.processingFile': 'Đang xử lý file...',
        'chat.fileTooLarge': 'File quá lớn (tối đa 50MB)',
        'chat.fileError': 'Lỗi khi đọc file',
        'chat.fileExpired': 'File đã hết hạn',
        'chat.userJoined': 'đã tham gia phòng',
        'chat.userLeft': 'đã rời phòng',
        'chat.connectionError': 'Lỗi kết nối',
        'chat.roomNotFound': 'Phòng không tồn tại hoặc đã bị xóa',
        'chat.invalidPassword': 'Mật khẩu phải là 6 chữ số',
        'chat.requiredFields': 'Vui lòng nhập đầy đủ mã phòng và mật khẩu',
        'chat.createError': 'Lỗi khi tạo phòng',
        'chat.joinError': 'Lỗi khi tham gia phòng',
        'chat.invalidRoom': 'Phòng không tồn tại',
        'chat.maxRoomsReached': 'Bạn đã tạo tối đa 5 phòng. Vui lòng xóa một phòng trước khi tạo mới.',
        
        // Auto delete times
        'time.1m': '1 phút',
        'time.30m': '30 phút',
        'time.1h': '1 giờ',
        'time.24h': '24 giờ',
        
        // Language
        'lang.vi': 'Tiếng Việt',
        'lang.en': 'English',
        'lang.zh': '中文',
        
        // Terms
        'terms.title': 'Điều khoản sử dụng',
        'terms.section1.title': '1. Chấp nhận điều khoản',
        'terms.section1.content': 'Bằng việc sử dụng dịch vụ này, bạn đồng ý với các điều khoản và điều kiện được nêu trong tài liệu này. Nếu bạn không đồng ý, vui lòng không sử dụng dịch vụ.',
        'terms.section2.title': '2. Mục đích sử dụng',
        'terms.section2.content': 'Dịch vụ này được cung cấp để người dùng có thể gửi tin nhắn tạm thời và tự động xóa. Bạn không được sử dụng dịch vụ cho mục đích bất hợp pháp, gây hại, hoặc vi phạm quyền của người khác.',
        'terms.section3.title': '3. Quyền riêng tư',
        'terms.section3.content': 'Tin nhắn và file được lưu trữ cục bộ trên thiết bị của người dùng và tự động xóa theo thời gian đã thiết lập. Chúng tôi không lưu trữ nội dung tin nhắn trên server. Chỉ thông tin phòng và token được lưu trữ trong database.',
        'terms.section4.title': '4. Trách nhiệm người dùng',
        'terms.section4.content': 'Bạn chịu trách nhiệm về nội dung bạn gửi và đảm bảo không vi phạm pháp luật. Chúng tôi không chịu trách nhiệm về nội dung do người dùng tạo ra.',
        'terms.section5.title': '5. Từ chối trách nhiệm',
        'terms.section5.content': 'Dịch vụ được cung cấp "như hiện tại" mà không có bảo đảm nào. Chúng tôi không đảm bảo dịch vụ sẽ luôn hoạt động không gián đoạn hoặc không có lỗi.',
        'terms.section6.title': '6. Thay đổi điều khoản',
        'terms.section6.content': 'Chúng tôi có quyền thay đổi các điều khoản này bất cứ lúc nào. Việc tiếp tục sử dụng dịch vụ sau khi thay đổi được coi là chấp nhận các điều khoản mới.',
        'terms.lastUpdated': 'Cập nhật lần cuối: ' + new Date().toLocaleDateString('vi-VN')
    },
    en: {
        // Common
        'app.title': 'Temp Message',
        'app.subtitle': 'Temporary messaging - Auto delete',
        'common.create': 'Create Room',
        'common.join': 'Join Room',
        'common.back': 'Back',
        'common.leave': 'Leave Room',
        'common.send': 'Send',
        'common.file': 'File',
        'common.copy': 'Copy',
        'common.copied': 'Copied!',
        'common.roomCode': 'Room Code',
        'common.password': 'Password',
        'common.owner': 'Owner',
        'common.autoDelete': 'Auto Delete',
        'common.joinedAt': 'Joined',
        'common.viewPassword': 'View Password',
        'common.viewQR': 'View QR Code',
        'common.deleteRoom': 'Delete Room',
        'common.confirmDelete': 'Are you sure you want to delete this room?',
        'common.yes': 'Yes',
        'common.no': 'No',
        'common.qrExpiresIn': 'QR expires in:',
        'common.seconds': 'seconds',
        'common.scanQR': 'Scan QR Code',
        'common.scanQRInstruction': 'Scan QR code or enter URL to join room',
        'common.orEnterURL': 'Or enter URL from QR code',
        'common.pleaseEnterURL': 'Please enter URL',
        'common.invalidQRURL': 'Invalid QR URL',
        'common.terms': 'Terms',
        
        // Setup
        'setup.title': 'Choose an action',
        'setup.roomsList': 'Joined Rooms:',
        
        // Create room
        'create.title': '💬 Create New Room',
        'create.autoDeleteLabel': 'Auto delete time:',
        'create.passwordLabel': 'Password (leave empty to auto-generate):',
        'create.passwordPlaceholder': '6 digits',
        'create.button': 'Create Room',
        'create.success': 'Room created successfully!',
        'create.roomCodeLabel': 'Room Code:',
        'create.passwordLabel2': 'Password:',
        'create.shareInfo': 'Share this information for others to join:',
        
        // Join room
        'join.title': '💬 Join Room',
        'join.roomCodeLabel': 'Room Code:',
        'join.roomCodePlaceholder': 'Enter room code',
        'join.passwordLabel': 'Password:',
        'join.passwordPlaceholder': '6 digits',
        'join.button': 'Join',
        
        // Chat
        'chat.title': '💬 Room:',
        'chat.autoDeleteAfter': 'Auto delete after:',
        'chat.messagePlaceholder': 'Type a message...',
        'chat.processingFile': 'Processing file...',
        'chat.fileTooLarge': 'File too large (max 50MB)',
        'chat.fileError': 'Error reading file',
        'chat.fileExpired': 'File expired',
        'chat.userJoined': 'joined the room',
        'chat.userLeft': 'left the room',
        'chat.connectionError': 'Connection error',
        'chat.roomNotFound': 'Room not found or deleted',
        'chat.invalidPassword': 'Password must be 6 digits',
        'chat.requiredFields': 'Please enter room code and password',
        'chat.createError': 'Error creating room',
        'chat.joinError': 'Error joining room',
        'chat.invalidRoom': 'Room not found',
        'chat.maxRoomsReached': 'You have reached the maximum of 5 rooms. Please delete a room first.',
        'chat.roomDeleted': 'Room has been deleted by owner',
        'chat.deleteRoomSuccess': 'Room deleted successfully',
        'chat.deleteRoomError': 'Error deleting room',
        'chat.viewPasswordError': 'Error getting password',
        'chat.viewQRError': 'Error generating QR code',
        
        // Auto delete times
        'time.1m': '1 minute',
        'time.30m': '30 minutes',
        'time.1h': '1 hour',
        'time.24h': '24 hours',
        
        // Language
        'lang.vi': 'Tiếng Việt',
        'lang.en': 'English',
        'lang.zh': '中文',
        
        // Terms
        'terms.title': 'Terms of Service',
        'terms.section1.title': '1. Acceptance of Terms',
        'terms.section1.content': 'By using this service, you agree to the terms and conditions outlined in this document. If you do not agree, please do not use the service.',
        'terms.section2.title': '2. Purpose of Use',
        'terms.section2.content': 'This service is provided for users to send temporary messages that auto-delete. You may not use the service for illegal purposes, to cause harm, or to violate others\' rights.',
        'terms.section3.title': '3. Privacy',
        'terms.section3.content': 'Messages and files are stored locally on users\' devices and automatically deleted according to the set time. We do not store message content on the server. Only room information and tokens are stored in the database.',
        'terms.section4.title': '4. User Responsibility',
        'terms.section4.content': 'You are responsible for the content you send and must ensure it does not violate laws. We are not responsible for user-generated content.',
        'terms.section5.title': '5. Disclaimer',
        'terms.section5.content': 'The service is provided "as is" without any warranties. We do not guarantee the service will always operate without interruption or errors.',
        'terms.section6.title': '6. Changes to Terms',
        'terms.section6.content': 'We reserve the right to change these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.',
        'terms.lastUpdated': 'Last updated: ' + new Date().toLocaleDateString('en-US')
    },
    zh: {
        // Common
        'app.title': '临时消息',
        'app.subtitle': '临时消息 - 自动删除',
        'common.create': '创建房间',
        'common.join': '加入房间',
        'common.back': '返回',
        'common.leave': '离开房间',
        'common.send': '发送',
        'common.file': '文件',
        'common.copy': '复制',
        'common.copied': '已复制！',
        'common.roomCode': '房间代码',
        'common.password': '密码',
        'common.owner': '房主',
        'common.autoDelete': '自动删除',
        'common.joinedAt': '加入时间',
        'common.viewPassword': '查看密码',
        'common.viewQR': '查看二维码',
        'common.deleteRoom': '删除房间',
        'common.confirmDelete': '您确定要删除此房间吗？',
        'common.yes': '是',
        'common.no': '否',
        'common.qrExpiresIn': '二维码过期时间:',
        'common.seconds': '秒',
        'common.scanQR': '扫描二维码',
        'common.scanQRInstruction': '扫描二维码或输入URL加入房间',
        'common.orEnterURL': '或输入来自二维码的URL',
        'common.pleaseEnterURL': '请输入URL',
        'common.invalidQRURL': '无效的QR URL',
        
        // Setup
        'setup.title': '选择操作',
        'setup.roomsList': '已加入的房间:',
        
        // Create room
        'create.title': '创建新房间',
        'create.autoDeleteLabel': '自动删除时间:',
        'create.passwordLabel': '密码（留空自动生成）:',
        'create.passwordPlaceholder': '6位数字',
        'create.button': '创建房间',
        'create.success': '房间创建成功！',
        'create.roomCodeLabel': '房间代码:',
        'create.passwordLabel2': '密码:',
        'create.shareInfo': '分享此信息供他人加入:',
        
        // Join room
        'join.title': '加入房间',
        'join.roomCodeLabel': '房间代码:',
        'join.roomCodePlaceholder': '输入房间代码',
        'join.passwordLabel': '密码:',
        'join.passwordPlaceholder': '6位数字',
        'join.button': '加入',
        
        // Chat
        'chat.title': '房间:',
        'chat.autoDeleteAfter': '自动删除时间:',
        'chat.messagePlaceholder': '输入消息...',
        'chat.processingFile': '正在处理文件...',
        'chat.fileTooLarge': '文件太大（最大50MB）',
        'chat.fileError': '读取文件错误',
        'chat.fileExpired': '文件已过期',
        'chat.userJoined': '加入了房间',
        'chat.userLeft': '离开了房间',
        'chat.connectionError': '连接错误',
        'chat.roomNotFound': '房间不存在或已删除',
        'chat.invalidPassword': '密码必须是6位数字',
        'chat.requiredFields': '请输入房间代码和密码',
        'chat.createError': '创建房间错误',
        'chat.joinError': '加入房间错误',
        'chat.invalidRoom': '房间不存在',
        'chat.maxRoomsReached': '您已达到最多5个房间的限制。请先删除一个房间。',
        'chat.roomDeleted': '房间已被房主删除',
        'chat.deleteRoomSuccess': '房间删除成功',
        'chat.deleteRoomError': '删除房间错误',
        'chat.viewPasswordError': '获取密码错误',
        'chat.viewQRError': '生成二维码错误',
        
        // Auto delete times
        'time.1m': '1分钟',
        'time.30m': '30分钟',
        'time.1h': '1小时',
        'time.24h': '24小时',
        
        // Language
        'lang.vi': 'Tiếng Việt',
        'lang.en': 'English',
        'lang.zh': '中文',
        
        // Terms
        'terms.title': '使用条款',
        'terms.section1.title': '1. 接受条款',
        'terms.section1.content': '使用本服务即表示您同意本文档中概述的条款和条件。如果您不同意，请不要使用本服务。',
        'terms.section2.title': '2. 使用目的',
        'terms.section2.content': '本服务用于用户发送自动删除的临时消息。您不得将服务用于非法目的、造成伤害或侵犯他人权利。',
        'terms.section3.title': '3. 隐私',
        'terms.section3.content': '消息和文件存储在用户设备的本地，并根据设置的时间自动删除。我们不在服务器上存储消息内容。只有房间信息和令牌存储在数据库中。',
        'terms.section4.title': '4. 用户责任',
        'terms.section4.content': '您对发送的内容负责，必须确保不违反法律。我们不对用户生成的内容负责。',
        'terms.section5.title': '5. 免责声明',
        'terms.section5.content': '服务按"原样"提供，不提供任何保证。我们不保证服务将始终无中断或无错误地运行。',
        'terms.section6.title': '6. 条款变更',
        'terms.section6.content': '我们保留随时更改这些条款的权利。变更后继续使用服务即表示接受新条款。',
        'terms.lastUpdated': '最后更新: ' + new Date().toLocaleDateString('zh-CN')
    }
};

// Translation function
function t(key, lang = null) {
    const currentLang = lang || (localStorage.getItem('language') || 'en');
    return translations[currentLang]?.[key] || key;
}

// Set language
function setLanguage(lang) {
    localStorage.setItem('language', lang);
    if (typeof render === 'function') {
        render();
    }
}

// Get current language
function getCurrentLanguage() {
    return localStorage.getItem('language') || 'en';
}

