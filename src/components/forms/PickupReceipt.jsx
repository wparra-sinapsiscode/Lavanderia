import React from 'react';
import { formatDate, formatCurrency } from '../../utils';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Download, Printer, Share2, CheckCircle } from 'lucide-react';

const PickupReceipt = ({ service, hotel, onClose }) => {
  if (!service || !hotel) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Comprobante de Recojo - FumyLimp',
        text: `Recojo completado para ${service.guestName} en ${hotel.name}`,
        url: window.location.href
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <Card.Content className="p-8">
          {/* Header */}
          <div className="text-center border-b pb-6 mb-6">
            <div className="flex items-center justify-center mb-4">
              <img
                src="/Logo.jfif"
                alt="Fumy Limp Logo"
                className="h-12 w-auto mr-4"
              />
              <div className="mr-4">
                <h1 className="text-2xl font-bold text-gray-900">COMPROBANTE DE RECOJO</h1>
                <p className="text-gray-600">FumyLimp - Servicio de Lavandería</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-green-800 font-medium">
                ✅ Recojo completado exitosamente
              </p>
            </div>
          </div>

          {/* Información del Servicio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">DATOS DEL CLIENTE</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nombre:</span>
                  <span className="font-medium">{service.guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hotel:</span>
                  <span className="font-medium">{hotel.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Habitación:</span>
                  <span className="font-medium">{service.roomNumber}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">DATOS DEL RECOJO</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">{formatDate(service.pickupDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recolector:</span>
                  <span className="font-medium">{service.collectorName || service.repartidor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ID Servicio:</span>
                  <span className="font-medium text-xs">{service.id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detalles del Servicio */}
          <div className="border-t border-b py-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">DETALLES DEL SERVICIO</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{service.bagCount}</p>
                  <p className="text-sm text-gray-600">Bolsas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{service.weight} kg</p>
                  <p className="text-sm text-gray-600">Peso</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(service.price)}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{service.photos?.length || 0}</p>
                  <p className="text-sm text-gray-600">Fotos</p>
                </div>
              </div>
            </div>

            {/* Cálculo del Precio */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Peso: {service.weight} kg × {formatCurrency(hotel.pricePerKg)}/kg</span>
                <span>{formatCurrency(service.weight * hotel.pricePerKg)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Bolsas (solo control): {service.bagCount} bolsas</span>
                <span>Sin costo adicional</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>TOTAL:</span>
                <span>{formatCurrency(service.price)}</span>
              </div>
            </div>
            
            {/* Nota explicativa */}
            <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
              <p className="text-xs text-blue-800">
                <strong>Nota:</strong> El precio se calcula únicamente por peso. Las bolsas son solo para control operativo y no generan costo adicional.
              </p>
            </div>
          </div>

          {/* Observaciones */}
          {service.observations && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">OBSERVACIONES</h3>
              <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {service.observations}
                </p>
              </div>
            </div>
          )}

          {/* Firma */}
          {service.signature && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">FIRMA DEL CLIENTE</h3>
              <div className="border border-gray-300 p-2 rounded bg-white">
                <img
                  src={service.signature}
                  alt="Firma del cliente"
                  className="max-w-full h-auto"
                  style={{ maxHeight: '120px' }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-6 text-center text-sm text-gray-600">
            <p>Este comprobante certifica que el servicio de recojo ha sido completado.</p>
            <p>Para consultas: contacto@fumylimp.com | Tel: (01) 234-5678</p>
            <p className="mt-2 text-xs">
              Generado el {formatDate(new Date())}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex-1 print:hidden"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            
            {navigator.share && (
              <Button
                onClick={handleShare}
                variant="outline"
                className="flex-1 print:hidden"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Compartir
              </Button>
            )}
            
            <Button
              onClick={onClose}
              className="flex-1 print:hidden"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalizar
            </Button>
          </div>
        </Card.Content>
      </Card>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default PickupReceipt;