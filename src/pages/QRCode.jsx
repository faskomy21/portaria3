import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Download, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function QRCodePage() {
  const canvasRef = useRef(null);
  const qrValue = `${window.location.origin}/Portaria`;
  
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrValue, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 256,
      });
    }
  }, [qrValue]);
  
  const downloadQR = () => {
    const url = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = 'portaria-qrcode.png';
    link.click();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(qrValue);
    toast.success('Link copiado!');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="text-center max-w-sm w-full">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Portaria Fácil</h1>
          <p className="text-muted-foreground">Escaneie o QR Code abaixo</p>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-lg mb-6 inline-block border border-border">
          <canvas ref={canvasRef} />
        </div>

        {/* Link da pré-página */}
        <div className="mb-6 bg-white border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-2">Link da pré-página dos moradores</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm font-mono text-foreground truncate bg-muted rounded-md px-3 py-2 text-left">{qrValue}</span>
            <Button variant="outline" size="icon" onClick={copyLink} title="Copiar link">
              <Copy className="h-4 w-4" />
            </Button>
            <a href={qrValue} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="icon" title="Abrir link">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
        
        <Button onClick={downloadQR} variant="outline" size="lg" className="gap-2">
          <Download className="h-4 w-4" />
          Baixar QR Code
        </Button>
      </div>
    </div>
  );
}