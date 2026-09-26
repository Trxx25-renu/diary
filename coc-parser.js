// ==========================================
// 💡 CoCテキストパーサー（キャラクターシート保管所 ＆ いあきゃら 両対応版）
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

    if (!rawText) return data;

    // 1. 名前とヨミガナの抽出
    // 例: 名前: ベアトリーチェ (Beatrice) 
    // → 名前: ベアトリーチェ、ヨミガナ: Beatrice として抽出
    const nameLineMatch = rawText.match(/(?:キャラクター名|名前|タイトル)[：:\s]\s*(.+)/);
    if (nameLineMatch) {
        let rawNamePart = nameLineMatch[1].trim();
        
        // 括弧（全角・半角）の中身をヨミガナとして取得する
        const parenMatch = rawNamePart.match(/[\(（](.*?)[\)）]/);
        if (parenMatch) {
            data.nameKana = parenMatch[1].trim();
            // メインの名前は括弧より前の部分にする
            data.name = rawNamePart.replace(/[\(（].*?[\)）]/g, '').trim();
        } else {
            data.name = rawNamePart;
        }
    }

    // 2. 職業の抽出
    const jobMatch = rawText.match(/職業[：:\s]\s*([^\s\/]+)/);
    if (jobMatch) data.occupation = jobMatch[1].trim();

    // 3. 年齢と性別の抽出
    const ageMatch = rawText.match(/年齢[：:\s]*(\d+)/);
    if (ageMatch) data.age = ageMatch[1].trim();

    const genderMatch = rawText.match(/性別[：:\s]*([^\s\/]+)/);
    if (genderMatch) {
        let gText = genderMatch[1].trim();
        if (gText.includes('女')) data.gender = "女性";
        else if (gText.includes('男')) data.gender = "男性";
        else data.gender = "不明";
    }

    // 4. 生態情報の抽出（誕生日など）
    const bdayMatch = rawText.match(/誕生日[：:\s]*([^\s\/]+)/);
    if (bdayMatch) data.birthday = bdayMatch[1].trim();

    // 5. 特徴表の抽出
    const featureMatch = rawText.match(/(?:特徴表|特徴)[：:\s【「]*(.+?)[」】\s]/);
    if (featureMatch) {
        data.feature = featureMatch[1].trim();
    }

    // 6. ステータス抽出（いあきゃら・保管所共通）
    function extractStat(key) {
        // 表形式 (例: "STR       8")
        const tableRegex = new RegExp(`\\b${key}\\b\\s+(\\d+)`, 'i');
        const tableMatch = rawText.match(tableRegex);
        if (tableMatch) return tableMatch[1];

        // 横並びやコロン形式
        const directRegex = new RegExp(`(?:【)?\\b${key}\\b(?:】)?[^\\d]*(\\d+)`, 'i');
        const directMatch = rawText.match(directRegex);
        if (directMatch) return directMatch[1];

        return "";
    }

    data.str = extractStat('STR');
    data.con = extractStat('CON');
    data.pow = extractStat('POW');
    data.dex = extractStat('DEX');
    data.app = extractStat('APP');
    data.siz = extractStat('SIZ');
    data.int = extractStat('INT');
    data.edu = extractStat('EDU');
    data.hp = extractStat('HP');

    // 正気度
    const sanMatch = rawText.match(/(?:正気度|SAN)[^\d]*(\d+)/i);
    if (sanMatch) data.san = sanMatch[1];

    // 幸運
    data.luck = extractStat('幸運') || extractStat('LUCK');

    // 7. カラーコードの抽出
    const colorMatch = rawText.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
    if (colorMatch) {
        data.colorCode = colorMatch[0];
    }

    return data;
}

// 🌐 グローバル登録
window.parseCoCText = parseCoCText;