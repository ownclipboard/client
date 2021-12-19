import { $http, alertRequestError } from "../http";

/**
 * Check folder password
 * @param folderSlug - folder slug
 * @param hashedPassword - hashed md5 password
 * @returns Promise<boolean>
 */
export async function checkFolderPassword(folderSlug: string, hashedPassword: string) {
    try {
        const { match } = await $http.post<any, { match: boolean }>(`folder/${folderSlug}/check-password`, {
            password: hashedPassword
        });

        console.log(match);
        

        return match;
    } catch (e) {
        alertRequestError(e);
        return false;
    }
}