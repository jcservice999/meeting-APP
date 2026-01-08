// 使用者管理模組 (Supabase 版本)
class UserManager {
    constructor() {
        this.currentUser = null;
        this.allUsers = {};
        this.realtimeSubscription = null;
    }

    // 初始化
    async init() {
        // 監聽登入狀態
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                await this.handleUserLogin(session.user);
            } else {
                this.currentUser = null;
                this.showLoginPage();
            }
        });

        // 訂閱所有使用者資料變更
        this.realtimeSubscription = supabaseClient
            .channel('users')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'users' },
                () => this.loadAllUsers()
            )
            .subscribe();

        // 載入所有使用者
        await this.loadAllUsers();
    }

    // 載入所有使用者
    async loadAllUsers() {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*');

        if (!error && data) {
            this.allUsers = {};
            data.forEach(user => {
                this.allUsers[user.id] = user;
            });
            this.updateUserList();
        }
    }

    // Google 登入
    async loginWithGoogle() {
        try {
            // 取得完整的 URL 路徑（支援 GitHub Pages 子路徑）
            const baseUrl = window.location.origin + window.location.pathname.replace(/index\.html$/, '');
            const redirectUrl = baseUrl + 'meeting.html';

            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl
                }
            });

            if (error) throw error;
        } catch (error) {
            console.error('Login error:', error);
            alert('登入失敗：' + error.message);
        }
    }

    // 處理使用者登入
    async handleUserLogin(user) {
        const userId = user.id;

        // 檢查使用者是否已存在
        const { data: existingUser } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        // 檢查是否為第一位使用者
        const { count } = await supabaseClient
            .from('users')
            .select('*', { count: 'exact', head: true });

        const isFirstUser = count === 0;

        // 建立或更新使用者資料
        const userData = {
            id: userId,
            email: user.email,
            display_name: user.user_metadata?.full_name || user.email.split('@')[0],
            photo_url: user.user_metadata?.avatar_url || '',
            role: existingUser?.role || (isFirstUser ? 'admin' : 'member'),
            approved: existingUser?.approved || isFirstUser,
            created_at: existingUser?.created_at || new Date().toISOString(),
            last_seen: new Date().toISOString(),
            status: 'online'
        };

        const { error } = await supabaseClient
            .from('users')
            .upsert(userData);

        if (error) {
            console.error('Error saving user:', error);
            return;
        }

        this.currentUser = userData;

        // 如果是管理員或已批准的成員，進入會議室
        if (userData.role === 'admin' || userData.approved) {
            this.showMeetingRoom();
        } else {
            this.showWaitingApproval();
        }
    }

    // 登出
    async logout() {
        try {
            // 更新狀態為離線
            if (this.currentUser) {
                await supabaseClient
                    .from('users')
                    .update({
                        status: 'offline',
                        last_seen: new Date().toISOString()
                    })
                    .eq('id', this.currentUser.id);
            }

            await supabaseClient.auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    // 上傳使用者照片
    async uploadPhoto(file) {
        if (!this.currentUser) return null;

        try {
            const userId = this.currentUser.id;
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}.${fileExt}`;
            const filePath = `user-photos/${fileName}`;

            // 上傳檔案到 Storage
            const { error: uploadError } = await supabaseClient.storage
                .from('photos')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 取得公開 URL
            const { data } = supabaseClient.storage
                .from('photos')
                .getPublicUrl(filePath);

            const photoURL = data.publicUrl;

            // 更新使用者資料
            await supabaseClient
                .from('users')
                .update({ photo_url: photoURL })
                .eq('id', userId);

            this.currentUser.photo_url = photoURL;

            return photoURL;
        } catch (error) {
            console.error('Photo upload error:', error);
            alert('照片上傳失敗：' + error.message);
            return null;
        }
    }

    // 批准使用者加入
    async approveUser(userId) {
        if (this.currentUser?.role !== 'admin') {
            alert('您沒有權限執行此操作');
            return;
        }

        await supabaseClient
            .from('users')
            .update({ approved: true })
            .eq('id', userId);
    }

    // 拒絕使用者加入
    async rejectUser(userId) {
        if (this.currentUser?.role !== 'admin') {
            alert('您沒有權限執行此操作');
            return;
        }

        await supabaseClient
            .from('users')
            .delete()
            .eq('id', userId);
    }

    // 設定使用者為管理員
    async setAdmin(userId) {
        if (this.currentUser?.role !== 'admin') {
            alert('您沒有權限執行此操作');
            return;
        }

        await supabaseClient
            .from('users')
            .update({ role: 'admin' })
            .eq('id', userId);
    }

    // 取得所有使用者
    getAllUsers() {
        return this.allUsers;
    }

    // 取得待批准的使用者
    getPendingUsers() {
        return Object.entries(this.allUsers)
            .filter(([_, user]) => user.role === 'member' && !user.approved)
            .map(([id, user]) => ({ id, ...user }));
    }

    // 顯示登入頁面
    showLoginPage() {
        if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
    }

    // 顯示會議室
    showMeetingRoom() {
        if (!window.location.pathname.includes('meeting.html')) {
            window.location.href = 'meeting.html';
        }
    }

    // 顯示等待批准頁面
    showWaitingApproval() {
        if (!sessionStorage.getItem('waitingApprovalShown')) {
            alert('您的加入請求已送出，請等待管理員批准。');
            sessionStorage.setItem('waitingApprovalShown', 'true');
        }
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
    }

    // 更新使用者列表 UI
    updateUserList() {
        window.dispatchEvent(new CustomEvent('usersUpdated', {
            detail: { users: this.allUsers }
        }));
    }

    // 清理
    cleanup() {
        if (this.realtimeSubscription) {
            supabaseClient.removeChannel(this.realtimeSubscription);
        }
    }
}

// 建立全域實例
window.userManager = new UserManager();
