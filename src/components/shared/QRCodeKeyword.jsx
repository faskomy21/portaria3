import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { buildTenantAwareUrl } from '@/lib/tenantContext';

export default function QRCodeKeyword() {
  const canvasRef = useRef(null);
  const url = buildTenantAwareUrl('/KeywordForm');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.onload = () => {
      if (window.QRCode && canvasRef.current) {
        canvasRef.current.innerHTML = '';
        new window.QRCode(canvasRef.current, {
          text: url,
          width: 220,
          height: 220,
          colorDark: '#1e293b',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.H,
        });
      }
    };
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, [url]);

  function handleDownload() {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'qrcode-palavra-chave.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="p-4 bg-white rounded-2xl shadow-inner border">
        <div ref={canvasRef} />
      </div>
      <p className="text-xs text-muted-foreground text-center px-2">
        Mostre este QR Code ao morador para que ele registre a palavra-chave pelo celular.
      </p>
      <p className="text-xs text-primary break-all text-center font-mono bg-muted px-3 py-1.5 rounded-lg">
        {url}
      </p>
      <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
        <Download className="h-4 w-4" />
        Baixar QR Code
      </Button>
    </div>
  );
}
