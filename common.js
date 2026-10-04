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