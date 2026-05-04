export type VietnameseTone = 1 | 2 | 3 | 4 | 5 | 6;

export type VietnameseToneColor = "gray" | "blue" | "green" | "orange" | "purple" | "red";

const TONE_MAP: Record<string, VietnameseTone> = {
    // flat (ngang)
    a: 1,
    ă: 1,
    â: 1,
    e: 1,
    ê: 1,
    i: 1,
    o: 1,
    ô: 1,
    ơ: 1,
    u: 1,
    ư: 1,
    y: 1,

    // sắc (rising)
    á: 2,
    ắ: 2,
    ấ: 2,
    é: 2,
    ế: 2,
    í: 2,
    ó: 2,
    ố: 2,
    ớ: 2,
    ú: 2,
    ứ: 2,
    ý: 2,

    // huyền (falling)
    à: 3,
    ằ: 3,
    ầ: 3,
    è: 3,
    ề: 3,
    ì: 3,
    ò: 3,
    ồ: 3,
    ờ: 3,
    ù: 3,
    ừ: 3,
    ỳ: 3,

    // hỏi (dipping-rising)
    ả: 4,
    ẳ: 4,
    ẩ: 4,
    ẻ: 4,
    ể: 4,
    ỉ: 4,
    ỏ: 4,
    ổ: 4,
    ở: 4,
    ủ: 4,
    ử: 4,
    ỷ: 4,

    // ngã (broken rising)
    ã: 5,
    ẵ: 5,
    ẫ: 5,
    ẽ: 5,
    ễ: 5,
    ĩ: 5,
    õ: 5,
    ỗ: 5,
    ỡ: 5,
    ũ: 5,
    ữ: 5,
    ỹ: 5,

    // nặng (dropping)
    ạ: 6,
    ặ: 6,
    ậ: 6,
    ẹ: 6,
    ệ: 6,
    ị: 6,
    ọ: 6,
    ộ: 6,
    ợ: 6,
    ụ: 6,
    ự: 6,
    ỵ: 6,
};

const TONE_COLORS: Record<VietnameseTone, VietnameseToneColor> = {
    1: "gray",
    2: "blue",
    3: "green",
    4: "orange",
    5: "purple",
    6: "red",
};

export function getTone(char: string): VietnameseTone {
    return TONE_MAP[char.toLowerCase()] ?? 1;
}

export function getWordTone(word: string): VietnameseTone {
    for (const char of word) {
        const tone = TONE_MAP[char.toLowerCase()];
        if (tone && tone !== 1) {
            return tone;
        }
    }

    return 1;
}

export function colorizeWord(word: string): { word: string; tone: VietnameseTone; color: VietnameseToneColor } {
    const tone = getWordTone(word);

    return { word, tone, color: TONE_COLORS[tone] };
}
