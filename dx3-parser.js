// ==========================================
// 💡 ダブルクロス (DX3rd) テキストパーサー
// ==========================================
function parseDX3Text(rawText, targetSysId) {
    let data = {
        name: "",
        nameKana: "",
        codeName: "",
        codeNameKana: "",
        age: "",
        gender: "不明",
        occupation: "", // ワークスやカヴァー
        birthday: "",
        colorCode: "#f43f5e", // デフォルトテーマカラー
        fields: {} // 動的カスタムフィールド用の格納先
    };

    if (!rawText) return data;

    // 1. 基本プロフィール抽出
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

    const pcKanaMatch = rawText.match(/PC[：:\s]+([^\r\n]+)/);
    if (pcKanaMatch && !data.nameKana) {
        data.nameKana = pcKanaMatch[1].trim();
    }

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

    const ageMatch = rawText.match(/年齢[：:\s]*(\d+)/);
    if (ageMatch) data.age = ageMatch[1].trim();

    const genderMatch = rawText.match(/性別[：:\s]*([^\s\/]+)/);
    if (genderMatch) {
        let gText = genderMatch[1].trim();
        if (gText.includes('女')) data.gender = "女性";
        else if (gText.includes('男')) data.gender = "男性";
        else data.gender = gText || "不明";
    }

    const worksMatch = rawText.match(/ワークス[：:\s]*([^\s\/]+)/);
    const coverMatch = rawText.match(/カヴァー[：:\s]*([^\s\/]+)/);
    const syndromeMatch = rawText.match(/シンドローム[：:\s]*([^\r\n]+)/);

    if (worksMatch) data.occupation = worksMatch[1].trim();
    else if (coverMatch) data.occupation = coverMatch[1].trim();

    // Dロイスの抽出
    let dRoyce = "";
    const dRoyceMatch = rawText.match(/([^\r\n]+)\s*\/\s*Dロイス/);
    if (dRoyceMatch) {
        dRoyce = dRoyceMatch[1].trim();
    }

    // 2. 抽出したテキスト項目の値マップ
    const extractedValues = {
        "カヴァー": coverMatch ? coverMatch[1].trim() : (worksMatch ? worksMatch[1].trim() : ""),
        "シンドローム": syndromeMatch ? syndromeMatch[1].trim() : "",
        "Dロイス": dRoyce,
        "ワークス": worksMatch ? worksMatch[1].trim() : "",
        "コードネーム": data.codeName
    };

    // 3. 選択されているシステムのカスタムフィールド設定（window.systemCustomFields）と突合してIDを割り当て
    if (targetSysId && window.systemCustomFields && window.systemCustomFields[targetSysId]) {
        const sysFields = window.systemCustomFields[targetSysId];
        
        // テキスト項目を走査してラベルが一致すればセット
        if (sysFields.text) {
            sysFields.text.forEach(field => {
                // フィールドのラベル名（例: "カヴァー"）に一致する抽出データがあれば代入
                if (extractedValues[field.label] !== undefined) {
                    data.fields[field.id] = extractedValues[field.label];
                }
            });
        }
    }

    return data;
}

// 🌐 グローバル登録
window.parseDX3Text = parseDX3Text;
