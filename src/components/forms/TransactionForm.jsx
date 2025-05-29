import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../store/AuthContext';
import { useNotifications } from '../../store/NotificationContext';
import { financeStorage, hotelStorage, auditStorage } from '../../utils/storage';
import { formatCurrency } from '../../utils';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import FinanceCalculator from '../ui/FinanceCalculator';
import { DollarSign, Plus, Minus, Calculator, X, Building2, Tag, FileText } from 'lucide-react';

const TransactionForm = ({ onClose, onTransactionAdded, initialType = 'income' }) => {
  const { user } = useAuth();
  const { success, error } = useNotifications();
  const [showCalculator, setShowCalculator] = useState(false);
  const [hotels] = useState(hotelStorage.getHotels());

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      type: initialType,
      amount: '',
      description: '',
      category: '',
      hotelId: '',
      paymentMethod: 'cash',
      reference: ''
    }
  });

  const watchedType = watch('type');
  const watchedAmount = watch('amount');

  const incomeCategories = [
    'servicio_lavanderia',
    'pago_hotel',
    'servicio_premium',
    'recargo_urgente',
    'otros_ingresos'
  ];

  const expenseCategories = [
    'suministros_lavanderia',
    'combustible_transporte',
    'mantenimiento_equipos',
    'salarios_personal',
    'servicios_publicos',
    'marketing_publicidad',
    'otros_gastos'
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'bank_transfer', label: 'Transferencia Bancaria' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'yape', label: 'Yape' },
    { value: 'plin', label: 'Plin' },
    { value: 'other', label: 'Otro' }
  ];

  const getCategoryLabel = (category) => {
    const labels = {
      // Income categories
      servicio_lavanderia: 'Servicio de Lavandería',
      pago_hotel: 'Pago de Hotel',
      servicio_premium: 'Servicio Premium',
      recargo_urgente: 'Recargo por Urgencia',
      otros_ingresos: 'Otros Ingresos',
      // Expense categories
      suministros_lavanderia: 'Suministros de Lavandería',
      combustible_transporte: 'Combustible y Transporte',
      mantenimiento_equipos: 'Mantenimiento de Equipos',
      salarios_personal: 'Salarios del Personal',
      servicios_publicos: 'Servicios Públicos',
      marketing_publicidad: 'Marketing y Publicidad',
      otros_gastos: 'Otros Gastos'
    };
    return labels[category] || category;
  };

  const onSubmit = async (data) => {
    try {
      if (!data.amount || parseFloat(data.amount) <= 0) {
        error('Error', 'El monto debe ser mayor a 0');
        return;
      }

      const transaction = {
        type: data.type,
        amount: parseFloat(data.amount),
        description: data.description,
        category: data.category,
        hotelId: data.hotelId || null,
        hotelName: data.hotelId ? hotels.find(h => h.id === data.hotelId)?.name : null,
        paymentMethod: data.paymentMethod,
        reference: data.reference,
        registeredBy: user.id,
        registeredByName: user.name
      };

      const success_result = financeStorage.addTransaction(transaction);

      if (success_result) {
        // Add audit log
        auditStorage.addAuditEntry({
          action: data.type === 'income' ? 'INCOME_REGISTERED' : 'EXPENSE_REGISTERED',
          user: user.name,
          details: `${data.type === 'income' ? 'Ingreso' : 'Gasto'} registrado: ${formatCurrency(data.amount)} - ${data.description}`
        });

        success(
          data.type === 'income' ? 'Ingreso Registrado' : 'Gasto Registrado',
          `${data.type === 'income' ? 'Ingreso' : 'Gasto'} de ${formatCurrency(data.amount)} registrado exitosamente`
        );

        if (onTransactionAdded) {
          onTransactionAdded(transaction);
        }

        if (onClose) {
          onClose();
        }
      } else {
        error('Error', 'No se pudo registrar la transacción');
      }
    } catch (err) {
      console.error('Error creating transaction:', err);
      error('Error', 'Ocurrió un error al registrar la transacción');
    }
  };

  const handleCalculatorResult = (result) => {
    setValue('amount', result.toString());
    setShowCalculator(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                {watchedType === 'income' ? (
                  <Plus className="h-6 w-6 mr-2 text-green-600" />
                ) : (
                  <Minus className="h-6 w-6 mr-2 text-red-600" />
                )}
                {watchedType === 'income' ? 'Registrar Ingreso' : 'Registrar Gasto'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Registra un nuevo {watchedType === 'income' ? 'ingreso' : 'gasto'} en el sistema
              </p>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className="lg:col-span-2">
              <Card>
                <Card.Content className="p-6">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Transaction Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Transacción <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            value="income"
                            {...register('type', { required: 'Debe seleccionar un tipo' })}
                            className="form-radio text-green-600"
                          />
                          <div className="flex items-center text-green-700">
                            <Plus className="h-4 w-4 mr-1" />
                            <span>Ingreso</span>
                          </div>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            value="expense"
                            {...register('type', { required: 'Debe seleccionar un tipo' })}
                            className="form-radio text-red-600"
                          />
                          <div className="flex items-center text-red-700">
                            <Minus className="h-4 w-4 mr-1" />
                            <span>Gasto</span>
                          </div>
                        </label>
                      </div>
                      {errors.type && (
                        <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
                      )}
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monto <span className="text-red-500">*</span>
                      </label>
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register('amount', {
                              required: 'El monto es requerido',
                              min: { value: 0.01, message: 'El monto debe ser mayor a 0' }
                            })}
                            error={errors.amount?.message}
                            placeholder="0.00"
                            icon={DollarSign}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowCalculator(!showCalculator)}
                          className="px-3"
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </div>
                      {watchedAmount && (
                        <p className="text-sm text-gray-600 mt-1">
                          {formatCurrency(parseFloat(watchedAmount) || 0)}
                        </p>
                      )}
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categoría <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register('category', { required: 'Debe seleccionar una categoría' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Seleccionar categoría...</option>
                        {(watchedType === 'income' ? incomeCategories : expenseCategories).map((category) => (
                          <option key={category} value={category}>
                            {getCategoryLabel(category)}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
                      )}
                    </div>

                    {/* Hotel (for income) */}
                    {watchedType === 'income' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hotel (opcional)
                        </label>
                        <select
                          {...register('hotelId')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Sin asociar a hotel específico</option>
                          {hotels.map((hotel) => (
                            <option key={hotel.id} value={hotel.id}>
                              {hotel.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        {...register('description', {
                          required: 'La descripción es requerida',
                          minLength: { value: 3, message: 'La descripción debe tener al menos 3 caracteres' }
                        })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Describe el concepto de esta transacción..."
                      />
                      {errors.description && (
                        <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Método de Pago
                      </label>
                      <select
                        {...register('paymentMethod')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {paymentMethods.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reference */}
                    <div>
                      <Input
                        label="Referencia (opcional)"
                        {...register('reference')}
                        placeholder="Número de recibo, factura, etc."
                        icon={Tag}
                      />
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex space-x-4">
                      <Button type="submit" className="flex-1">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Registrar {watchedType === 'income' ? 'Ingreso' : 'Gasto'}
                      </Button>
                      {onClose && (
                        <Button type="button" variant="outline" onClick={onClose}>
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </form>
                </Card.Content>
              </Card>
            </div>

            {/* Calculator Section */}
            <div className="lg:col-span-1">
              {showCalculator && (
                <FinanceCalculator
                  onResult={handleCalculatorResult}
                  title="Calculadora"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionForm;