// ==========================================
// 💡 共通処理（全ページ共通で読み込むスクリプト）
// ==========================================

// 1. ページ読み込み時に自動でローディング画面を挿入
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('app-loader')) {
        const loaderHtml = `
            <div id="app-loader" class="fixed inset-0 z-50 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center transition-opacity duration-300 pointer-events-auto">
                <div class="flex flex-col items-center gap-3">
                    <div class="w-8 h-8 border-3 border-stone-800 border-t-transparent rounded-full animate-spin" style="border-color: var(--theme-color, #292524); border-top-color: transparent;"></div>
                    <span class="text-xs font-bold text-stone-600 tracking-wider">読み込み中...</span>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('afterbegin', loaderHtml);
    }
});

// 2. データの準備が完了したときにローディングを非表示にする関数
function hideAppLoader() {
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => {
            loader.remove(); // 要素自体を削除
        }, 300);
    }
}

// ==========================================
// 🛡️ 権限チェック＆管理者UI一括管理システム (完全版)
// ==========================================

// 1. 起動時に localStorage から状態と保存パスコードを復元
window.isAdmin = localStorage.getItem('isAdminMode') === 'true';
window.storedPasscode = localStorage.getItem('adminStoredPasscode') || '';

let pendingAction = null;

// 権限が必要な処理のラッパー
function checkAdminPermission(callback) {
    if (window.isAdmin) {
        callback();
    } else {
        pendingAction = callback;
        openAuthModal();
    }
}
window.checkAdminPermission = checkAdminPermission;

// 共通のUI更新（すべてのページの鍵アイコン・admin-only要素を同期）
function updateAdminUI() {
    // ヘッダーのボタン（IDが headerKeyBtn または authButton の両方に対応）
    const keyBtn = document.getElementById('headerKeyBtn') || document.getElementById('authButton');
    const authIcon = document.getElementById('authIcon');

    if (keyBtn) {
        if (window.isAdmin) {
            keyBtn.className = "text-emerald-600 hover:text-stone-800 transition-colors p-2 text-base";
            if (authIcon) authIcon.className = "fa-solid fa-unlock text-emerald-600";
            keyBtn.title = "管理者モード（クリックでログアウト）";
        } else {
            keyBtn.className = "text-stone-600 hover:text-stone-800 transition-colors p-2 text-base";
            if (authIcon) authIcon.className = "fa-solid fa-lock text-stone-500";
            keyBtn.title = "管理者ログイン";
        }
    }

    // .admin-only クラスの表示・非表示切り替え
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        if (window.isAdmin) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    // ページごとのカスタムフック呼び出し
    if (typeof window.onAdminStateChanged === 'function') {
        window.onAdminStateChanged(window.isAdmin);
    }
}
window.updateAdminUI = updateAdminUI;

// 🔑 鍵ボタンが押されたときの入口
function handleHeaderKeyClick() {
    if (typeof openAuthModal === 'function') {
        openAuthModal();
    } else {
        console.error("❌ openAuthModal が定義されていません");
    }
}
window.handleHeaderKeyClick = handleHeaderKeyClick;
window.handleAuthAction = handleHeaderKeyClick; // 互換性のため両方対応

// ログアウト処理
function logoutAdmin() {
    const doLogout = () => {
        window.isAdmin = false;
        localStorage.removeItem('isAdminMode');
        if (window.GIST_CONFIG) {
            window.GIST_CONFIG.token = '';
        }
        updateAdminUI();
        if (typeof showToast === 'function') {
            showToast('ログアウトしました', 'info');
        } else {
            alert('ログアウトしました');
        }
        location.reload();
    };

    if (typeof showConfirm === 'function') {
        showConfirm('ログアウト', '管理者モードからログアウトしますか？', doLogout);
    } else {
        if (confirm('管理者モードからログアウトしますか？')) {
            doLogout();
        }
    }
}
window.logoutAdmin = logoutAdmin;

// ==========================================
// 🔑 パスコード検証関数
// ==========================================
function verifyPasscode() {
    const passInput = document.getElementById('inputPasscode') || document.getElementById('passcode') || document.getElementById('authPassword');
    const err = document.getElementById('authErrorMsg');
    const enteredValue = passInput ? passInput.value.trim() : '';

    if (err) err.classList.add('hidden');

    // 初回パスコード設定
    if (!window.storedPasscode) {
        if (!enteredValue) {
            if (err) {
                err.textContent = 'パスコードを入力してください';
                err.classList.remove('hidden');
            }
            return;
        }
        window.storedPasscode = enteredValue;
        localStorage.setItem('adminStoredPasscode', enteredValue);
        
        window.isAdmin = true;
        localStorage.setItem('isAdminMode', 'true');
        
        updateAdminUI();
        if (typeof showToast === 'function') showToast('初期パスコードを設定しました', 'success');
        closeAuthModal();

        if (typeof pendingAction === 'function') {
            const action = pendingAction;
            pendingAction = null;
            action();
        }
        return;
    }

    // パスコード照合
    if (enteredValue === window.storedPasscode) {
        window.isAdmin = true;
        localStorage.setItem('isAdminMode', 'true');
        
        updateAdminUI();
        if (typeof showToast === 'function') showToast('管理者ログインしました', 'success');
        closeAuthModal();

        if (typeof pendingAction === 'function') {
            const action = pendingAction;
            pendingAction = null;
            action();
        }
    } else {
        if (err) {
            err.textContent = 'パスコードが違います';
            err.classList.remove('hidden');
        }
        if (passInput) {
            passInput.value = '';
            passInput.focus();
        }
    }
}
window.verifyPasscode = verifyPasscode;

// ==========================================
// 🔑 パスコード入力モーダルを開く
// ==========================================
function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (!modal) {
        console.error("❌ #authModal が見つかりません");
        return;
    }

    if (window.isAdmin) {
        logoutAdmin();
        return;
    }

    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '99999';

    modal.classList.remove('opacity-0', 'pointer-events-none', 'hidden');
    modal.classList.add('opacity-100');
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';

    const innerDiv = modal.firstElementChild;
    if (innerDiv) {
        innerDiv.classList.remove('scale-95');
        innerDiv.classList.add('scale-100');
        innerDiv.style.transform = 'scale(1)';
        innerDiv.style.opacity = '1';
    }

    const passInput = document.getElementById('inputPasscode') || modal.querySelector('input');
    if (passInput) {
        passInput.value = '';
        setTimeout(() => passInput.focus(), 50);
    }
}
window.openAuthModal = openAuthModal;

// ==========================================
// 🔒 パスコード入力モーダルを閉じる
// ==========================================
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.style.display = 'none';
        
        const innerDiv = modal.firstElementChild;
        if (innerDiv) {
            innerDiv.classList.remove('scale-100');
            innerDiv.classList.add('scale-95');
            innerDiv.style.transform = '';
            innerDiv.style.opacity = '';
        }
    }
}
window.closeAuthModal = closeAuthModal;

// ページ読み込み時に自動でUIを同期
document.addEventListener('DOMContentLoaded', () => {
    updateAdminUI();
});