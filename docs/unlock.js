const status = document.querySelector('#status');

async function unlock() {
  const secret = new URLSearchParams(location.hash.slice(1)).get('key');
  if (secret === null) return;

  history.replaceState(null, '', location.pathname + location.search);
  if (!window.isSecureContext || !window.crypto?.subtle) {
    status.textContent = '请通过 HTTPS 打开完整访问链接。';
    return;
  }

  if (!/^[0-9a-f]{64}$/i.test(secret)) {
    status.textContent = '访问链接不完整，请向分享者索取最新链接。';
    return;
  }

  status.textContent = '正在解锁…';
  let payload;
  try {
    const response = await fetch(new URL('./resume.enc.json', import.meta.url), {
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) throw new Error('Ciphertext unavailable');
    payload = await response.json();
  } catch {
    status.textContent = '暂时无法加载页面，请重新打开完整访问链接。';
    return;
  }

  try {
    if (payload.version !== 1) throw new Error('Unsupported encrypted document version');
    const key = await crypto.subtle.importKey(
      'raw', Uint8Array.from(secret.match(/../g), (pair) => parseInt(pair, 16)),
      'AES-GCM', false, ['decrypt'],
    );
    const bytes = (value) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes(payload.iv), tagLength: 128 }, key, bytes(payload.ciphertext),
    );

    const html = new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
    document.open();
    document.write(html);
    document.close();
  } catch {
    status.textContent = '密钥无法解锁，请向分享者索取最新链接。';
  }
}

window.addEventListener('hashchange', unlock);
unlock();
