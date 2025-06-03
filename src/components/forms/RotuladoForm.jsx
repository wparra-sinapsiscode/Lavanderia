import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { useNotifications } from '../../store/NotificationContext';
import { bagLabelStorage, serviceStorage } from '../../utils/storage';
import bagLabelService from '../../services/bagLabel.service';
import serviceService from '../../services/service.service';
import { SERVICE_STATUS } from '../../types';
import { formatDate } from '../../utils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Camera, Tag, Package, CheckCircle, X, Upload, User, MapPin, Calendar, Weight } from 'lucide-react';

const RotuladoForm = ({ service, onClose, onStatusUpdated }) => {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const [bagLabels, setBagLabels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initializeBagLabels();
  }, [service.id]);

  const initializeBagLabels = () => {
    // Crear array de bolsas para rotular
    const labels = [];
    for (let i = 1; i <= service.bagCount; i++) {
      labels.push({
        id: `temp-${i}`,
        bagNumber: i,
        photo: null,
        preview: null,
        labelCode: generateLabelCode(i),
        uploaded: false
      });
    }
    setBagLabels(labels);
  };

  const generateLabelCode = (bagNumber) => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const serviceShort = service.id.slice(-4).toUpperCase();
    return `ROT-${dateStr}-${serviceShort}-${bagNumber.toString().padStart(2, '0')}`;
  };

  const handlePhotoChange = (bagNumber, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      showNotification({
        type: 'error',
        message: 'Solo se permiten archivos de imagen'
      });
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification({
        type: 'error',
        message: 'La imagen no debe superar los 5MB'
      });
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setBagLabels(prev => 
        prev.map(label => 
          label.bagNumber === bagNumber
            ? { ...label, photo: file, preview: e.target.result }
            : label
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (bagNumber) => {
    setBagLabels(prev => 
      prev.map(label => 
        label.bagNumber === bagNumber
          ? { ...label, photo: null, preview: null }
          : label
      )
    );
  };

  const allPhotosUploaded = () => {
    return bagLabels.every(label => label.photo !== null);
  };

  const handleSubmit = async () => {
    if (!allPhotosUploaded()) {
      showNotification({
        type: 'error',
        message: 'Debe subir una imagen para cada bolsa'
      });
      return;
    }

    setSubmitting(true);

    try {
      // Intentar guardar en la API primero
      let apiSuccess = false;
      
      try {
        for (const label of bagLabels) {
          const labelData = {
            serviceId: service.id,
            hotelId: service.hotel?.id || service.hotelId,
            bagNumber: label.bagNumber,
            label: label.labelCode,
            photo: label.photo, // El archivo se enviará al backend
            registeredById: user.id,
            status: 'LABELED',
            generatedAt: 'LAVANDERIA'
          };

          const response = await bagLabelService.createBagLabel(labelData);
          if (!response.success) {
            throw new Error(response.message);
          }
        }
        
        // Actualizar estado del servicio en la API
        const statusResponse = await serviceService.updateServiceStatus(service.id, {
          status: 'LABELED',
          internalNotes: `Rotulado completado por ${user.name} - ${new Date().toLocaleString()}`
        });
        
        if (statusResponse.success) {
          apiSuccess = true;
        }
      } catch (apiError) {
        console.warn('Error en API, guardando localmente:', apiError);
      }

      // Si la API falló, guardar en storage local
      if (!apiSuccess) {
        // Guardar rótulos en storage local
        for (const label of bagLabels) {
          const labelData = {
            id: `label-${service.id}-${label.bagNumber}`,
            serviceId: service.id,
            hotelId: service.hotel?.id || service.hotelId,
            bagNumber: label.bagNumber,
            label: label.labelCode,
            photo: label.preview, // Guardamos el base64 localmente
            registeredById: user.id,
            timestamp: new Date().toISOString(),
            status: 'LABELED',
            generatedAt: 'LAVANDERIA'
          };
          
          bagLabelStorage.addBagLabel(labelData);
        }

        // Actualizar estado del servicio localmente
        const services = serviceStorage.getServices();
        const updatedServices = services.map(s => {
          if (s.id === service.id) {
            return {
              ...s,
              status: SERVICE_STATUS.LABELED,
              labeledDate: new Date().toISOString(),
              internalNotes: (s.internalNotes || '') + 
                `\n[${new Date().toLocaleString()}] Rotulado completado por ${user.name}`,
              syncPending: true
            };
          }
          return s;
        });
        
        serviceStorage.setServices(updatedServices);
      }

      showNotification({
        type: 'success',
        message: `Rotulado completado exitosamente para ${service.guestName}. ${service.bagCount} bolsas rotuladas.`
      });

      // Notificar cambios y cerrar
      if (onStatusUpdated) {
        onStatusUpdated();
      }
      onClose();

    } catch (error) {
      console.error('Error al completar rotulado:', error);
      showNotification({
        type: 'error',
        message: `Error al completar rotulado: ${error.message}`
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Rotulado de Servicio
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="font-medium text-gray-900">
                  {service.guestName}
                </span>
                <span>•</span>
                <span>Hab. {service.roomNumber}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Service Information */}
          <Card className="mb-6">
            <Card.Header>
              <h4 className="font-medium text-gray-900">Información del Servicio</h4>
            </Card.Header>
            <Card.Content className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Hotel</p>
                    <p className="font-medium">
                      {typeof service.hotel === 'object' ? service.hotel.name : service.hotel}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Repartidor</p>
                    <p className="font-medium">
                      {typeof service.repartidor === 'object' ? service.repartidor.name : service.repartidor || 'No asignado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Bolsas</p>
                    <p className="font-medium">{service.bagCount}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Weight className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500">Peso</p>
                    <p className="font-medium">{service.weight || 'N/A'} kg</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500 text-sm">Fecha de recogida</p>
                  <p className="font-medium text-sm">
                    {formatDate(service.pickupDate || service.timestamp)}
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Bag Labeling Section */}
          <Card className="mb-6">
            <Card.Header>
              <h4 className="font-medium text-gray-900">
                Subir Imágenes de Rótulos ({bagLabels.filter(l => l.photo).length}/{service.bagCount})
              </h4>
              <p className="text-sm text-gray-600">
                Suba una imagen del rótulo físico para cada bolsa
              </p>
            </Card.Header>
            <Card.Content className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bagLabels.map((label) => (
                  <div key={label.bagNumber} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-medium text-gray-900">
                        Bolsa {label.bagNumber}
                      </h5>
                      <Tag className="h-4 w-4 text-gray-400" />
                    </div>
                    
                    <div className="text-xs text-gray-600 mb-3 font-mono bg-gray-50 p-2 rounded">
                      {label.labelCode}
                    </div>

                    {label.preview ? (
                      <div className="relative">
                        <img 
                          src={label.preview} 
                          alt={`Rótulo bolsa ${label.bagNumber}`}
                          className="w-full h-32 object-cover rounded border"
                        />
                        <button
                          onClick={() => removePhoto(label.bagNumber)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoChange(label.bagNumber, e)}
                          className="hidden"
                          id={`photo-${label.bagNumber}`}
                        />
                        <label 
                          htmlFor={`photo-${label.bagNumber}`}
                          className="cursor-pointer"
                        >
                          <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            Subir imagen
                          </p>
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              onClick={handleSubmit}
              disabled={!allPhotosUploaded() || submitting}
              loading={submitting}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Completar Rotulado
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RotuladoForm;