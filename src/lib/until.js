export function genRandomId(len = 12){
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return btoa(String.fromCharCode(...bytes))
           .replace(/[+/=]/g, '')
           .substring(0, len);
}
