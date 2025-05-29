import React from 'react';
import { formatDate, formatCurrency } from '../../utils';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Download, Printer, Share2, CheckCircle } from 'lucide-react';

const DeliveryReceipt = ({ service, hotel, onClose }) => {
  if (!service || !hotel) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Comprobante de Entrega - FumyLimp',
        text: `Entrega completada para ${service.guestName} en ${hotel.name}`,
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
                <h1 className="text-2xl font-bold text-gray-900">COMPROBANTE DE ENTREGA</h1>
                <p className="text-gray-600">FumyLimp - Servicio de Lavandería</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-green-800 font-medium">
                ✅ Entrega completada exitosamente
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
              <h3 className="font-semibold text-gray-900 mb-3">DATOS DE LA ENTREGA</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">{formatDate(service.deliveryDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Entregador:</span>
                  <span className="font-medium">{service.deliveryPersonName || service.deliveryRepartidor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recibido por:</span>
                  <span className="font-medium">{service.receiverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Documento:</span>
                  <span className="font-medium">{service.receiverDocument}</span>
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
            <h3 className="font-semibold text-gray-900 mb-4">DETALLES DE LA ENTREGA</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{service.deliveredBagCount || service.bagCount}</p>
                  <p className="text-sm text-gray-600">Bolsas Entregadas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{service.weight} kg</p>
                  <p className="text-sm text-gray-600">Peso Original</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(service.price)}</p>
                  <p className="text-sm text-gray-600">Total Servicio</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{service.deliveryPhotos?.length || 0}</p>
                  <p className="text-sm text-gray-600">Fotos Entrega</p>
                </div>
              </div>
            </div>

            {/* Histórico del Servicio */}
            <div className="space-y-2 text-sm">
              <h4 className="font-medium text-gray-700">Histórico del Servicio:</h4>
              <div className="flex justify-between">
                <span>Recojo: {formatDate(service.pickupDate)}</span>
                <span>Por: {service.collectorName || service.repartidor}</span>
              </div>
              <div className="flex justify-between">
                <span>Entrega: {formatDate(service.deliveryDate)}</span>
                <span>Por: {service.deliveryPersonName || service.deliveryRepartidor}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>TOTAL SERVICIO:</span>
                <span>{formatCurrency(service.price)}</span>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {service.deliveryObservations && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">OBSERVACIONES DE ENTREGA</h3>
              <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {service.deliveryObservations}
                </p>
              </div>
            </div>
          )}

          {/* Observaciones del Recojo */}
          {service.observations && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">OBSERVACIONES DEL RECOJO</h3>
              <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {service.observations}
                </p>
              </div>
            </div>
          )}

          {/* Firma */}
          {service.deliverySignature && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">FIRMA DEL RECEPTOR</h3>
              <div className="border border-gray-300 p-2 rounded bg-white">
                <img
                  src={service.deliverySignature}
                  alt="Firma del receptor"
                  className="max-w-full h-auto"
                  style={{ maxHeight: '120px' }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-6 text-center text-sm text-gray-600">
            <p>Este comprobante certifica que el servicio de entrega ha sido completado.</p>
            <p>La ropa ha sido entregada en perfecto estado al receptor autorizado.</p>
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

export default DeliveryReceipt;