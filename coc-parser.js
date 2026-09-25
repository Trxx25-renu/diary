// CoCのテキストから主要ステータスとカラーコードを抽出する関数
function parseCoCText(rawText) {
    // 抽出結果を入れるオブジェクト
    let data = {
        name: "",
        str: "", con: "", pow: "", dex: "",
        app: "", siz: "", int: "", edu: "",
        hp: "", san: "", luck: "",
        colorCode: "#70b5ff" // デフォルトカラー
    };

    // 1. キャラクター名の抽出（例: 「名前：〇〇」や1行目などを想定）
    const nameMatch = rawText.match(/(?:名前|PC名)[：:]\s*(.+)/);
    if (nameMatch) data.name = nameMatch[1].trim();

    // 2. ステータス抽出用のヘルパー関数（「STR」や「筋力」などの表記ゆれに対応）
    function extractStat(keys) {
        for (let key of keys) {
            // 例: "STR" または "STR: 15" や "STR[15]" などのパターンをキャッチ
            const regex = new RegExp(`${key}[^\d]*(\d+)`, 'i');
            const match = rawText.match(regex);
            if (match) return match[1];
        }
        return "";
    }

    data.str = extractStat(['STR', '筋力']);
    data.con = extractStat(['CON', '体質']);
    data.pow = extractStat(['POW', '精神力']);
    data.dex = extractStat(['DEX', '敏捷']);
    data.app = extractStat(['APP', '外見']);
    data.siz = extractStat(['SIZ', '体格']);
    data.int = extractStat(['INT', 'アイデア']);
    data.edu = extractStat(['EDU', '教育']);
    
    data.hp = extractStat(['HP', '体力', '耐久力']);
    data.san = extractStat(['SAN', '正気度']);
    data.luck = extractStat(['幸運', 'LUCK']);

    // 3. カラーコードの抽出（例: 「#ff0000」や「カラー: #fff」のような記述があれば拾う）
    const colorMatch = rawText.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
    if (colorMatch) {
        data.colorCode = colorMatch[0];
    }

    return data;
}