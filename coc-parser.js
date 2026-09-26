// ==========================================
// 💡 CoCテキストパーサー（キャラクターシート保管所完全対応版）
// ==========================================
function parseCoCText(rawText) {
    let data = {
        name: "",
        nameKana: "",
        age: "",
        gender: "不明",
        birthday: "",
        colorCode: "#70b5ff",
        occupation: "",
        feature: "なし",
        str: "", con: "", pow: "", dex: "",
        app: "", siz: "", int: "", edu: "",
        hp: "", san: "", luck: ""
    };

    // 1. 名前とひらがなヨミガナの抽出
    // 例: キャラクター名：天城 翼(あまぎ つばさ) または タイトル：天城 翼
    const nameLineMatch = rawText.match(/(?:キャラクター名|名前|タイトル)[：:]\s*(.+)/);
    if (nameLineMatch) {
        let rawNamePart = nameLineMatch[1].trim();
        const kanaMatch = rawNamePart.match(/[\(（]([あ-んー  ]+)[\)）]/);
        if (kanaMatch) {
            data.nameKana = kanaMatch[1].trim();
            data.name = rawNamePart.replace(/[\(（].*?[\)）]/g, '').trim();
        } else {
            data.name = rawNamePart;
        }
    }

    // 2. 職業の抽出（「職業：写真家」など）
    const jobMatch = rawText.match(/職業[：:]\s*([^\s\/]+)/);
    if (jobMatch) data.occupation = jobMatch[1].trim();

    // 3. 年齢と性別の抽出（「年齢：25 / 性別：女」の並びに対応）
    const ageMatch = rawText.match(/年齢[：:]\s*(\d+)/);
    if (ageMatch) data.age = ageMatch[1].trim();

    const genderMatch = rawText.match(/性別[：:]\s*([^\s\/]+)/);
    if (genderMatch) {
        let gText = genderMatch[1].trim();
        if (gText.includes('女')) data.gender = "女性";
        else if (gText.includes('男')) data.gender = "男性";
        else data.gender = "不明";
    }

    // 4. 特徴表の抽出（「特徴表【不屈の精神力】」など）
    const featureMatch = rawText.match(/(?:特徴表|特徴)[：:\s【「]*(.+?)[」】\s]/);
    if (featureMatch) {
        data.feature = featureMatch[1].trim();
    }

    // 5. ステータス（STR〜EDU）の抽出
    // 保管所形式の表（キーの行と、数字が並ぶ行が別になっているパターン）に対応
    function extractStat(key) {
        // キーワード（例: STR）を探し、その周辺または表の構造から数字を拾う
        // パターンA: 横に直接数字がある場合
        const directRegex = new RegExp(`${key}[^\\d]*(\\d+)`, 'i');
        const directMatch = rawText.match(directRegex);
        if (directMatch) return directMatch[1];
        
        return "";
    }

    // 基本ステータス8種
    data.str = extractStat('STR');
    data.con = extractStat('CON');
    data.pow = extractStat('POW');
    data.dex = extractStat('DEX');
    data.app = extractStat('APP');
    data.siz = extractStat('SIZ');
    data.int = extractStat('INT');
    data.edu = extractStat('EDU');

    // 6. カラーコード（#つき）
    const colorMatch = rawText.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
    if (colorMatch) {
        data.colorCode = colorMatch[0];
    }

    return data;
}

// 🌐 グローバル登録
window.parseCoCText = parseCoCText;window.parseCoCText = parseCoCText;window.parseCoCText = parseCoCText;