import React from 'react';
import { formatDate, formatCurrency, getStatusText } from '../../utils';
import Card from '../ui/Card';
import { User, MapPin, Camera, FileText, Scale, Package, Calendar, Building2 } from 'lucide-react';

const PickupSummary = ({ service, hotel }) => {
  if (!service || !hotel) {
    return null;
  }

  return (
    <Card>
      <Card.Header>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          Resumen del Recojo Registrado
        </h3>
      </Card.Header>
      <Card.Content>
        <div className="space-y-6">
          {/* Cliente y Hotel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Información del Cliente
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Nombre:</span>
                  <span className="ml-2 text-blue-900">{service.guestName}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Habitación:</span>
                  <span className="ml-2 text-blue-900">{service.roomNumber}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-3 flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Hotel
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-green-800">Nombre:</span>
                  <span className="ml-2 text-green-900">{hotel.name}</span>
                </div>
                <div>
                  <span className="font-medium text-green-800">Dirección:</span>
                  <span className="ml-2 text-green-900">{hotel.address}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fecha y Recolector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-3 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Fecha del Recojo
              </h4>
              <p className="text-lg font-semibold text-purple-900">
                {formatDate(service.pickupDate)}
              </p>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <h4 className="font-medium text-indigo-900 mb-3 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Nombre del que Recoge
              </h4>
              <p className="text-lg font-semibold text-indigo-900">
                {service.collectorName || service.repartidor}
              </p>
            </div>
          </div>

          {/* Detalles del Servicio */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-3 flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Detalles del Servicio
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-yellow-800">Cantidad de Bolsas:</span>
                <p className="text-lg font-bold text-yellow-900">{service.bagCount}</p>
              </div>
              <div>
                <span className="font-medium text-yellow-800">Peso Total:</span>
                <p className="text-lg font-bold text-yellow-900">{service.weight} kg</p>
              </div>
              <div>
                <span className="font-medium text-yellow-800">Precio:</span>
                <p className="text-lg font-bold text-yellow-900">{formatCurrency(service.price)}</p>
              </div>
              <div>
                <span className="font-medium text-yellow-800">Estado:</span>
                <p className="text-lg font-bold text-yellow-900">{getStatusText(service.status)}</p>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Observaciones
            </h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {service.observations || 'Sin observaciones adicionales'}
            </p>
          </div>

          {/* Fotos de Campo */}
          {service.photos && service.photos.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                <Camera className="h-4 w-4 mr-2" />
                Fotos de Campo ({service.photos.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {service.photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={typeof photo === 'string' ? photo : photo.data}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-32 object-cover rounded border border-blue-200"
                    />
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                      Foto {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Firma */}
          {service.signature && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Firma del Cliente
              </h4>
              <div className="bg-white p-4 rounded border border-green-200">
                <img
                  src={service.signature}
                  alt="Firma del cliente"
                  className="max-w-full h-auto border border-gray-300 rounded"
                />
              </div>
            </div>
          )}

          {/* Geolocalización */}
          {service.geolocation && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-900 mb-3 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Ubicación del Recojo
              </h4>
              <p className="text-sm text-red-700">
                Lat: {service.geolocation.lat?.toFixed(6)}, Lng: {service.geolocation.lng?.toFixed(6)}
              </p>
              {service.geolocation.name && (
                <p className="text-sm text-red-700 mt-1">
                  {service.geolocation.name}
                </p>
              )}
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
};

export default PickupSummary;