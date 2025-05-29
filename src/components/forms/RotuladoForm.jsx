import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNotifications } from '../../store/NotificationContext';
import { serviceStorage, bagLabelStorage } from '../../utils/storage';
import { SERVICE_STATUS } from '../../types';
import { formatDate } from '../../utils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { Camera, Tag, Package, CheckCircle, X, Upload } from 'lucide-react';

const RotuladoForm = ({ service, onClose, onStatusUpdated }) => {
  const { success, error } = useNotifications();
  const [bagLabels, setBagLabels] = useState([]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      observations: ''
    }
  });

  useEffect(() => {
    // Load existing bag labels for this service
    const existingLabels = bagLabelStorage.getBagLabelsByService(service.id);
    setBagLabels(existingLabels.map(label => ({
      ...label,
      photo: label.photo || null,
      dragActive: false
    })));
  }, [service.id]);

  const handleDrag = (e, labelId) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setBagLabels(prev => 
        prev.map(label => 
          label.id === labelId 
            ? { ...label, dragActive: true }
            : label
        )
      );
    } else if (e.type === "dragleave") {
      setBagLabels(prev => 
        prev.map(label => 
          label.id === labelId 
            ? { ...label, dragActive: false }
            : label
        )
      );
    }
  };

  const handleDrop = (e, labelId) => {
    e.preventDefault();
    e.stopPropagation();
    setBagLabels(prev => 
      prev.map(label => 
        label.id === labelId 
          ? { ...label, dragActive: false }
          : label
      )
    );
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files, labelId);
    }
  };

  const handleFileChange = (e, labelId) => {
    if (e.target.files) {
      handleFiles(e.target.files, labelId);
    }
  };

  const handleFiles = (files, labelId) => {
    const file = files[0]; // Solo tomar el primer archivo
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newPhoto = {
          id: Date.now() + Math.random(),
          file: file,
          url: e.target.result,
          name: file.name,
          size: file.size,
          timestamp: new Date().toISOString()
        };
        
        setBagLabels(prev => 
          prev.map(label => 
            label.id === labelId 
              ? { ...label, photo: newPhoto, updatedAt: new Date().toISOString() }
              : label
          )
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (labelId) => {
    setBagLabels(prev => 
      prev.map(label => 
        label.id === labelId 
          ? { ...label, photo: null, updatedAt: new Date().toISOString() }
          : label
      )
    );
  };

  const handleLabelUpdate = (labelId, field, value) => {
    setBagLabels(prev => 
      prev.map(label => 
        label.id === labelId 
          ? { ...label, [field]: value, updatedAt: new Date().toISOString() }
          : label
      )
    );
  };

  const addNewLabel = () => {
    // Validate that we don't exceed the service bag count
    if (bagLabels.length >= service.bagCount) {
      error('Límite Excedido', `No puede agregar más de ${service.bagCount} rótulos. Este servicio solo tiene ${service.bagCount} bolsas.`);
      return;
    }

    const newLabel = {
      id: Date.now() + Math.random(),
      serviceId: service.id,
      hotelId: service.hotelId,
      hotelName: service.hotel,
      label: '',
      bagNumber: bagLabels.length + 1,
      registeredBy: 'current_user', // TODO: Get from auth context
      registeredByName: 'Usuario Actual',
      timestamp: new Date().toISOString(),
      status: 'pending',
      generatedAt: 'lavanderia',
      observations: '',
      photo: null,
      dragActive: false
    };
    setBagLabels(prev => [...prev, newLabel]);
  };

  const removeLabel = (labelId) => {
    setBagLabels(prev => prev.filter(label => label.id !== labelId));
  };

  const onSubmit = async (data) => {
    try {
      // Validate that we have labels for the service
      if (bagLabels.length === 0) {
        error('Error', 'Debe agregar al menos un rótulo');
        return;
      }

      // Validate that number of labels matches service bag count
      if (bagLabels.length !== service.bagCount) {
        error(
          'Error de Validación', 
          `Debe crear exactamente ${service.bagCount} rótulos para este servicio. Actualmente tiene ${bagLabels.length} rótulos.`
        );
        return;
      }

      // Validate that all labels have content
      const invalidLabels = bagLabels.filter(label => !label.label || label.label.trim() === '');
      if (invalidLabels.length > 0) {
        error('Error', 'Todos los rótulos deben tener contenido');
        return;
      }

      // Validate that each bag label has a photo
      const labelsWithoutPhotos = bagLabels.filter(label => !label.photo);
      if (labelsWithoutPhotos.length > 0) {
        error('Fotos Requeridas', `Faltan fotos para ${labelsWithoutPhotos.length} rótulo(s). Cada rótulo debe tener su foto correspondiente.`);
        return;
      }

      // Save/update bag labels with their individual photos
      bagLabels.forEach(label => {
        const labelData = {
          ...label,
          status: 'labeled',
          labeledAt: new Date().toISOString(),
          photo: label.photo ? label.photo.url : null // Store the photo URL
        };
        
        if (label.id.toString().includes('.')) {
          // New label, add it
          bagLabelStorage.addBagLabel(labelData);
        } else {
          // Existing label, update it
          bagLabelStorage.updateBagLabel(label.id, labelData);
        }
      });

      // Update service status
      const services = serviceStorage.getServices();
      const photosCount = bagLabels.filter(label => label.photo).length;
      const updatedServices = services.map(s => {
        if (s.id === service.id) {
          return {
            ...s,
            status: SERVICE_STATUS.LABELED,
            labeledDate: new Date().toISOString(),
            internalNotes: (s.internalNotes || '') + 
              ` | Rotulado completado - ${bagLabels.length} rótulos creados - ${photosCount} fotos individuales agregadas - ${new Date().toLocaleString('es-PE')}`
          };
        }
        return s;
      });

      serviceStorage.setServices(updatedServices);

      success(
        'Rotulado Completado',
        `Se han registrado ${bagLabels.length} rótulos, cada uno con su foto correspondiente`
      );

      if (onStatusUpdated) {
        onStatusUpdated();
      }

      if (onClose) {
        onClose();
      }

    } catch (err) {
      console.error('Error completing labeling:', err);
      error('Error', 'Ocurrió un error al completar el rotulado');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <Tag className="h-6 w-6 mr-2 text-blue-600" />
                Rotulado de Bolsas
              </h3>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  <strong>Cliente:</strong> {service.guestName} - Hab. {service.roomNumber}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Hotel:</strong> {service.hotel}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Bolsas:</strong> {service.bagCount}
                </p>
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Bag Labels Section */}
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 mr-2 text-green-600" />
                    <h4 className="text-lg font-medium text-gray-900">
                      Rótulos de Bolsas ({bagLabels.length})
                    </h4>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNewLabel}
                  >
                    <Tag className="h-4 w-4 mr-1" />
                    Agregar Rótulo
                  </Button>
                </div>
              </Card.Header>
              <Card.Content>
                {bagLabels.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No hay rótulos registrados</p>
                    <p className="text-sm">Haz clic en "Agregar Rótulo" para comenzar</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bagLabels.map((label, index) => (
                      <div key={label.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-900">
                            Bolsa #{label.bagNumber}
                          </h5>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLabel(label.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Código de Rótulo *
                            </label>
                            <input
                              type="text"
                              value={label.label}
                              onChange={(e) => handleLabelUpdate(label.id, 'label', e.target.value)}
                              placeholder="Ej: HTL-20241127-1030-01-47"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Observaciones
                            </label>
                            <input
                              type="text"
                              value={label.observations || ''}
                              onChange={(e) => handleLabelUpdate(label.id, 'observations', e.target.value)}
                              placeholder="Observaciones especiales..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Foto de la Bolsa *
                            </label>
                            {!label.photo ? (
                              <div
                                className={`
                                  border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
                                  ${label.dragActive 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-gray-300 hover:border-gray-400'
                                  }
                                `}
                                onDragEnter={(e) => handleDrag(e, label.id)}
                                onDragLeave={(e) => handleDrag(e, label.id)}
                                onDragOver={(e) => handleDrag(e, label.id)}
                                onDrop={(e) => handleDrop(e, label.id)}
                                onClick={() => document.getElementById(`photo-upload-${label.id}`).click()}
                              >
                                <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                                <p className="text-xs text-gray-600 mb-1">
                                  Arrastra o haz clic
                                </p>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleFileChange(e, label.id)}
                                  className="hidden"
                                  id={`photo-upload-${label.id}`}
                                />
                              </div>
                            ) : (
                              <div className="relative">
                                <img
                                  src={label.photo.url}
                                  alt={`Foto ${label.label}`}
                                  className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => removePhoto(label.id)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                                <div className="mt-1 text-xs text-gray-500 truncate">
                                  {label.photo.name} ({(label.photo.size / 1024).toFixed(1)} KB)
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Content>
            </Card>


            {/* General Observations */}
            <Card>
              <Card.Content>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones Generales
                  </label>
                  <textarea
                    {...register('observations')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Observaciones adicionales sobre el proceso de rotulado..."
                  />
                </div>
              </Card.Content>
            </Card>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={bagLabels.length === 0}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Completar Rotulado ({bagLabels.length} rótulos con fotos)
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RotuladoForm;