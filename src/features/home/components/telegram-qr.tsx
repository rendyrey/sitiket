"use client";

import { QRCodeSVG } from "qrcode.react";

/**
 * QR code for a URL, drawn as crisp SVG (client-only: qrcode.react renders with hooks).
 * @param props.value - URL the code opens. Example: `"https://t.me/sitiket_assistant_bot"`
 * @param props.label - accessible name for the code. Example: `"QR code to open Mimin SiTIKET on Telegram"`
 */
export default function TelegramQr({ value, label }: { value: string; label: string }) {
  return (
    <QRCodeSVG
      value={value}
      size={512}
      level="M"
      marginSize={2}
      bgColor="#ffffff"
      fgColor="#0a0a0a"
      title={label}
      role="img"
      aria-label={label}
      className="h-auto w-full"
    />
  );
}
