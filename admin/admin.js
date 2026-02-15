// Admin Panel JavaScript
let currentTab = 'dashboard';
let autoRefreshInterval = null;

// API Helper
async function apiCall(endpoint, options = {}) {
    const res = await fetch(`/api${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        credentials: 'include'
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-message">${escapeHtml(message)}</div>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Date Formatting
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// Tab Switching
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.dataset.tab;
        switchTab(tab);
    });
});

function switchTab(tab) {
    currentTab = tab;
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tab);
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tab}`);
    });
    
    // Update title
    const titles = {
        dashboard: 'Dashboard',
        siem: 'SIEM Events',
        users: 'User Management',
        ipbans: 'IP Ban Management',
        keys: 'Access Keys',
        threads: 'Thread Management'
    };
    document.getElementById('pageTitle').textContent = titles[tab];
    
    // Load data
    loadTabData(tab);
}

// Load Tab Data
async function loadTabData(tab) {
    try {
        switch(tab) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'siem':
                await loadSiemEvents();
                break;
            case 'users':
                await loadUsers();
                break;
            case 'ipbans':
                await loadIpBans();
                break;
            case 'keys':
                await loadKeys();
                break;
            case 'threads':
                await loadThreads();
                break;
        }
    } catch (err) {
        console.error('Error loading tab data:', err);
        showToast(err.message, 'error');
    }
}

// Dashboard
async function loadDashboard() {
    try {
        const [stats, siem] = await Promise.all([
            apiCall('/admin/stats'),
            apiCall('/admin/siem?limit=10')
        ]);
        
        document.getElementById('stat-total-events').textContent = stats.totalEvents || 0;
        document.getElementById('stat-high-events').textContent = stats.highSeverityEvents || 0;
        document.getElementById('stat-users').textContent = stats.totalUsers || 0;
        document.getElementById('stat-bans').textContent = stats.totalBans || 0;
        
        // Update SIEM badge
        document.getElementById('siemBadge').textContent = stats.totalEvents || 0;
        
        // Render recent events
        const container = document.getElementById('recentEvents');
        if (siem.events.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No recent events</div>';
        } else {
            container.innerHTML = siem.events.map(event => `
                <div class="event-item">
                    <div class="event-info">
                        <div class="event-type">
                            <span class="severity-badge severity-${event.severity}">${event.severity.toUpperCase()}</span>
                            ${escapeHtml(event.event_type)}
                        </div>
                        <div class="event-details">
                            ${event.username || 'Unknown'} • ${event.ip_address || 'N/A'}
                        </div>
                    </div>
                    <div class="event-time">${formatRelativeTime(event.created_at)}</div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

// SIEM Events
async function loadSiemEvents() {
    try {
        const severity = document.getElementById('siemSeverity')?.value || '';
        const params = severity ? `?severity=${severity}` : '';
        const data = await apiCall(`/admin/siem${params}`);
        
        const tbody = document.getElementById('siemTable');
        if (data.events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 40px;">No events found</td></tr>';
        } else {
            tbody.innerHTML = data.events.map(event => `
                <tr>
                    <td>${formatDate(event.created_at)}</td>
                    <td><span class="severity-badge severity-${event.severity}">${event.severity.toUpperCase()}</span></td>
                    <td>${escapeHtml(event.event_type)}</td>
                    <td>${event.username || 'N/A'}</td>
                    <td><code>${event.ip_address || 'N/A'}</code></td>
                    <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(event.details || '')}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading SIEM events:', err);
    }
}

async function clearSiemEvents() {
    if (!confirm('Are you sure you want to clear all SIEM events?')) return;
    
    try {
        await apiCall('/admin/siem', { method: 'DELETE' });
        showToast('SIEM events cleared', 'success');
        loadSiemEvents();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Users
async function loadUsers() {
    try {
        const users = await apiCall('/admin/users');
        const tbody = document.getElementById('usersTable');
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td><strong>${escapeHtml(user.username)}</strong></td>
                <td>${escapeHtml(user.email)}</td>
                <td><span class="role-badge role-${user.is_admin ? 'admin' : 'user'}">${user.is_admin ? 'Admin' : 'User'}</span></td>
                <td><span class="status-badge status-${user.is_banned ? 'banned' : 'active'}">${user.is_banned ? 'Banned' : 'Active'}</span></td>
                <td>${formatDate(user.created_at)}</td>
                <td>
                    <button class="btn-small ${user.is_banned ? '' : 'danger'}" onclick="toggleUserBan(${user.id}, ${user.is_banned})">
                        ${user.is_banned ? 'Unban' : 'Ban'}
                    </button>
                    ${!user.is_admin ? `<button class="btn-small" onclick="makeAdmin(${user.id})">Make Admin</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading users:', err);
    }
}

function showCreateUserModal() {
    document.getElementById('createUserModal').classList.add('active');
}

async function createUser(e) {
    e.preventDefault();
    
    try {
        const username = document.getElementById('newUsername').value.trim();
        const email = document.getElementById('newEmail').value.trim();
        const password = document.getElementById('newPassword').value;
        const isAdmin = document.getElementById('newIsAdmin').checked;
        
        await apiCall('/admin/users', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, isAdmin })
        });
        
        showToast('User created successfully', 'success');
        closeModal('createUserModal');
        loadUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function toggleUserBan(userId, isBanned) {
    try {
        await apiCall(`/admin/users/${userId}/ban`, {
            method: 'PUT',
            body: JSON.stringify({ banned: !isBanned })
        });
        
        showToast(isBanned ? 'User unbanned' : 'User banned', 'success');
        loadUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function makeAdmin(userId) {
    if (!confirm('Make this user an admin?')) return;
    
    try {
        await apiCall(`/admin/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ isAdmin: true })
        });
        
        showToast('User promoted to admin', 'success');
        loadUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// IP Bans
async function loadIpBans() {
    try {
        const bans = await apiCall('/admin/ipbans');
        const tbody = document.getElementById('ipbansTable');
        
        if (bans.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 40px;">No IP bans</td></tr>';
        } else {
            tbody.innerHTML = bans.map(ban => `
                <tr>
                    <td><code>${escapeHtml(ban.ip_address)}</code></td>
                    <td>${escapeHtml(ban.reason || 'N/A')}</td>
                    <td>${escapeHtml(ban.banned_by_username || 'System')}</td>
                    <td>${formatDate(ban.created_at)}</td>
                    <td>${ban.expires_at ? formatDate(ban.expires_at) : '<span style="color: var(--danger)">Permanent</span>'}</td>
                    <td>
                        <button class="btn-small danger" onclick="unbanIp(${ban.id})">Remove</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading IP bans:', err);
    }
}

function showBanIpModal() {
    document.getElementById('banIpModal').classList.add('active');
}

async function banIp(e) {
    e.preventDefault();
    
    try {
        const ipAddress = document.getElementById('banIpAddress').value.trim();
        const reason = document.getElementById('banReason').value.trim();
        const duration = parseInt(document.getElementById('banDuration').value);
        
        let expiresAt = null;
        if (duration > 0) {
            expiresAt = Date.now() + (duration * 3600000); // hours to milliseconds
        }
        
        await apiCall('/admin/ipbans', {
            method: 'POST',
            body: JSON.stringify({ ipAddress, reason, expiresAt })
        });
        
        showToast('IP banned successfully', 'success');
        closeModal('banIpModal');
        loadIpBans();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function unbanIp(banId) {
    if (!confirm('Remove this IP ban?')) return;
    
    try {
        await apiCall(`/admin/ipbans/${banId}`, { method: 'DELETE' });
        showToast('IP ban removed', 'success');
        loadIpBans();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Access Keys
async function loadKeys() {
    try {
        const keys = await apiCall('/admin/keys');
        const tbody = document.getElementById('keysTable');
        
        if (keys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 40px;">No access keys</td></tr>';
        } else {
            tbody.innerHTML = keys.map(key => `
                <tr>
                    <td><code style="font-weight: 600;">${escapeHtml(key.key_code)}</code></td>
                    <td><span class="status-badge status-${key.used_by ? 'used' : 'active'}">${key.used_by ? 'Used' : 'Active'}</span></td>
                    <td>${key.used_by ? escapeHtml(key.used_by_username) : 'N/A'}</td>
                    <td>${formatDate(key.created_at)}</td>
                    <td>${key.used_at ? formatDate(key.used_at) : 'N/A'}</td>
                    <td>
                        <button class="btn-small danger" onclick="deleteKey(${key.id})">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading keys:', err);
    }
}

async function generateKeys() {
    try {
        const count = parseInt(document.getElementById('keyCount').value);
        if (!count || count < 1 || count > 50) {
            showToast('Enter a number between 1 and 50', 'error');
            return;
        }
        
        const data = await apiCall('/admin/keys/generate', {
            method: 'POST',
            body: JSON.stringify({ count })
        });
        
        showToast(`${data.keys.length} keys generated!`, 'success');
        loadKeys();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteKey(keyId) {
    if (!confirm('Delete this access key?')) return;
    
    try {
        await apiCall(`/admin/keys/${keyId}`, { method: 'DELETE' });
        showToast('Key deleted', 'success');
        loadKeys();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Threads
async function loadThreads() {
    try {
        const threads = await apiCall('/admin/threads');
        const tbody = document.getElementById('threadsTable');
        
        if (threads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 40px;">No threads</td></tr>';
        } else {
            tbody.innerHTML = threads.map(thread => `
                <tr>
                    <td>${thread.id}</td>
                    <td style="max-width: 300px;">
                        <strong>${escapeHtml(thread.title)}</strong>
                        ${thread.is_private ? ' <span class="status-badge status-used">PRIVATE</span>' : ''}
                    </td>
                    <td>${escapeHtml(thread.author)}</td>
                    <td>${thread.views}</td>
                    <td>${formatDate(thread.created_at)}</td>
                    <td>
                        <button class="btn-small danger" onclick="deleteThread(${thread.id})">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading threads:', err);
    }
}

async function deleteThread(threadId) {
    if (!confirm('Delete this thread? This action cannot be undone.')) return;
    
    try {
        await apiCall(`/admin/threads/${threadId}`, { method: 'DELETE' });
        showToast('Thread deleted', 'success');
        loadThreads();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Modal Management
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Click outside modal to close
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Refresh Current Tab
function refreshCurrentTab() {
    loadTabData(currentTab);
    showToast('Refreshed', 'success');
}

// Export functions to global scope
window.refreshCurrentTab = refreshCurrentTab;
window.loadSiemEvents = loadSiemEvents;
window.clearSiemEvents = clearSiemEvents;
window.showCreateUserModal = showCreateUserModal;
window.createUser = createUser;
window.toggleUserBan = toggleUserBan;
window.makeAdmin = makeAdmin;
window.showBanIpModal = showBanIpModal;
window.banIp = banIp;
window.unbanIp = unbanIp;
window.generateKeys = generateKeys;
window.deleteKey = deleteKey;
window.deleteThread = deleteThread;
window.closeModal = closeModal;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    
    // Auto-refresh every 30 seconds
    autoRefreshInterval = setInterval(() => {
        if (currentTab === 'dashboard' || currentTab === 'siem') {
            loadTabData(currentTab);
        }
    }, 30000);
});
