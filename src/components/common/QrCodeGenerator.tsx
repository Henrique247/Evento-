import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export const QrCodeDisplay: React.FC<QrCodeProps> = ({ value, size = 180, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }, (error) => {
        if (error) {
          console.error('Erro ao gerar código QR', error);
        }
      });
    }
  }, [value, size]);

  return (
    <div className={`inline-flex items-center justify-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs ${className}`}>
      <canvas ref={canvasRef} className="rounded-lg max-w-full" />
    </div>
  );
};
