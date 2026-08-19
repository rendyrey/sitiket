"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import toast from "react-hot-toast";
import { primeScanAudio, signalScanResult, soundPreference } from "../lib/scan-feedback";
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

/** One-line explanation of what the gate operator should do about this result. */
const RESULT_ACTION: Record<CheckInResult, string> = {
  success: "Let them in.",
  duplicate: "This ticket was already scanned — do not admit again.",
  invalid: "Not a valid ticket for this event. Do not admit.",
  expired: "Valid ticket, but outside this event's entry window.",
};

/** Full-bleed banner styling. Success is the brand lime; every rejection is visually louder. */
const RESULT_BANNER: Record<CheckInResult, string> = {
  success: "border-lime bg-lime text-black",
  duplicate: "border-orange-500 bg-orange-500 text-white",
  invalid: "border-red-600 bg-red-600 text-white",
  expired: "border-ink bg-ink text-white",
};

const RESULT_MARK: Record<CheckInResult, string> = {
  success: "✓",
  duplicate: "!",
  invalid: "✕",
  expired: "⊘",
};

/** How long the result banner holds before the camera resumes hunting for the next QR. */
const RESUME_DELAY_MS = 1800;

/**
 * `getUserMedia` support, read without setState-in-effect (which cascades a
 * render and trips react-hooks/set-state-in-effect). The server snapshot is
 * `false` so SSR and the first client render agree.
 */
const subscribeNever = () => () => {};
const getCameraSupport = () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

export default function ScannerView() {
  const [manualInput, setManualInput] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ result: CheckInResult; ticket: Ticket | null } | null>(null);
  const [tally, setTally] = useState({ success: 0, rejected: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanningRef = useRef(false);
  const submittingRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraSupported = useSyncExternalStore(subscribeNever, getCameraSupport, () => false);
  const soundOn = useSyncExternalStore(soundPreference.subscribe, soundPreference.get, soundPreference.getServerSnapshot);
  const [cameraActive, setCameraActive] = useState(false);
  /** True while a scan result is held on the viewfinder before scanning resumes. */
  const [holdingResult, setHoldingResult] = useState(false);
  const holdingRef = useRef(false);

  const toggleSound = () => {
    const next = !soundOn;
    soundPreference.set(next);
    if (next) primeScanAudio(); // this click is the gesture that unlocks audio
  };

  const handleScan = useCallback(
    async (qrPayload: string) => {
      if (!qrPayload.trim() || submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setError(null);

      const actionResult = await scanTicketAction({
        qrPayload: qrPayload.trim(),
        deviceLabel: deviceLabel.trim() || undefined,
      });

      submittingRef.current = false;
      setSubmitting(false);

      if (!actionResult.ok) {
        setError(actionResult.message);
        toast.error(actionResult.message);
        return;
      }

      const { result: outcome, ticket } = actionResult.data;
      setResult(actionResult.data);

      // Announce it three ways — tone, buzz, toast — because the operator is
      // rarely looking at the screen when the scan lands.
      signalScanResult(outcome, { sound: soundPreference.get() });
      setTally((current) =>
        outcome === "success"
          ? { ...current, success: current.success + 1 }
          : { ...current, rejected: current.rejected + 1 },
      );

      const who = ticket?.buyerName ? ` — ${ticket.buyerName}` : "";
      if (outcome === "success") {
        toast.success(`Checked in${who}`, { duration: 2500 });
      } else {
        toast.error(`${RESULT_LABEL[outcome]}${who}`, { duration: 4000 });
      }
    },
    [deviceLabel],
  );

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    holdingRef.current = false;
    setHoldingResult(false);
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    setCameraActive(false);
  }, []);

  /** Decode a QR from the current video frame, natively where possible, else via jsQR on a canvas. */
  const decodeFrame = useCallback(
    async (video: HTMLVideoElement, detector: InstanceType<NonNullable<Window["BarcodeDetector"]>> | null): Promise<string | null> => {
      if (detector) {
        const codes = await detector.detect(video);
        return codes.length > 0 ? codes[0].rawValue : null;
      }
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return null; // metadata not ready yet — try again next frame
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvasRef.current = canvas;
      }
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return null;
      context.drawImage(video, 0, 0, width, height);
      const { data } = context.getImageData(0, 0, width, height);
      return jsQR(data, width, height, { inversionAttempts: "dontInvert" })?.data ?? null;
    },
    [],
  );

  const startCamera = async () => {
    setError(null);
    // Called from the operator's tap, which is the gesture browsers require
    // before any audio can play.
    primeScanAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);
      scanningRef.current = true;

      const BarcodeDetectorCtor = window.BarcodeDetector;
      const detector = BarcodeDetectorCtor ? new BarcodeDetectorCtor({ formats: ["qr_code"] }) : null;
      let lastScan = 0;

      const tick = async () => {
        if (!scanningRef.current || !videoRef.current) return;
        // jsQR decodes a full frame on the main thread, so throttle it to ~8/sec;
        // the native detector is cheap enough to run every frame.
        const now = performance.now();
        if (!holdingRef.current && (detector || now - lastScan > 120)) {
          lastScan = now;
          try {
            const value = await decodeFrame(videoRef.current, detector);
            if (value && !submittingRef.current) {
              // Hold the feed (rather than tearing the camera down) so the
              // operator can keep the phone up and scan the next ticket
              // straight after the result clears — a gate queue does not wait
              // for someone to tap "Start camera" between every person.
              holdingRef.current = true;
              setHoldingResult(true);
              await handleScan(value);
              resumeTimerRef.current = setTimeout(() => {
                holdingRef.current = false;
                setHoldingResult(false);
              }, RESUME_DELAY_MS);
            }
          } catch {
            // Transient detection error — keep scanning.
          }
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
        {/*
          The result leads the page on every viewport. It used to live only in
          the sidebar, which on a phone renders *below* the camera — the one
          place a gate operator never looks.
        */}
        <div aria-live="assertive" role="status">
          {result && (
            <div className={`flex items-center gap-4 border-4 p-5 sm:p-6 ${RESULT_BANNER[result.result]}`}>
              <span aria-hidden className="font-lexend text-4xl font-black leading-none sm:text-5xl">
                {RESULT_MARK[result.result]}
              </span>
              <div className="min-w-0">
                <p className="text-xl font-black uppercase leading-none sm:text-2xl">{RESULT_LABEL[result.result]}</p>
                <p className="mt-2 text-sm font-bold opacity-80">{RESULT_ACTION[result.result]}</p>
                {result.ticket && (
                  <p className="mt-2 truncate text-sm font-bold">
                    {result.ticket.buyerName} · {result.ticket.ticketTypeName}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {cameraSupported && (
          <div className="border-2 border-ink bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="tag">Camera scan</span>
              <button
                type="button"
                onClick={toggleSound}
                aria-pressed={soundOn}
                className="border-2 border-ink px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors hover:bg-ink hover:text-white"
              >
                {soundOn ? "Sound on" : "Sound off"}
              </button>
            </div>
            <div className="relative mt-4 aspect-video overflow-hidden border-2 border-ink bg-black">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
              {cameraActive && !holdingResult && (
                <span className="absolute left-3 top-3 bg-lime px-2 py-1 text-[10px] font-black uppercase tracking-wider text-black">
                  Scanning…
                </span>
              )}
              {/*
                The result covers the viewfinder itself. This is the only
                confirmation channel that always works on an iPhone: iOS Safari
                has no navigator.vibrate, and Web Audio is silenced by the
                hardware ring/silent switch — so a gate operator holding the
                phone up may get no beep and no buzz at all. Their eyes are on
                the feed, so the answer goes on the feed.
              */}
              {holdingResult && result && (
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center ${RESULT_BANNER[result.result]}`}
                >
                  <span aria-hidden className="font-lexend text-6xl font-black leading-none sm:text-7xl">
                    {RESULT_MARK[result.result]}
                  </span>
                  <p className="text-xl font-black uppercase leading-tight sm:text-2xl">{RESULT_LABEL[result.result]}</p>
                  {result.ticket && (
                    <p className="max-w-full truncate text-sm font-bold opacity-80">
                      {result.ticket.buyerName} · {result.ticket.ticketTypeName}
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => (cameraActive ? stopCamera() : void startCamera())}
              className="button button-dark mt-4"
            >
              {cameraActive ? "Stop camera" : "Start camera"}
            </button>
            {cameraActive && (
              <p className="mt-3 text-xs font-semibold text-black/45">
                Keep the camera up — it holds each result for a moment, then keeps scanning.
              </p>
            )}
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
              primeScanAudio();
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

      <aside className="h-fit space-y-6 lg:sticky lg:top-32">
        <div className="border-2 border-ink bg-ink p-5 text-white">
          <span className="text-[10px] font-black uppercase tracking-[.2em] text-lime">This session</span>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="font-lexend text-4xl font-black leading-none tabular-nums text-lime">{tally.success}</p>
              <p className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-white/50">Checked in</p>
            </div>
            <div>
              <p className="font-lexend text-4xl font-black leading-none tabular-nums text-white/70">{tally.rejected}</p>
              <p className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-white/50">Rejected</p>
            </div>
          </div>
          <p className="mt-4 border-t border-white/10 pt-3 text-[11px] font-semibold leading-4 text-white/40">
            Counts this device since the page loaded. The event&apos;s running totals live on its Attendance tab.
          </p>
        </div>

        <div className="border-2 border-ink bg-white p-5">
          <span className="tag">Last scan</span>
          {!result && <p className="mt-4 text-sm text-black/40">No scan yet.</p>}
          {result && (
            <div className="mt-4 space-y-1 text-sm">
              <p className="font-black uppercase">{RESULT_LABEL[result.result]}</p>
              {result.ticket && (
                <>
                  <p className="font-bold">{result.ticket.buyerName}</p>
                  <p className="text-black/60">{result.ticket.ticketTypeName}</p>
                  <p className="text-xs text-black/40">{result.ticket.ticketCode}</p>
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
