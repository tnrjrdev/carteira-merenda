/**
 * Wrapper para a Web NFC API (apenas Android + Chrome + HTTPS).
 * Em outras plataformas a função retorna `null` em `supported()`.
 *
 * Em produção, para iOS/iPadOS, é preciso app nativo via Capacitor.
 */
export function nfcSupported() {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
}

/** Lê uma vez e devolve a primeira string encontrada. */
export async function lerNfcUmaVez({ timeoutMs = 15000 } = {}) {
  if (!nfcSupported()) throw new Error('NFC não é suportado neste navegador');
  // eslint-disable-next-line no-undef
  const ndef = new NDEFReader();
  await ndef.scan();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ndef.removeEventListener('reading', onRead);
      reject(new Error('Tempo esgotado para leitura NFC'));
    }, timeoutMs);

    const onRead = (event) => {
      try {
        for (const record of event.message.records) {
          if (record.recordType === 'text' || record.recordType === 'url') {
            const decoder = new TextDecoder(record.encoding || 'utf-8');
            clearTimeout(timer);
            ndef.removeEventListener('reading', onRead);
            return resolve(decoder.decode(record.data));
          }
        }
        // Cai aqui se não houver text/url — usa o serialNumber como fallback
        clearTimeout(timer);
        ndef.removeEventListener('reading', onRead);
        resolve(event.serialNumber || '');
      } catch (e) {
        clearTimeout(timer);
        ndef.removeEventListener('reading', onRead);
        reject(e);
      }
    };
    ndef.addEventListener('reading', onRead);
  });
}

/** Escreve um texto na próxima tag aproximada (estudante encostando o cartão). */
export async function escreverNfc(text) {
  if (!nfcSupported()) throw new Error('NFC não é suportado neste navegador');
  // eslint-disable-next-line no-undef
  const ndef = new NDEFReader();
  await ndef.write({ records: [{ recordType: 'text', data: text }] });
}
