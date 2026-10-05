// Keep in sync with IdentityOptions.Password in Program.cs
export const PASSWORD_RULES = [
    { id: "length", label: "Ít nhất 6 ký tự", test: (v: string) => v.length >= 6 },
    { id: "upper", label: "Ít nhất 1 chữ hoa (A-Z)", test: (v: string) => /[A-Z]/.test(v) },
    { id: "lower", label: "Ít nhất 1 chữ thường (a-z)", test: (v: string) => /[a-z]/.test(v) },
    { id: "digit", label: "Ít nhất 1 chữ số (0-9)", test: (v: string) => /[0-9]/.test(v) },
    { id: "special", label: "Ít nhất 1 ký tự đặc biệt (!@#...)", test: (v: string) => /[^a-zA-Z0-9]/.test(v) },
] as const;

export const isPasswordValid = (password: string) =>
    PASSWORD_RULES.every((rule) => rule.test(password));

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SPECIAL = "!@#$%&*?";

const randomIndex = (max: number) => {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % max;
};

const pick = (chars: string) => chars[randomIndex(chars.length)];

/** Generates a password that always satisfies PASSWORD_RULES. */
export function generatePassword(length = 12): string {
    const all = UPPER + LOWER + DIGITS + SPECIAL;
    const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)];

    while (chars.length < length) {
        chars.push(pick(all));
    }

    for (let i = chars.length - 1; i > 0; i--) {
        const j = randomIndex(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join("");
}
