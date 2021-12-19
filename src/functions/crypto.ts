import {MD5, AES, enc} from "crypto-js"

/**
 * Hash a string using MD5
 * @param str - String to be hashed
 * @returns 
 */
export function md5(str: string){
    return MD5(str).toString()
}


/**
 * Encrypt a string using AES
 */
export function aesEncrypt(str: string, key: string){
    return AES.encrypt(str, key).toString();
}

export function aesDecrypt(str: string, key: string){
    return AES.decrypt(str, key).toString(enc.Utf8);
}