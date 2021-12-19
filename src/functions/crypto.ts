import {MD5} from "crypto-js"

export function md5(str: string){
    return MD5(str).toString()
}