import React, { useState } from 'react';
import { previewMigration, migrateExistingServices } from '../../utils/financialMigration';
import { useNotifications } from '../../store/NotificationContext';
import Button from './Button';
import Card from './Card';
import { AlertTriangle, CheckCircle, Database, DollarSign, Package } from 'lucide-react';

const FinancialMigrationTool = () => {
  const { success, error, info } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [migrationResults, setMigrationResults] = useState(null);
  const [showTool, setShowTool] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const previewData = previewMigration();
      setPreview(previewData);
      
      if (previewData.servicesWithoutPrice.length === 0 && 
          previewData.servicesWithoutTransaction.length === 0) {
        info('Todo al día', 'No hay servicios pendientes de migración');
      }
    } catch (err) {
      error('Error', 'No se pudo generar la vista previa');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (!preview) {
      error('Error', 'Primero debe generar una vista previa');
      return;
    }

    const totalToMigrate = preview.servicesWithoutPrice.length + 
                          preview.servicesWithoutTransaction.length;

    if (totalToMigrate === 0) {
      info('Sin cambios', 'No hay servicios para migrar');
      return;
    }

    const confirmed = window.confirm(
      `¿Está seguro de migrar ${totalToMigrate} servicios?\n\n` +
      `- ${preview.servicesWithoutPrice.length} servicios sin precio\n` +
      `- ${preview.servicesWithoutTransaction.length} servicios sin transacción\n\n` +
      `Ingreso potencial: S/ ${preview.totalPotentialIncome.toFixed(2)}`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const results = migrateExistingServices();
      setMigrationResults(results);
      
      success(
        'Migración Completada',
        `Se procesaron ${results.totalProcessed} servicios. ` +
        `${results.pricesCalculated} precios calculados, ` +
        `${results.transactionsCreated} transacciones creadas.`
      );
      
      // Limpiar preview ya que los datos cambiaron
      setPreview(null);
    } catch (err) {
      error('Error en Migración', 'Ocurrió un error durante la migración');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón para mostrar/ocultar herramienta */}
      <Button
        onClick={() => setShowTool(!showTool)}
        variant="outline"
        size="sm"
        className="mb-4"
      >
        <Database className="h-4 w-4 mr-2" />
        {showTool ? 'Ocultar' : 'Mostrar'} Herramienta de Migración
      </Button>

      {showTool && (
        <Card className="mb-6 border-orange-200">
          <Card.Header className="bg-orange-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Migración de Datos Financieros
                </h3>
              </div>
              <span className="text-sm text-orange-600 bg-orange-100 px-2 py-1 rounded">
                Herramienta Temporal
              </span>
            </div>
          </Card.Header>
          
          <Card.Content className="p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Esta herramienta revisa servicios existentes y:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-4">
                <li>Calcula precios faltantes (por peso o cantidad de bolsas)</li>
                <li>Crea transacciones financieras para servicios completados</li>
                <li>Asegura que todos los ingresos estén registrados</li>
              </ul>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-4 mb-6">
              <Button
                onClick={handlePreview}
                variant="outline"
                loading={loading}
                disabled={loading}
              >
                <Package className="h-4 w-4 mr-2" />
                Ver Vista Previa
              </Button>
              
              {preview && (preview.servicesWithoutPrice.length > 0 || 
                           preview.servicesWithoutTransaction.length > 0) && (
                <Button
                  onClick={handleMigrate}
                  loading={loading}
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Ejecutar Migración
                </Button>
              )}
            </div>

            {/* Vista previa */}
            {preview && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Resumen de Migración
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-blue-600">Sin Precio:</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {preview.servicesWithoutPrice.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-600">Sin Transacción:</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {preview.servicesWithoutTransaction.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-600">Ingreso Potencial:</p>
                      <p className="text-2xl font-bold text-blue-900">
                        S/ {preview.totalPotentialIncome.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Servicios sin precio */}
                {preview.servicesWithoutPrice.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">
                      Servicios sin Precio ({preview.servicesWithoutPrice.length})
                    </h5>
                    <div className="max-h-48 overflow-y-auto border rounded">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Cliente</th>
                            <th className="px-3 py-2 text-left">Hotel</th>
                            <th className="px-3 py-2 text-center">Peso/Bolsas</th>
                            <th className="px-3 py-2 text-right">Precio Est.</th>
                            <th className="px-3 py-2 text-center">Método</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {preview.servicesWithoutPrice.map(service => (
                            <tr key={service.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                {service.guest} - Hab. {service.room}
                              </td>
                              <td className="px-3 py-2">{service.hotel || 'N/A'}</td>
                              <td className="px-3 py-2 text-center">
                                {service.weight ? `${service.weight}kg` : `${service.bags} bolsas`}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                S/ {service.estimatedPrice.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-center text-xs">
                                {service.calculationMethod}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Servicios sin transacción */}
                {preview.servicesWithoutTransaction.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">
                      Servicios sin Transacción ({preview.servicesWithoutTransaction.length})
                    </h5>
                    <div className="max-h-48 overflow-y-auto border rounded">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Cliente</th>
                            <th className="px-3 py-2 text-left">Hotel</th>
                            <th className="px-3 py-2 text-center">Estado</th>
                            <th className="px-3 py-2 text-right">Precio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {preview.servicesWithoutTransaction.map(service => (
                            <tr key={service.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                {service.guest} - Hab. {service.room}
                              </td>
                              <td className="px-3 py-2">{service.hotel || 'N/A'}</td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {service.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                S/ {service.price.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resultados de migración */}
            {migrationResults && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <h5 className="font-medium text-green-900">
                    Migración Completada
                  </h5>
                </div>
                <div className="text-sm text-green-700">
                  <p>Total procesados: {migrationResults.totalProcessed}</p>
                  <p>Precios calculados: {migrationResults.pricesCalculated}</p>
                  <p>Transacciones creadas: {migrationResults.transactionsCreated}</p>
                  {migrationResults.errors.length > 0 && (
                    <p className="text-red-600 mt-2">
                      Errores: {migrationResults.errors.length}
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card.Content>
        </Card>
      )}
    </>
  );
};

export default FinancialMigrationTool;