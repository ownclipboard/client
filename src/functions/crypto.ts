import { MD5, AES, enc } from "crypto-js"

/**
 * Hash a string using MD5
 * @param str - String to be hashed
 * @returns 
 */
export function md5(str: string) {
    return MD5(str).toString()
}


/**
 * Encrypt a string using AES
 */
export function aesEncrypt(str: string, key: string) {
    return AES.encrypt(str, key).toString();
}

/**
 * AES decrypt a string
 * @param str - String to encrypt
 * @param key - Key to use for encryption
 * @returns string
 */
export function aesDecrypt(str: string, key: string) {
    return AES.decrypt(str, key).toString(enc.Utf8);
}

/**
 * Hash a string multiple times.
 * @param str - String to hash
 * @returns string
 */
export function loopMd5(str: string) {
    const times = Number(import.meta.env.VITE_APP_MD5_LOOP_COUNT || 10)

    let hash = str;
    for (let i = 0; i < times; i++) {
        hash = md5(hash);
    }

    return hash;
}