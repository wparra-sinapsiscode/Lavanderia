import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { useNotifications } from '../../store/NotificationContext';
import { bagLabelStorage, serviceStorage } from '../../utils/storage';
import serviceService from '../../services/service.service';
import bagLabelService from '../../services/bagLabel.service';
import { SERVICE_STATUS } from '../../types';
import { formatDate } from '../../utils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Camera, Tag, Package, CheckCircle, X, Upload, User, MapPin, Calendar, Weight } from 'lucide-react';

const RotuladoForm = ({ service, onClose, onStatusUpdated, viewMode = false, existingLabels = [] }) => {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const [labelCodes, setLabelCodes] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bulkQuantity, setBulkQuantity] = useState('');
  const [existingDbLabels, setExistingDbLabels] = useState([]);

  useEffect(() => {
    if (service?.id) {
      loadExistingLabels();
    }
  }, [service?.id]);

  useEffect(() => {
    if (viewMode && existingLabels.length > 0) {
      // En modo vista, mostrar los rótulos existentes
      setLabelCodes(existingLabels.map((label, index) => ({
        id: index + 1,
        code: label.label || '',
      })));
      setPhotos(existingLabels.map((label, index) => ({
        id: index + 1,
        file: null,
        preview: label.photo,
        uploaded: true
      })));
    } else if (viewMode && existingDbLabels.length > 0) {
      // En modo vista, mostrar los rótulos de la base de datos
      setLabelCodes(existingDbLabels.map((label, index) => ({
        id: index + 1,
        code: label.label || '',
      })));
      setPhotos(existingDbLabels.map((label, index) => ({
        id: index + 1,
        file: null,
        preview: label.photo ? `http://localhost:5000${label.photo}` : null,
        uploaded: true
      })));
    } else {
      // En modo edición, inicializar con un rótulo vacío
      initializeFields();
    }
  }, [service.id, viewMode, existingLabels, existingDbLabels]);

  const loadExistingLabels = async () => {
    try {
      const response = await bagLabelService.getServiceLabels(service.id);
      if (response.success && response.data) {
        setExistingDbLabels(response.data);
        console.log('Rótulos existentes cargados:', response.data);
      }
    } catch (error) {
      console.error('Error al cargar rótulos existentes:', error);
    }
  };

  const initializeFields = () => {
    // Inicializar con un rótulo y sin fotos
    setLabelCodes([{ id: 1, code: generateLabelCode(1) }]);
    setPhotos([]);
  };

  const generateLabelCode = (sequence) => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const serviceShort = service.id.slice(-4).toUpperCase();
    return `ROT-${dateStr}-${serviceShort}-${sequence.toString().padStart(2, '0')}`;
  };

  // Funciones para manejar códigos de rótulos
  const addLabelCode = () => {
    const newId = Math.max(...labelCodes.map(l => l.id), 0) + 1;
    const newCode = generateLabelCode(newId);
    setLabelCodes([...labelCodes, { id: newId, code: newCode }]);
  };

  const removeLabelCode = (id) => {
    if (labelCodes.length > 1) {
      setLabelCodes(labelCodes.filter(label => label.id !== id));
    }
  };

  const updateLabelCode = (id, newCode) => {
    setLabelCodes(labelCodes.map(label => 
      label.id === id ? { ...label, code: newCode } : label
    ));
  };

  // Función para generar múltiples rótulos automáticamente
  const generateBulkLabels = () => {
    const targetTotal = parseInt(bulkQuantity);
    
    if (!targetTotal || targetTotal < 1) {
      showNotification({
        type: 'error',
        message: 'Ingrese una cantidad válida (mínimo 1)'
      });
      return;
    }
    
    if (targetTotal > 100) {
      showNotification({
        type: 'error',
        message: 'No se pueden generar más de 100 rótulos a la vez'
      });
      return;
    }

    const currentCount = labelCodes.length;
    
    // Si ya tenemos la cantidad deseada o más
    if (currentCount >= targetTotal) {
      showNotification({
        type: 'warning',
        message: `Ya tienes ${currentCount} rótulos. No se necesita generar más para llegar a ${targetTotal}.`
      });
      return;
    }

    // Calcular cuántos rótulos necesitamos generar
    const quantityToGenerate = targetTotal - currentCount;

    // Confirmar la operación
    if (currentCount > 0) {
      const confirmed = window.confirm(
        `Actualmente tienes ${currentCount} rótulo${currentCount !== 1 ? 's' : ''}.\nPara llegar a ${targetTotal} rótulos necesitas generar ${quantityToGenerate} más.\n\n¿Proceder?`
      );
      
      if (!confirmed) {
        return;
      }
    }

    // Generar los nuevos rótulos
    const newLabels = [];
    const startingId = Math.max(...labelCodes.map(l => l.id), 0) + 1;
    
    for (let i = 0; i < quantityToGenerate; i++) {
      const id = startingId + i;
      const code = generateLabelCode(id);
      newLabels.push({ id, code });
    }

    // Agregar a los existentes
    setLabelCodes(prev => [...prev, ...newLabels]);
    setBulkQuantity(''); // Limpiar el campo

    showNotification({
      type: 'success',
      message: `Se generaron ${quantityToGenerate} rótulos adicionales. Total: ${targetTotal} rótulos.`
    });
  };

  // Funciones para manejar fotos
  const addPhoto = () => {
    const newId = Math.max(...photos.map(p => p.id), 0) + 1;
    setPhotos([...photos, { id: newId, file: null, preview: null, uploaded: false }]);
  };

  const removePhoto = (id) => {
    setPhotos(photos.filter(photo => photo.id !== id));
  };

  const handlePhotoChange = (photoId, event) => {
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
      setPhotos(prev => 
        prev.map(photo => 
          photo.id === photoId
            ? { ...photo, file: file, preview: e.target.result, uploaded: false }
            : photo
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const allRequiredFieldsFilled = () => {
    // Al menos un código de rótulo no vacío
    const hasValidCodes = labelCodes.some(label => label.code.trim() !== '');
    return hasValidCodes;
  };

  const handleSubmit = async () => {
    if (!allRequiredFieldsFilled()) {
      showNotification({
        type: 'error',
        message: 'Debe completar al menos un código de rótulo'
      });
      return;
    }

    setSubmitting(true);

    try {
      // Intentar guardar fotos usando el mismo sistema que el formulario de recogida
      let apiSuccess = false;
      
      try {
        // Preparar datos de rótulos para enviar al backend
        const labelsToCreate = [];
        
        // Extraer solo los archivos File de las fotos
        const photoFiles = photos.map(photo => photo.file).filter(file => file instanceof File);
        
        // Crear rótulos con y sin fotos
        labelCodes.forEach((label, index) => {
          const labelData = {
            label: label.code,
            bagNumber: index + 1,
            photo: null, // Se actualizará si hay foto correspondiente
            observations: null
          };
          labelsToCreate.push(labelData);
        });
        
        // Si hay fotos, subirlas primero
        let uploadedPhotoUrls = [];
        if (photoFiles.length > 0) {
          const photoResponse = await serviceService.uploadServicePhotos(service.id, photoFiles, 'labeling');
          
          if (photoResponse.success && photoResponse.data && photoResponse.data.photos) {
            uploadedPhotoUrls = photoResponse.data.photos;
          }
        }
        
        // Asignar fotos a rótulos (si hay fotos disponibles)
        uploadedPhotoUrls.forEach((photoUrl, index) => {
          if (index < labelsToCreate.length) {
            labelsToCreate[index].photo = photoUrl;
          }
        });
        
        // Crear rótulos en la base de datos usando el nuevo endpoint
        const labelsResponse = await bagLabelService.createLabels(service.id, labelsToCreate);
        
        if (labelsResponse.success) {
          // Solo marcar como LABELED - NO cambiar automáticamente a IN_PROCESS
          const finalStatus = 'LABELED';
          const statusMessage = uploadedPhotoUrls.length > 0 
            ? `Rotulado completado con ${uploadedPhotoUrls.length} fotos por ${user.name}`
            : `Rotulado completado por ${user.name}`;
          
          // Actualizar estado del servicio
          const statusResponse = await serviceService.updateServiceStatus(service.id, {
            status: finalStatus,
            internalNotes: `${statusMessage} - ${new Date().toLocaleString()}\nRótulos: ${labelCodes.map(l => l.code).join(', ')}\nFotos: ${uploadedPhotoUrls.length}`
          });
          
          if (statusResponse.success) {
            apiSuccess = true;
            
            // Guardar información de rótulos en storage local como respaldo
            labelsToCreate.forEach((labelData, index) => {
              const localLabelData = {
                id: `label-${service.id}-${index + 1}`,
                serviceId: service.id,
                hotelId: service.hotel?.id || service.hotelId,
                bagNumber: labelData.bagNumber,
                label: labelData.label,
                photo: labelData.photo,
                registeredById: user.id,
                timestamp: new Date().toISOString(),
                status: 'LABELED',
                generatedAt: 'LAVANDERIA'
              };
              
              bagLabelStorage.addBagLabel(localLabelData);
            });
          }
        } else {
          // Si falla la creación de rótulos, al menos actualizar el estado del servicio
          const finalStatus = uploadedPhotoUrls.length > 0 ? 'IN_PROCESS' : 'LABELED';
          const statusMessage = uploadedPhotoUrls.length > 0 
            ? `Rotulado completado con ${uploadedPhotoUrls.length} fotos - Proceso iniciado automáticamente por ${user.name}`
            : `Rotulado completado por ${user.name}`;
            
          const statusResponse = await serviceService.updateServiceStatus(service.id, {
            status: finalStatus,
            internalNotes: `${statusMessage} - ${new Date().toLocaleString()}\nRótulos: ${labelCodes.map(l => l.code).join(', ')} (guardado localmente)`
          });
          
          if (statusResponse.success) {
            apiSuccess = true;
          }
        }
      } catch (apiError) {
        console.warn('Error en API, guardando localmente:', apiError);
      }

      // Si la API falló, guardar todo localmente
      if (!apiSuccess) {
        // Guardar rótulos en storage local
        labelCodes.forEach((label, index) => {
          const labelData = {
            id: `label-${service.id}-${label.id}`,
            serviceId: service.id,
            hotelId: service.hotel?.id || service.hotelId,
            bagNumber: index + 1,
            label: label.code,
            photo: null, // Solo guardar fotos base64 localmente si es absolutamente necesario
            registeredById: user.id,
            timestamp: new Date().toISOString(),
            status: 'LABELED',
            generatedAt: 'LAVANDERIA'
          };
          
          bagLabelStorage.addBagLabel(labelData);
        });

        // Actualizar estado del servicio localmente
        const services = serviceStorage.getServices();
        const photoFiles = photos.filter(p => p.preview).map(photo => photo.preview);
        const finalLocalStatus = SERVICE_STATUS.LABELED; // Solo LABELED, no automático
        const statusMessage = photoFiles.length > 0 
          ? `Rotulado completado con ${photoFiles.length} fotos por ${user.name}`
          : `Rotulado completado por ${user.name}`;
        
        const updatedServices = services.map(s => {
          if (s.id === service.id) {
            const updatedService = {
              ...s,
              status: finalLocalStatus,
              labeledDate: new Date().toISOString(),
              labelingPhotos: photoFiles, // Solo previews válidos
              internalNotes: (s.internalNotes || '') + 
                `\n[${new Date().toLocaleString()}] ${statusMessage}\nRótulos: ${labelCodes.map(l => l.code).join(', ')}`,
              syncPending: true
            };
            
            // Nota: No se agrega processStartDate aquí - se hará cuando manualmente se cambie a EN_PROCESS
            
            return updatedService;
          }
          return s;
        });
        
        serviceStorage.setServices(updatedServices);
      }

      // Determinar mensaje basado en si hay fotos
      const photoCount = photos.filter(p => p.preview).length;
      const successMessage = photoCount > 0 
        ? `¡Rotulado completado! ${labelCodes.length} rótulo${labelCodes.length !== 1 ? 's' : ''} con ${photoCount} foto${photoCount !== 1 ? 's' : ''}. Ahora puedes hacer clic en "En Proceso" para continuar.`
        : `Rotulado completado exitosamente para ${service.guestName}. ${labelCodes.length} rótulo${labelCodes.length !== 1 ? 's' : ''} registrado${labelCodes.length !== 1 ? 's' : ''}.`;
      
      showNotification({
        type: 'success',
        message: successMessage
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
                {viewMode ? 'Ver Rotulado' : 'Rotulado de Servicio'}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="font-medium text-gray-900">
                  {service.guestName}
                </span>
                <span>•</span>
                <span>Hab. {service.roomNumber}</span>
              </div>
              {(viewMode || existingDbLabels.length > 0) && (
                <div className="mt-2 flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Rotulado completado ({existingDbLabels.length} rótulos en base de datos)</span>
                </div>
              )}
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

          {/* Label Codes Section */}
          <Card className="mb-6">
            <Card.Header>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Códigos de Rótulos
                  </h4>
                  <p className="text-sm text-gray-600">
                    {viewMode ? 'Códigos de rótulos registrados' : 'Agregue los códigos de rótulos necesarios'}
                  </p>
                </div>
                
                {!viewMode && existingDbLabels.length === 0 && (
                  <div className="flex items-center space-x-2 bg-blue-50 p-3 rounded-lg">
                    <label className="text-sm font-medium text-blue-900 whitespace-nowrap">
                      Generar automático:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={bulkQuantity}
                      onChange={(e) => setBulkQuantity(e.target.value)}
                      placeholder="25"
                      className="w-20 px-2 py-1 border border-blue-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={generateBulkLabels}
                      disabled={!bulkQuantity || parseInt(bulkQuantity) < 1}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Completar a {bulkQuantity || 'X'} rótulos
                    </button>
                  </div>
                )}
              </div>
            </Card.Header>
            <Card.Content className="p-4">
              <div className="space-y-3">
                {labelCodes.map((label, index) => (
                  <div key={label.id} className="flex items-center space-x-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={label.code}
                        onChange={(e) => updateLabelCode(label.id, e.target.value)}
                        disabled={viewMode || existingDbLabels.length > 0}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                        placeholder="Código del rótulo"
                      />
                    </div>
                    {!viewMode && labelCodes.length > 1 && (
                      <button
                        onClick={() => removeLabelCode(label.id)}
                        className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                        title="Eliminar este rótulo"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                
                {!viewMode && labelCodes.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <button
                      onClick={addLabelCode}
                      className="w-full px-4 py-2 border-2 border-dashed border-green-300 rounded-md text-green-600 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-colors flex items-center justify-center"
                    >
                      + Agregar otro código de rótulo
                    </button>
                  </div>
                )}
                
                {!viewMode && labelCodes.length === 0 && (
                  <button
                    onClick={addLabelCode}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:border-gray-400 hover:text-gray-700"
                  >
                    + Agregar primer rótulo
                  </button>
                )}
              </div>
            </Card.Content>
          </Card>

          {/* Photos Section */}
          <Card className="mb-6">
            <Card.Header>
              <h4 className="font-medium text-gray-900">
                Fotos de Rótulos {!viewMode && `(${photos.filter(p => p.preview).length})`}
              </h4>
              <p className="text-sm text-gray-600">
                {viewMode ? 'Fotos de los rótulos físicos' : 'Suba fotos de los rótulos (opcional)'}
              </p>
            </Card.Header>
            <Card.Content className="p-4">
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative">
                      {photo.preview ? (
                        <div className="relative">
                          <img 
                            src={photo.preview} 
                            alt={`Foto de rótulo`}
                            className="w-full h-32 object-cover rounded border"
                          />
                          {!viewMode && (
                            <>
                              <button
                                onClick={() => removePhoto(photo.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <button
                                onClick={addPhoto}
                                className="absolute bottom-1 right-1 bg-green-500 text-white rounded-full p-1 hover:bg-green-600"
                              >
                                +
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        !viewMode && (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors h-32 flex flex-col justify-center">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoChange(photo.id, e)}
                              className="hidden"
                              id={`photo-${photo.id}`}
                            />
                            <label 
                              htmlFor={`photo-${photo.id}`}
                              className="cursor-pointer"
                            >
                              <Camera className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                              <p className="text-xs text-gray-600">
                                Subir foto
                              </p>
                            </label>
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                !viewMode && (
                  <button
                    onClick={addPhoto}
                    className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-700 flex flex-col items-center"
                  >
                    <Camera className="h-8 w-8 mb-2" />
                    <span>+ Agregar primera foto</span>
                  </button>
                )
              )}
            </Card.Content>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            {(viewMode || existingDbLabels.length > 0) ? (
              <div className="flex-1">
                <Button
                  onClick={onClose}
                  className="w-full"
                >
                  Cerrar
                </Button>
                {existingDbLabels.length > 0 && (
                  <div className="mt-2 text-center text-sm text-gray-600">
                    {existingDbLabels.length} rótulo{existingDbLabels.length !== 1 ? 's' : ''} guardado{existingDbLabels.length !== 1 ? 's' : ''} en la base de datos
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button
                  onClick={handleSubmit}
                  disabled={!allRequiredFieldsFilled() || submitting}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RotuladoForm;