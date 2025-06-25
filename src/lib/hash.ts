export function hashPassword(pass: string, salt: string) {
  // Thực tế dùng Web Crypto API, ở Worker có sẵn subtle.digest
  // Dưới đây là mẫu sync, thực tế cần async
  const encoder = new TextEncoder();
  const data = encoder.encode(pass + salt);
  return crypto.subtle.digest('SHA-256', data).then(buf => {
    return Array.from(new Uint8Array(buf)).map(x=>x.toString(16).padStart(2,'0')).join('');
  });
}

export function randomBase62(length=20) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let str = '';
  for(let i=0;i<length;i++) str += chars.charAt(Math.floor(Math.random()*chars.length));
  return str;
}
