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
// 💡 共通：管理者モード管理システム
// ==========================================

// 管理者状態の取得
function isAdminMode() {
    return localStorage.getItem('isAdminMode') === 'true';
}

// 共通のUI更新（すべてのページの鍵アイコンを同期）
function updateGlobalAdminUI() {
    const authIcon = document.getElementById('authIcon');
    const authButton = document.getElementById('authButton');
    
    if (!authIcon) return;

    if (isAdminMode()) {
        authIcon.className = "fa-solid fa-unlock text-emerald-600";
        if (authButton) authButton.title = "管理者モード解除";
    } else {
        authIcon.className = "fa-solid fa-lock text-stone-500";
        if (authButton) authButton.title = "管理者モード";
    }

    // ページ側で個別のUI切り替えを行いたい場合用のフック
    if (typeof window.onAdminStateChanged === 'function') {
        window.onAdminStateChanged(isAdminMode());
    }
}

// 共通の認証アクション（クリック時の挙動）
function handleAuthAction() {
    if (isAdminMode()) {
        // すでに管理者ならログアウト（解除）
        localStorage.removeItem('isAdminMode');
        alert('管理者モードを終了しました');
        updateGlobalAdminUI();
        location.reload(); // 状態反映のためリロード
    } else {
        // パスワード認証（必要に応じて変更してください）
        const pass = prompt('管理者パスワードを入力してください');
        if (pass === 'your_admin_password') { // ※実際のパスワードに書き換えてください
            localStorage.setItem('isAdminMode', 'true');
            alert('管理者モードになりました（ページ移動しても維持されます）');
            updateGlobalAdminUI();
            location.reload(); // 状態反映のためリロード
        } else if (pass !== null) {
            alert('パスワードが違います');
        }
    }
}

// ページ読み込み時に自動でUIを同期
document.addEventListener('DOMContentLoaded', () => {
    updateGlobalAdminUI();
});