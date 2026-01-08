// 會議室管理模組 (Supabase 版本)
class MeetingRoom {
    constructor() {
        this.meetingId = 'main-meeting';
        this.participants = {};
        this.isJoined = false;
        this.participantSubscription = null;
    }

    // 初始化
    async init() {
        if (!userManager.currentUser) {
            console.error('User not logged in');
            return;
        }

        // 訂閱參與者變化
        this.participantSubscription = supabaseClient
            .channel('participants')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'participants' },
                () => this.loadParticipants()
            )
            .subscribe();

        // 載入參與者
        await this.loadParticipants();

        // 加入會議
        await this.joinMeeting();
    }

    // 載入參與者
    async loadParticipants() {
        const { data, error } = await supabaseClient
            .from('participants')
            .select('*')
            .eq('meeting_id', this.meetingId);

        if (!error && data) {
            this.participants = {};
            data.forEach(p => {
                this.participants[p.user_id] = p;
            });
            this.updateParticipantGrid();
        }
    }

    // 加入會議
    async joinMeeting() {
        const userId = userManager.currentUser.id;
        const participantData = {
            meeting_id: this.meetingId,
            user_id: userId,
            user_name: userManager.currentUser.display_name,
            photo_url: userManager.currentUser.photo_url,
            joined_at: new Date().toISOString(),
            is_speaking: false,
            status: 'online'
        };

        const { error } = await supabaseClient
            .from('participants')
            .upsert(participantData, {
                onConflict: 'meeting_id,user_id'
            });

        if (!error) {
            this.isJoined = true;
        }

        // 離開頁面時自動退出會議
        window.addEventListener('beforeunload', () => this.leaveMeeting());
    }

    // 離開會議
    async leaveMeeting() {
        if (!this.isJoined) return;

        const userId = userManager.currentUser.id;
        await supabaseClient
            .from('participants')
            .delete()
            .eq('meeting_id', this.meetingId)
            .eq('user_id', userId);

        this.isJoined = false;
    }

    // 更新說話狀態
    async updateSpeakingStatus(isSpeaking) {
        if (!this.isJoined) return;

        const userId = userManager.currentUser.id;
        await supabaseClient
            .from('participants')
            .update({ is_speaking: isSpeaking })
            .eq('meeting_id', this.meetingId)
            .eq('user_id', userId);
    }

    // 取得參與者列表
    getParticipants() {
        return Object.values(this.participants);
    }

    // 更新參與者網格顯示
    updateParticipantGrid() {
        const participants = this.getParticipants();
        const grid = document.getElementById('participantGrid');

        if (!grid) return;

        // 計算網格佈局
        const { rows, cols } = this.calculateGridLayout(participants.length);
        grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        // 渲染參與者
        grid.innerHTML = participants.map(p => `
            <div class="participant-card ${p.is_speaking ? 'speaking' : ''}" data-uid="${p.user_id}">
                <div class="participant-photo">
                    ${p.photo_url
                ? `<img src="${p.photo_url}" alt="${p.user_name}">`
                : `<div class="photo-placeholder">${p.user_name.charAt(0)}</div>`
            }
                </div>
                <div class="participant-name">${p.user_name}</div>
            </div>
        `).join('');
    }

    // 計算網格佈局
    calculateGridLayout(count) {
        if (count <= 1) return { rows: 1, cols: 1 };
        if (count <= 4) return { rows: 2, cols: 2 };
        if (count <= 6) return { rows: 2, cols: 3 };
        if (count <= 9) return { rows: 3, cols: 3 };
        if (count <= 12) return { rows: 3, cols: 4 };
        if (count <= 16) return { rows: 4, cols: 4 };
        return { rows: 5, cols: 4 };
    }

    // 清理
    cleanup() {
        this.leaveMeeting();
        if (this.participantSubscription) {
            supabaseClient.removeChannel(this.participantSubscription);
        }
    }
}

// 建立全域實例
window.meetingRoom = new MeetingRoom();
