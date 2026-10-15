import * as Clipboard from 'expo-clipboard';
export async function readClipboardUrl(){const text=await Clipboard.getStringAsync();return /^https?:\/\//i.test(text.trim())?text.trim():null;}
