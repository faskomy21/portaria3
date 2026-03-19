import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Keyboard, X, ImagePlus, Trash2 } from 'lucide-react';
import jsQR from 'jsqr';

export default function BarcodeScanner({ onScan, onPhotoCapture, capturedPhoto }) {
  const [mode, setMode] = useState('manual'); // 'manual', 'camera', 'photo'
  const [code, setCode] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState('');

  async function startCamera(forPhoto = false) {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      const newMode = forPhoto ? 'photo' : 'camera';
      setMode(newMode);

      // pequeno delay para o vídeo montar
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);

      if (!forPhoto) {
        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const interval = setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState !== 4) return;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);

          // Tenta BarcodeDetector nativo (código de barras + QR)
          if ('BarcodeDetector' in window) {
            try {
              const detector = new BarcodeDetector();
              const barcodes = await detector.detect(video);
              if (barcodes.length > 0) {
                clearInterval(interval);
                stopCamera();
                onScan(barcodes[0].rawValue);
                return;
              }
            } catch {}
          }

          // Fallback: jsQR para QR Code
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(imageData.data, canvas.width, canvas.height);
          if (qr) {
            clearInterval(interval);
            stopCamera();
            onScan(qr.data);
          }
        }, 300);
        return () => clearInterval(interval);
      }
    } catch (err) {
      setCameraError('Não foi possível acessar a câmera. Use o modo manual.');
      setMode('manual');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setMode('manual');
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    if (onPhotoCapture) onPhotoCapture(dataUrl);
  }

  function removePhoto() {
    if (onPhotoCapture) onPhotoCapture(null);
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  function handleManualSubmit(e) {
    e.preventDefault();
    if (code.trim()) {
      onScan(code.trim());
      setCode('');
    }
  }

  const isUsingCamera = mode === 'camera' || mode === 'photo';

  return (
    <div className="space-y-4">
      {/* Camera view (barcode or photo) */}
      {isUsingCamera && (
        <div className="relative">
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl aspect-video bg-black object-cover" />
          <canvas ref={canvasRef} className="hidden" />

          {mode === 'camera' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-40 border-2 border-white/60 rounded-xl" />
            </div>
          )}

          <Button variant="secondary" size="sm" className="absolute top-3 right-3" onClick={stopCamera}>
            <X className="h-4 w-4 mr-1" /> Fechar
          </Button>

          {mode === 'camera' && (
            <p className="text-center text-sm text-muted-foreground mt-2">Posicione o código de barras ou QR Code dentro da área</p>
          )}

          {mode === 'photo' && (
            <div className="flex justify-center mt-3">
              <Button onClick={capturePhoto} className="bg-primary hover:bg-primary/90">
                <Camera className="h-4 w-4 mr-2" /> Tirar Foto
              </Button>
            </div>
          )}

          {mode === 'camera' && (
            <div className="flex justify-center mt-2">
              <Button variant="outline" size="sm" onClick={() => { stopCamera(); setMode('manual'); }}>
                <Keyboard className="h-4 w-4 mr-2" /> Digitar manualmente
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Manual input mode */}
      {mode === 'manual' && (
        <div className="space-y-4">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Digite ou escaneie o código..."
              className="flex-1 font-mono"
              autoFocus
            />
            <Button type="submit" disabled={!code.trim()}>Confirmar</Button>
          </form>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => startCamera(false)}>
              <Camera className="h-4 w-4 mr-2" /> Escanear com câmera
            </Button>
          </div>
          {cameraError && <p className="text-sm text-destructive text-center">{cameraError}</p>}
        </div>
      )}

      {/* Photo section */}
      {onPhotoCapture && (
        <div className="border border-dashed border-border rounded-xl p-4">
          <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-muted-foreground" />
            Foto da Encomenda
          </p>
          {capturedPhoto ? (
            <div className="relative">
              <img src={capturedPhoto} alt="Foto da encomenda" className="w-full rounded-lg object-cover max-h-48" />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={removePhoto}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-20 flex-col gap-1 border-dashed text-muted-foreground"
              onClick={() => startCamera(true)}
              disabled={isUsingCamera}
            >
              <Camera className="h-5 w-5" />
              <span className="text-xs">Tirar foto da encomenda</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}