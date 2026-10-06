import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** Lettore di codici a barre con la fotocamera posteriore (ZXing, funziona anche su iPhone). */
export default function BarcodeScanner({ onResult, onClose }: { onResult: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stop: (() => void) | undefined
    let done = false
    ;(async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          video.current!,
          (result) => {
            if (result && !done) {
              done = true
              navigator.vibrate?.(80)
              controls.stop()
              onResult(result.getText())
            }
          },
        )
        stop = () => controls.stop()
        if (done) controls.stop()
      } catch {
        setError('Fotocamera non disponibile. Consenti l\'accesso alla fotocamera per questo sito nelle impostazioni di Safari.')
      }
    })()
    return () => {
      done = true
      stop?.()
    }
  }, [onResult])

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div className="pt-safe flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">Inquadra il codice a barre</span>
        <button type="button" aria-label="Chiudi" onClick={onClose} className="flex size-10 items-center justify-center rounded-full bg-white/10">
          <X className="size-5" />
        </button>
      </div>
      <div className="relative flex-1">
        <video ref={video} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-72 rounded-2xl border-2 border-[#c6f432] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        </div>
        {error && <p className="absolute inset-x-4 bottom-8 rounded-xl bg-black/70 p-3 text-center text-sm text-white">{error}</p>}
      </div>
    </div>,
    document.body,
  )
}
