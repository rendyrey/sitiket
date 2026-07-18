"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { scanTicketAction } from "../lib/actions";
import type { CheckInResult, Ticket } from "@/lib/api/types";

declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
    };
  }
}

const RESULT_LABEL: Record<CheckInResult, string> = {
  success: "Valid — entry granted",
  duplicate: "Already used",
  invalid: "Invalid ticket",
  expired: "Outside event window",
};

const RESULT_STYLE: Record<CheckInResult, string> = {
  success: "border-lime bg-lime/20",
  duplicate: "border-orange-500 bg-orange-50",
  invalid: "border-red-500 bg-red-50",
  expired: "border-black/30 bg-black/5",
};

export default function ScannerView() {
  const [manualInput, setManualInput] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ result: CheckInResult; ticket: Ticket | null } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scanningRef = useRef(false);
  const submittingRef = useRef(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    setCameraSupported(typeof window !== "undefined" && "BarcodeDetector" in window && Boolean(navigator.mediaDevices));
  }, []);

  const handleScan = useCallback(
    async (qrPayload: string) => {
      if (!qrPayload.trim() || submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setError(null);
      const actionResult = await scanTicketAction({ qrPayload: qrPayload.trim(), deviceLabel: deviceLabel.trim() || undefined });
      submittingRef.current = false;
      setSubmitting(false);
      if (!actionResult.ok) {
        setError(actionResult.message);
        return;
      }
      setResult(actionResult.data);
    },
    [deviceLabel],
  );

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);
      scanningRef.current = true;

      const BarcodeDetectorCtor = window.BarcodeDetector;
      if (!BarcodeDetectorCtor) return;
      const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });

      const tick = async () => {
        if (!scanningRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0 && !submittingRef.current) {
            stopCamera();
            await handleScan(codes[0].rawValue);
            return;
          }
        } catch {
          // Transient detection error — keep scanning.
        }
        requestAnimationFrame(() => void tick());
      };
      void tick();
    } catch {
      setError("Could not access the camera. Use manual entry below instead.");
    }
  };

  useEffect(() => stopCamera, [stopCamera]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {cameraSupported && (
          <div className="border-2 border-ink bg-white p-5">
            <span className="tag">Camera scan</span>
            <div className="relative mt-4 aspect-video overflow-hidden border-2 border-ink bg-black">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            </div>
            <button
              type="button"
              onClick={() => (cameraActive ? stopCamera() : void startCamera())}
              className="button button-dark mt-4"
            >
              {cameraActive ? "Stop camera" : "Start camera"}
            </button>
          </div>
        )}

        <div className="border-2 border-ink bg-white p-5">
          <span className="tag">Manual entry</span>
          <p className="mt-3 text-xs text-black/45">
            {cameraSupported ? "Or paste the ticket's QR content directly." : "Your browser can't scan a camera feed — paste the ticket's QR content instead."}
          </p>
          <textarea
            className="text-field mt-3 h-24 py-3"
            value={manualInput}
            onChange={(event) => setManualInput(event.target.value)}
            placeholder="Paste QR payload"
          />
          <input
            className="text-field mt-3"
            value={deviceLabel}
            onChange={(event) => setDeviceLabel(event.target.value)}
            placeholder="Gate/device label (optional), e.g. Gate A"
          />
          {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
          <button
            type="button"
            onClick={() => {
              void handleScan(manualInput);
              setManualInput("");
            }}
            disabled={submitting}
            className="button button-dark button-large mt-4 w-full disabled:opacity-50"
          >
            {submitting ? "Checking…" : "Scan"}
          </button>
        </div>
      </div>

      <aside className="h-fit border-2 border-ink bg-white p-5 lg:sticky lg:top-32">
        <span className="tag">Last scan</span>
        {!result && <p className="mt-4 text-sm text-black/40">No scan yet.</p>}
        {result && (
          <div className={`mt-4 border-2 p-4 ${RESULT_STYLE[result.result]}`}>
            <p className="text-lg font-black uppercase">{RESULT_LABEL[result.result]}</p>
            {result.ticket && (
              <div className="mt-3 space-y-1 text-sm">
                <p className="font-bold">{result.ticket.buyerName}</p>
                <p className="text-black/60">{result.ticket.ticketTypeName}</p>
                <p className="text-xs text-black/40">{result.ticket.ticketCode}</p>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
