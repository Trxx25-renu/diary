// ==========================================
// 💡 CoCテキストパーサー（共通＆固有項目・柔軟抽出版）
// ==========================================
function parseCoCText(rawText) {
    let data = {
        // --- 共通項目 ---
        name: "",
        nameKana: "",
        age: "",
        gender: "不明",       // 「女性」「男性」「不明」の3種
        birthday: "",        // 「◎月◎日」表記
        colorCode: "#70b5ff", // デフォルトカラー
        
        // --- CoC固有項目 ---
        occupation: "",
        feature: "なし",      // 未設定は「なし」
        
        // --- 8大ステータス (数字入力) ---
        str: "", con: "", pow: "", dex: "",
        app: "", siz: "", int: "", edu: "",
        
        // --- 予備 (将来用) ---
        hp: "", san: "", luck: ""
    };

    // 1. 名前とひらがなヨミガナの抽出
    const nameLineMatch = rawText.match(/(?:キャラクター名|名前)[：:]\s*(.+)/);
    if (nameLineMatch) {
        let rawNamePart = nameLineMatch[1].trim();
        const kanaMatch = rawNamePart.match(/[\(（]([あ-んー  ]+)[\)）]/);
        if (kanaMatch) {
            data.nameKana = kanaMatch[1].trim();
            data.name = rawNamePart.replace(/[\(（].*?[\)）]/g, '').trim();
        } else {
            data.name = rawNamePart;
        }
    } else {
        const titleMatch = rawText.match(/タイトル[：:]\s*(.+)/);
        if (titleMatch) data.name = titleMatch[1].trim();
    }

    // 2. 共通項目：年齢・性別・誕生日
    const ageMatch = rawText.match(/年齢[：:]\s*(\d+)/);
    if (ageMatch) data.age = ageMatch[1].trim();

    const genderMatch = rawText.match(/性別[：:]\s*([^\s\/]+)/);
    if (genderMatch) {
        let gText = genderMatch[1].trim();
        if (gText.includes('女')) {
            data.gender = "女性";
        } else if (gText.includes('男')) {
            data.gender = "男性";
        } else {
            data.gender = "不明";
        }
    }

    // 誕生日パターン（例: 5月15日、０５月１５日 など）
    const bdayMatch = rawText.match(/(?:誕生日|生年月日)[：:]\s*([0-9０-９]+月\s*[0-9０-９]+日)/);
    if (bdayMatch) {
        data.birthday = bdayMatch[1].trim();
    } else {
        // テキスト全体から「○月○日」のパターンを探す場合
        const genericDateMatch = rawText.match(/([1-12１-１２]月\s*[1-31１-３１]日)/);
        if (genericDateMatch) {
            data.birthday = genericDateMatch[1].trim();
        }
    }

    // 3. CoC固有項目：職業
    const jobMatch = rawText.match(/職業[：:]\s*([^\s\/]+)/);
    if (jobMatch) data.occupation = jobMatch[1].trim();

    // CoC固有項目：特徴表（例: 特徴表【〜】 または 特徴：〜）
    const featureMatch = rawText.match(/(?:特徴表|特徴)[：:\s【「]*(.+?)[」】\s]/);
    if (featureMatch) {
        data.feature = featureMatch[1].trim();
    }

    // 4. 8大ステータス（STRからEDUまで）の抽出
    function extractStat(keys) {
        for (let key of keys) {
            const regex = new RegExp(`${key}[^\\d]*(\\d+)`, 'i');
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
    
    // 予備データ
    data.hp = extractStat(['HP', '体力', '耐久力']);
    data.san = extractStat(['SAN', '正気度']);
    data.luck = extractStat(['幸運', 'LUCK']);

    // 5. 共通項目：カラーコード（#つきの安全なものだけ）
    const colorMatch = rawText.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
    if (colorMatch) {
        data.colorCode = colorMatch[0];
    }

    return data;
}

// 🌐 グローバル登録
window.parseCoCText = parseCoCText;window.parseCoCText = parseCoCText;