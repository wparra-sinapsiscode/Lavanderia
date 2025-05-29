import React, { useRef, useState, useEffect } from 'react';
import Button from './Button';
import { RefreshCw, Check } from 'lucide-react';

const SignatureCanvas = ({ onSignatureChange, width = 400, height = 200 }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas background
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);
    
    // Set drawing styles
    context.strokeStyle = '#000000';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
  }, [width, height]);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const context = canvas.getContext('2d');
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const context = canvas.getContext('2d');
    context.lineTo(x, y);
    context.stroke();
    
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (onSignatureChange && hasSignature) {
        const canvas = canvasRef.current;
        const signatureDataURL = canvas.toDataURL();
        onSignatureChange(signatureDataURL);
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);
    setHasSignature(false);
    if (onSignatureChange) {
      onSignatureChange('');
    }
  };

  // Touch events for mobile support
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvasRef.current.dispatchEvent(mouseEvent);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvasRef.current.dispatchEvent(mouseEvent);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    canvasRef.current.dispatchEvent(mouseEvent);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border border-gray-300 rounded bg-white cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        <p className="text-sm text-gray-600 mt-2 text-center">
          Firme en el área blanca usando el mouse o el dedo
        </p>
      </div>
      
      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={clearSignature}
          disabled={!hasSignature}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Limpiar
        </Button>
        {hasSignature && (
          <div className="flex items-center text-green-600">
            <Check className="h-4 w-4 mr-1" />
            <span className="text-sm">Firma capturada</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignatureCanvas;