// 字幕管理模組 (Supabase 版本)
class CaptionManager {
    constructor() {
        this.captions = [];
        this.isExpanded = false;
        this.maxCaptions = 100;
        this.captionSubscription = null;
    }

    // 初始化
    async init() {
        // 載入最近的字幕
        await this.loadRecentCaptions();

        // 訂閱新字幕
        this.captionSubscription = supabaseClient
            .channel('captions')
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'captions',
                    filter: `meeting_id=eq.${meetingRoom.meetingId}`
                },
                (payload) => this.addCaption(payload.new)
            )
            .subscribe();

        // 綁定展開/收合按鈕
        const toggleBtn = document.getElementById('toggleCaptions');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleExpand());
        }
    }

    // 載入最近的字幕
    async loadRecentCaptions() {
        const { data, error } = await supabaseClient
            .from('captions')
            .select('*')
            .eq('meeting_id', meetingRoom.meetingId)
            .order('created_at', { ascending: false })
            .limit(this.maxCaptions);

        if (!error && data) {
            this.captions = data.reverse();
            this.updateCaptionDisplay();
        }
    }

    // 新增字幕到資料庫
    async addCaptionToFirebase(text, language = 'zh') {
        if (!userManager.currentUser || !text.trim()) return;

        const caption = {
            meeting_id: meetingRoom.meetingId,
            user_id: userManager.currentUser.id,
            user_name: userManager.currentUser.display_name,
            text: text.trim(),
            language: language,
            created_at: new Date().toISOString()
        };

        await supabaseClient
            .from('captions')
            .insert(caption);
    }

    // 顯示字幕
    addCaption(caption) {
        this.captions.push(caption);

        // 限制字幕數量
        if (this.captions.length > this.maxCaptions) {
            this.captions.shift();
        }

        this.updateCaptionDisplay();
    }

    // 更新字幕顯示
    updateCaptionDisplay() {
        const captionBar = document.getElementById('captionBar');
        const captionFull = document.getElementById('captionFull');

        if (!captionBar) return;

        // 字幕條顯示（最新 3 條）
        const recentCaptions = this.captions.slice(-3);
        captionBar.innerHTML = recentCaptions.map(c => `
            <div class="caption-item">
                <span class="caption-speaker">${c.user_name}:</span>
                <span class="caption-text">${this.escapeHtml(c.text)}</span>
            </div>
        `).join('');

        // 完整字幕顯示
        if (captionFull) {
            captionFull.innerHTML = this.captions.map(c => `
                <div class="caption-item-full">
                    <div class="caption-header">
                        <span class="caption-speaker">${c.user_name}</span>
                        <span class="caption-time">${this.formatTime(c.created_at)}</span>
                    </div>
                    <div class="caption-text">${this.escapeHtml(c.text)}</div>
                </div>
            `).join('');

            // 自動滾動到底部
            captionFull.scrollTop = captionFull.scrollHeight;
        }

        // 自動滾動字幕條
        captionBar.scrollTop = captionBar.scrollHeight;
    }

    // 展開/收合字幕
    toggleExpand() {
        this.isExpanded = !this.isExpanded;
        const captionContainer = document.getElementById('captionContainer');
        const toggleBtn = document.getElementById('toggleCaptions');

        if (captionContainer) {
            captionContainer.classList.toggle('expanded', this.isExpanded);
        }

        if (toggleBtn) {
            toggleBtn.textContent = this.isExpanded ? '收合 ▼' : '展開 ▲';
        }
    }

    // 格式化時間
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // HTML 轉義
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 清理
    cleanup() {
        if (this.captionSubscription) {
            supabaseClient.removeChannel(this.captionSubscription);
        }
    }
}

// 建立全域實例
window.captionManager = new CaptionManager();
