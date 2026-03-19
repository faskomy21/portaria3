import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Trash2, ImagePlus, Plus, Image } from 'lucide-react';

export default function MultiPhotoCapture({ photos, onPhotosChange, label = 'Fotos da Avaria' }) {
  const [showCamera, setShowCamera] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [cameraError, setCameraError] = useState('');

  async function startCamera() {
    setCameraError('');
    setShowAddMenu(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      setCameraError('Não foi possível acessar a câmera.');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    onPhotosChange([...photos, dataUrl]);
    stopCamera();
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files);
    const readers = files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then(newPhotos => {
      onPhotosChange([...photos, ...newPhotos]);
    });
    e.target.value = '';
  }

  function removePhoto(index) {
    onPhotosChange(photos.filter((_, i) => i !== index));
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="border border-dashed border-border rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-foreground flex items-center gap-2">
        <ImagePlus className="h-4 w-4 text-muted-foreground" />
        {label}
        {photos.length > 0 && (
          <span className="text-xs text-muted-foreground font-normal">
            ({photos.length} foto{photos.length > 1 ? 's' : ''})
          </span>
        )}
      </p>

      {/* Camera view */}
      {showCamera && (
        <div className="relative">
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl aspect-video bg-black object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={stopCamera}>
            <X className="h-4 w-4 mr-1" /> Fechar
          </Button>
          <div className="flex justify-center mt-2">
            <Button onClick={capturePhoto} className="bg-primary hover:bg-primary/90">
              <Camera className="h-4 w-4 mr-2" /> Tirar Foto
            </Button>
          </div>
        </div>
      )}

      {/* Photo grid + add button */}
      {!showCamera && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={i} className="relative aspect-square">
              <img src={p} alt={`Foto ${i + 1}`} className="w-full h-full object-cover rounded-lg border" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-600 flex items-center justify-center"
              >
                <Trash2 className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}

          {/* Add more button */}
          <div className="relative aspect-square">
            <button
              type="button"
              onClick={() => setShowAddMenu(v => !v)}
              className="w-full h-full rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="h-6 w-6" />
              <span className="text-xs">Foto</span>
            </button>

            {showAddMenu && (
              <div className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-10 w-36">
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <Camera className="h-4 w-4" /> Câmera
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddMenu(false); fileInputRef.current?.click(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <Image className="h-4 w-4" /> Galeria
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {cameraError && <p className="text-xs text-destructive">{cameraError}</p>}
    </div>
  );
}