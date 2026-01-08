// 會議室控制器 - 整合所有模組
class MeetingController {
    constructor() {
        this.initialized = false;
    }

    // 初始化
    async init() {
        if (this.initialized) return;

        try {
            // 初始化使用者管理
            await userManager.init();

            // 檢查登入狀態
            if (!userManager.currentUser) {
                window.location.href = 'index.html';
                return;
            }

            // 初始化會議室
            await meetingRoom.init();

            // 初始化說話者檢測
            const speakerInitialized = await speakerDetection.init();
            if (speakerInitialized) {
                speakerDetection.startDetection();
            }

            // 初始化語音識別
            const speechInitialized = speechRecognition.init();
            if (speechInitialized) {
                speechRecognition.start();
            }

            // 初始化字幕管理
            captionManager.init();

            // 綁定 UI 事件
            this.bindEvents();

            // 顯示管理員面板（如果是管理員）
            if (userManager.currentUser.role === 'admin') {
                this.showAdminPanel();
            }

            this.initialized = true;
            console.log('Meeting controller initialized');
        } catch (error) {
            console.error('Failed to initialize meeting controller:', error);
            alert('初始化失敗：' + error.message);
        }
    }

    // 綁定事件
    bindEvents() {
        // 離開會議
        document.getElementById('leaveBtn')?.addEventListener('click', () => {
            this.leaveMeeting();
        });

        // 語言切換
        document.getElementById('languageSelect')?.addEventListener('change', (e) => {
            speechRecognition.setLanguage(e.target.value);
        });

        // 上傳照片
        document.getElementById('uploadPhotoBtn')?.addEventListener('click', () => {
            this.showPhotoUploadModal();
        });

        document.getElementById('uploadConfirm')?.addEventListener('click', () => {
            this.uploadPhoto();
        });

        document.getElementById('uploadCancel')?.addEventListener('click', () => {
            this.hidePhotoUploadModal();
        });

        // 設定按鈕
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.toggleAdminPanel();
        });

        // 監聽參與者更新
        window.addEventListener('usersUpdated', () => {
            this.updateParticipantCount();
            this.updateAdminPanel();
        });
    }

    // 離開會議
    async leaveMeeting() {
        if (confirm('確定要離開會議嗎？')) {
            await meetingRoom.leaveMeeting();
            speakerDetection.cleanup();
            speechRecognition.cleanup();
            captionManager.cleanup();
            await userManager.logout();
        }
    }

    // 更新參與者數量
    updateParticipantCount() {
        const count = meetingRoom.getParticipants().length;
        const countElement = document.getElementById('participantCount');
        if (countElement) {
            countElement.textContent = `${count} 人`;
        }
    }

    // 顯示管理員面板
    showAdminPanel() {
        const panel = document.getElementById('adminPanel');
        if (panel) {
            panel.classList.remove('hidden');
        }
        this.updateAdminPanel();
    }

    // 切換管理員面板
    toggleAdminPanel() {
        if (userManager.currentUser?.role !== 'admin') {
            alert('您沒有管理員權限');
            return;
        }

        const panel = document.getElementById('adminPanel');
        if (panel) {
            panel.classList.toggle('hidden');
        }
    }

    // 更新管理員面板
    updateAdminPanel() {
        if (userManager.currentUser?.role !== 'admin') return;

        // 更新待批准使用者
        const pendingUsers = userManager.getPendingUsers();
        const pendingList = document.getElementById('pendingUsers');

        if (pendingList) {
            if (pendingUsers.length === 0) {
                pendingList.innerHTML = '<p class="empty-message">無待批准使用者</p>';
            } else {
                pendingList.innerHTML = pendingUsers.map(user => `
                    <div class="pending-user">
                        <span>${user.displayName} (${user.email})</span>
                        <div class="pending-actions">
                            <button onclick="meetingController.approveUser('${user.uid}')" class="btn-small btn-approve">批准</button>
                            <button onclick="meetingController.rejectUser('${user.uid}')" class="btn-small btn-reject">拒絕</button>
                        </div>
                    </div>
                `).join('');
            }
        }

        // 更新所有使用者
        const allUsers = Object.entries(userManager.getAllUsers()).map(([uid, user]) => ({ uid, ...user }));
        const userList = document.getElementById('allUsers');

        if (userList) {
            userList.innerHTML = allUsers.map(user => `
                <div class="user-item">
                    <span>${user.displayName} (${user.role === 'admin' ? '管理員' : '成員'})</span>
                    ${user.role !== 'admin' ? `
                        <button onclick="meetingController.setAdmin('${user.uid}')" class="btn-small">設為管理員</button>
                    ` : ''}
                </div>
            `).join('');
        }
    }

    // 批准使用者
    async approveUser(userId) {
        await userManager.approveUser(userId);
        alert('已批准使用者加入');
    }

    // 拒絕使用者
    async rejectUser(userId) {
        if (confirm('確定要拒絕此使用者嗎？')) {
            await userManager.rejectUser(userId);
            alert('已拒絕使用者');
        }
    }

    // 設定管理員
    async setAdmin(userId) {
        if (confirm('確定要將此使用者設為管理員嗎？')) {
            await userManager.setAdmin(userId);
            alert('已設定為管理員');
        }
    }

    // 顯示照片上傳對話框
    showPhotoUploadModal() {
        const modal = document.getElementById('photoUploadModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    // 隱藏照片上傳對話框
    hidePhotoUploadModal() {
        const modal = document.getElementById('photoUploadModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        document.getElementById('photoInput').value = '';
    }

    // 上傳照片
    async uploadPhoto() {
        const input = document.getElementById('photoInput');
        const file = input.files[0];

        if (!file) {
            alert('請選擇照片');
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('請選擇圖片檔案');
            return;
        }

        const photoURL = await userManager.uploadPhoto(file);
        if (photoURL) {
            alert('照片上傳成功！');
            this.hidePhotoUploadModal();
            // 重新整理網格以顯示新照片
            meetingRoom.updateParticipantGrid();
        }
    }
}

// 建立全域實例
window.meetingController = new MeetingController();

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    meetingController.init();
});
