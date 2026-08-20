import QRCode from 'qrcode';

/**
 * Generates a QR code data URL from any string.
 *
 * @param data - The string to encode in the QR code
 * @returns A PNG data URL (suitable for <img src="..." />)
 */
export async function generateQR(data: string): Promise<string> {
  return await QRCode.toDataURL(data, {
    errorCorrectionLevel: 'M',
    width: 320,
    margin: 2,
    color: {
      dark: '#7c3aed', // violet
      light: '#0a0a0f', // dark background
    },
  });
}
