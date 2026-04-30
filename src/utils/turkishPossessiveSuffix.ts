const TURKISH_VOWELS = ['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü'] as const;

type TurkishVowel = (typeof TURKISH_VOWELS)[number];
type PossessiveSuffix = 'ın' | 'in' | 'un' | 'ün';

const POSSESSIVE_SUFFIX_BY_LAST_VOWEL: Record<TurkishVowel, PossessiveSuffix> = {
    a: 'ın',
    ı: 'ın',
    e: 'in',
    i: 'in',
    o: 'un',
    u: 'un',
    ö: 'ün',
    ü: 'ün',
};

const TURKISH_DIGIT_PRONUNCIATIONS = {
    '0': 'sıfır',
    '1': 'bir',
    '2': 'iki',
    '3': 'üç',
    '4': 'dört',
    '5': 'beş',
    '6': 'altı',
    '7': 'yedi',
    '8': 'sekiz',
    '9': 'dokuz',
};

function isTurkishVowel(char: string) {
    return TURKISH_VOWELS.includes(char as TurkishVowel);
}

function getLastTurkishVowel(value: string) {
    return [...value].reverse().find(isTurkishVowel);
}

function getSuffixSource(value: string): string {
    const lastChar = [...value].at(-1);

    if (lastChar && TURKISH_DIGIT_PRONUNCIATIONS[lastChar]) {
        return TURKISH_DIGIT_PRONUNCIATIONS[lastChar];
    }

    return value;
}

export function addTurkishPossessiveSuffix(name: string) {
    const trimmedName = name.trim();

    if (!trimmedName) {
        return '';
    }

    const normalizedName = trimmedName.toLocaleLowerCase('tr-TR');
    const suffixSource = getSuffixSource(normalizedName);

    const lastVowel = getLastTurkishVowel(suffixSource);
    const suffix = lastVowel ? POSSESSIVE_SUFFIX_BY_LAST_VOWEL[lastVowel] : 'ın';

    const lastCharOfSuffixSource = [...suffixSource].at(-1);
    const bufferLetter =
        lastCharOfSuffixSource && isTurkishVowel(lastCharOfSuffixSource) ? 'n' : '';

    return `${trimmedName}'${bufferLetter}${suffix}`;
}
