// ==========================================
// 💡 共通処理：ローダー管理 ＆ スマート・データローディング
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

// ローダーを安全に消す関数
function hideAppLoader() {
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => {
            loader.remove();
        }, 300);
    }
}

// 2. 💡 ちらつきを完全になくした「いい塩梅」のデータ読み込み関数
async function loadCharactersFromLocal() {
    let hasLocalData = false;

    // A. まずローカルストレージを確認
    try {
        const saved = localStorage.getItem('local_characters');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                window.characters = parsed;
                if (typeof normalizeCharacterStats === 'function') {
                    normalizeCharacterStats();
                }
                hasLocalData = true;
                console.log(`📂 ローカルキャッシュから ${window.characters.length}件 を即座にロードしました`);
            }
        }
    } catch (e) {
        console.warn('ローカル読み込みエラー', e);
    }

    // B. ローカルデータがある場合は、すぐに描画してローダーを消す（0件の瞬間を作らない！）
    if (hasLocalData) {
        if (typeof handleHashRoute === 'function') {
            handleHashRoute();
        }
        hideAppLoader();
    }

    // C. 裏側（またはローカルがない場合はローダーを出したまま）でFirestoreから最新データを取得
    try {
        const charDocRef = doc(db, 'artifacts', window.appId, 'public', 'data', 'characters', 'master');
        const charSnap = await getDoc(charDocRef);
        
        if (charSnap.exists() && charSnap.data().list) {
            const remoteList = charSnap.data().list;
            
            // ローカルがなかった場合、あるいはデータ数・内容が違う場合のみ更新して再描画
            const localString = localStorage.getItem('local_characters');
            const remoteString = JSON.stringify(remoteList);

            if (!hasLocalData || localString !== remoteString) {
                window.characters = remoteList;
                if (typeof normalizeCharacterStats === 'function') {
                    normalizeCharacterStats();
                }
                localStorage.setItem('local_characters', remoteString);
                console.log('📂 Firestoreの最新データと同期しました');

                if (typeof handleHashRoute === 'function') {
                    handleHashRoute();
                }
            }
        }
    } catch (e) {
        console.warn('⚠️ Firestoreからのデータ同期に失敗しましたが、ローカルデータで継続します', e);
    }

    // D. もしローカルデータが最初からなくて、Firestoreの取得にも時間がかかった場合の保険（ローダーを必ず消す）
    hideAppLoader();
}



// ==========================================
// 🛡️ 権限チェック＆管理者UI一括管理システム (修復版)
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
    const keyBtn = document.getElementById('headerKeyBtn') || document.getElementById('authButton');
    const authIcon = document.getElementById('authIcon');

    if (keyBtn) {
        if (window.isAdmin) {
            keyBtn.className = "text-emerald-600 hover:text-stone-800 transition-colors p-2 text-base";
            if (authIcon) {
                // 輪っかが外れた「開いた鍵」アイコン＆緑色
                authIcon.className = "fa-solid fa-lock-open text-emerald-600";
            }
            keyBtn.title = "管理者モード（クリックでログアウト）";
        } else {
            keyBtn.className = "text-stone-600 hover:text-stone-800 transition-colors p-2 text-base";
            if (authIcon) {
                // 閉じた鍵アイコン＆通常の石色
                authIcon.className = "fa-solid fa-lock text-stone-500";
            }
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

// 🔑 ヘッダーの鍵ボタンが押されたときの入口（一番安全な切り分け）
function handleHeaderKeyClick() {
    if (window.isAdmin) {
        // すでにログイン中なら、クリックでログアウト確認を出す
        logoutAdmin();
    } else {
        // ログアウト中なら認証モーダルを開く
        openAuthModal();
    }
}
window.handleHeaderKeyClick = handleHeaderKeyClick;
window.handleAuthAction = handleHeaderKeyClick; // 互換性のため両方対応

// 🔑 パスコード検証関数
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

// 🔑 パスコード入力モーダルを開く関数（上寄り配置・レイアウト保持版）
function openAuthModal() {
    // すでに管理者ログイン中なら、直接ログアウト確認を走らせる
    if (window.isAdmin) {
        if (typeof logoutAdmin === 'function') {
            logoutAdmin();
        }
        return;
    }

    const modal = document.getElementById('authModal');
    if (!modal) {
        console.error("❌ #authModal が見つかりません");
        return;
    }

    // 中央配置（items-center）を避け、上寄り（items-start pt-16）に設定して表示する
    modal.classList.remove('hidden', 'opacity-0', 'pointer-events-none', 'items-center');
    modal.classList.add('flex', 'items-start', 'pt-16', 'opacity-100', 'pointer-events-auto');
    modal.style.display = 'flex';
    modal.style.zIndex = '99999';

    // 中身の箱のアニメーション調整
    const innerDiv = modal.firstElementChild;
    if (innerDiv) {
        innerDiv.classList.remove('scale-95');
        innerDiv.classList.add('scale-100');
    }

    // 入力欄にフォーカス
    const passInput = document.getElementById('inputPasscode') || modal.querySelector('input');
    if (passInput) {
        passInput.value = '';
        setTimeout(() => passInput.focus(), 50);
    }
}
window.openAuthModal = openAuthModal;

// モーダルを閉じる関数（もし定義されていなければ念のため用意）
if (typeof closeAuthModal !== 'function') {
    function closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('flex', 'opacity-100', 'pointer-events-auto');
            modal.classList.add('hidden', 'opacity-0', 'pointer-events-none');
            modal.style.display = 'none';
        }
    }
    window.closeAuthModal = closeAuthModal;
}

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
// 🔑 パスコード入力モーダルを開く（コンパクト・中央配置版）
// ==========================================
function openAuthModal() {
    // すでに管理者ログイン中なら、ここから直接ログアウト確認を走らせる
    if (window.isAdmin) {
        if (typeof logoutAdmin === 'function') {
            logoutAdmin();
        }
        return;
    }

    const modal = document.getElementById('authModal');
    if (!modal) {
        console.error("❌ #authModal が見つかりません");
        return;
    }

    // モーダルの全体背景（画面中央にしっかり配置）
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.zIndex = '99999';

    // 縦長になってしまう原因だった余計なスタイルを外し、Tailwindのflex中央寄せを確実に適用
    modal.className = "fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999] transition-opacity duration-200 opacity-100 pointer-events-auto";
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';

    const innerDiv = modal.firstElementChild;
    if (innerDiv) {
        // 中身の箱が引き伸ばされないよう、最大幅とコンパクトなパディングを設定
        innerDiv.className = "bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl transform scale-100 transition-transform duration-200";
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

// ==========================================
// ⚙️ ポータル設定保存時のパスコード変更連動関数
// ==========================================
function savePortalSettings() {
    // 💡 1. パスコード入力欄（#inputAdminPass）の値を確認
    const passInput = document.getElementById('inputAdminPass');
    if (passInput) {
        const newPass = passInput.value.trim();
        // 何か入力されている場合のみパスコードを上書き更新
        if (newPass !== '') {
            window.storedPasscode = newPass;
            localStorage.setItem('adminStoredPasscode', newPass);
            console.log('🔑 管理者パスコードが更新されました');
        }
    }

    // --- 2. その他の設定保存処理（必要に応じてここに記述・拡張） ---
    const portalTitleInput = document.getElementById('inputPortalTitle');
    if (portalTitleInput) {
        const portalTitle = portalTitleInput.value.trim();
        if (portalTitle) {
            localStorage.setItem('portalTitle', portalTitle);
        }
    }

    // --- 3. 完了通知 ＆ モーダルを閉じる ---
    if (typeof closeEditModal === 'function') {
        closeEditModal();
    } else {
        const editModal = document.getElementById('editModal');
        if (editModal) editModal.style.display = 'none';
    }

    if (typeof showToast === 'function') {
        showToast('設定を保存しました', 'success');
    } else {
        alert('設定を保存しました');
    }

    // 画面のタイトルなどを即座に反映させたい場合のフック
    if (typeof window.onPortalSettingsSaved === 'function') {
        window.onPortalSettingsSaved();
    }
}
window.savePortalSettings = savePortalSettings;

// ページ読み込み時に自動でUIを同期
document.addEventListener('DOMContentLoaded', () => {
    updateAdminUI();

    // 設定モーダルのパスコード入力欄に、現在保存されているパスコードをプレースホルダーや初期値として出したい場合はここで行えます
    const passInput = document.getElementById('inputAdminPass');
    if (passInput && window.storedPasscode) {
        passInput.placeholder = '変更する場合のみ入力';
    }
});