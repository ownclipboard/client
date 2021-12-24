/**
 * Redirect function using setTimeout
 * @param url
 * @param after
 */
export function redirect(url: string, after: number = 0): void {
  if (after) {
    setTimeout(() => {
      window.location.href = url;
    }, after);
  } else {
    window.location.href = url;
  }
}


// export function copyAndReference