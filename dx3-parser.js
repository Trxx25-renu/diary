// ==========================================
// 💡 ダブルクロス (DX3rd) テキストパーサー
// ==========================================
function parseDX3Text(rawText) {
    let data = {
        name: "",
        nameKana: "",
        codeName: "",
        codeNameKana: "",
        age: "",
        gender: "不明",
        occupation: "", // ワークスまたはカヴァー
        birthday: "",
        colorCode: "#f43f5e" // デフォルトテーマカラー
    };

    if (!rawText) return data;

    // 1. 名前とヨミガナの抽出 (例: 宝生 スピナ / 括弧書き、または PC：行)
    const nameLineMatch = rawText.match(/(?:キャラクター名|名前|タイトル)[：:\s]\s*(.+)/);
    if (nameLineMatch) {
        let rawNamePart = nameLineMatch[1].trim();
        const parenMatch = rawNamePart.match(/[\(（](.*?)[\)）]/);
        if (parenMatch) {
            data.nameKana = parenMatch[1].trim();
            data.name = rawNamePart.replace(/[\(（].*?[\)）]/g, '').trim();
        } else {
            data.name = rawNamePart;
        }
    }

    // 「■その他■」の PC：行（例: PC：ほうしょう すぴな）から読み仮名を補完
    const pcKanaMatch = rawText.match(/PC[：:\s]+([^\r\n]+)/);
    if (pcKanaMatch && !data.nameKana) {
        data.nameKana = pcKanaMatch[1].trim();
    }

    // 2. コードネーム（二つ名）とヨミガナの抽出
    const codeNameMatch = rawText.match(/コードネーム[：:\s]\s*(.+)/);
    if (codeNameMatch) {
        let rawCodePart = codeNameMatch[1].trim();
        const parenMatch = rawCodePart.match(/[\(（](.*?)[\)）]/);
        if (parenMatch) {
            data.codeNameKana = parenMatch[1].trim();
            data.codeName = rawCodePart.replace(/[\(（].*?[\)）]/g, '').trim();
        } else {
            data.codeName = rawCodePart;
        }
    }

    // 「■その他■」の CN：行（例: CN：“Spinel” スピネル）から補完
    const cnMatch = rawText.match(/CN[：:\s]+([^\r\n]+)/);
    if (cnMatch) {
        let cnText = cnMatch[1].trim();
        if (!data.codeName) {
            const quoteMatch = cnText.match(/[「“"‘](.+?)[」”"’]/);
            if (quoteMatch) data.codeName = quoteMatch[1];
        }
        if (!data.codeNameKana) {
            data.codeNameKana = cnText.replace(/[「“"‘].*?[」”"’]/g, '').trim();
        }
    }

    // 3. 年齢と性別の抽出
    const ageMatch = rawText.match(/年齢[：:\s]*(\d+)/);
    if (ageMatch) data.age = ageMatch[1].trim();

    const genderMatch = rawText.match(/性別[：:\s]*([^\s\/]+)/);
    if (genderMatch) {
        let gText = genderMatch[1].trim();
        if (gText.includes('女')) data.gender = "女性";
        else if (gText.includes('男')) data.gender = "男性";
        else data.gender = gText || "不明";
    }

    // 4. 職業・ワークス・カヴァーの抽出
    const worksMatch = rawText.match(/ワークス[：:\s]*([^\s\/]+)/);
    const coverMatch = rawText.match(/カヴァー[：:\s]*([^\s\/]+)/);
    if (worksMatch) {
        data.occupation = worksMatch[1].trim();
    } else if (coverMatch) {
        data.occupation = coverMatch[1].trim();
    }

    // 5. 生態情報・誕生日の抽出
    const bdayMatch = rawText.match(/誕生日[：:\s]*([^\s\/]+(?:\/[^\s\/]+)*)/);
    if (bdayMatch) {
        let rawBday = bdayMatch[1].trim();
        data.birthday = formatDX3Birthday(rawBday);
    }

    return data;
}

// 補助関数：誕生日フォーマット
function formatDX3Birthday(bdayStr) {
    if (!bdayStr) return "";
    if (bdayStr.includes('月')) return bdayStr;
    const match = bdayStr.match(/(\d+)[\/\-\.](\d+)/);
    if (match) {
        return `${match[1]}月${match[2]}日`;
    }
    return bdayStr;
}

// 🌐 グローバル登録
window.parseDX3Text = parseDX3Text;
