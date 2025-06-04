import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import { formatCurrency, formatDate } from '../utils';
import transactionService from '../services/transaction.service';
import serviceService from '../services/service.service';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import TransactionForm from '../components/forms/TransactionForm';
import FinanceCalculator from '../components/ui/FinanceCalculator';
import FinancialMigrationTool from '../components/ui/FinancialMigrationTool';
import { 
  DollarSign, 
  Plus, 
  Minus, 
  TrendingUp, 
  TrendingDown, 
  Calculator,
  PieChart,
  BarChart3,
  Calendar,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

const Finance = () => {
  const { user } = useAuth();
  const { success, error } = useNotifications();
  const [transactions, setTransactions] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [selectedTransactionType, setSelectedTransactionType] = useState('income');
  const [showCalculator, setShowCalculator] = useState(false);
  const [dateFilter, setDateFilter] = useState('month');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    serviceRevenue: 0,
    transactionCount: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [transactions, services, dateFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar transacciones desde la base de datos
      const transactionResponse = await transactionService.getAllTransactions();
      const serviceResponse = await serviceService.getAllServices();
      
      if (transactionResponse.success) {
        const sortedTransactions = transactionResponse.data.sort((a, b) => 
          new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)
        );
        setTransactions(sortedTransactions);
      } else {
        console.warn('Error cargando transacciones:', transactionResponse.message);
        setTransactions([]);
      }
      
      if (serviceResponse.success) {
        setServices(serviceResponse.data);
      } else {
        console.warn('Error cargando servicios:', serviceResponse.message);
        setServices([]);
      }
      
    } catch (err) {
      console.error('Error loading financial data:', err);
      error('Error', 'No se pudieron cargar los datos financieros desde la base de datos');
      // Fallback a arrays vacíos
      setTransactions([]);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    try {
      const now = new Date();
      let startDate;

      // Calculate date range based on filter
      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0); // All time
      }

      // Filter transactions by date
      const filteredTransactions = transactions.filter(t => 
        new Date(t.timestamp) >= startDate
      );

      // Calculate service revenue
      const completedServices = services.filter(s => 
        s.status === 'COMPLETED' && 
        s.price && 
        new Date(s.deliveryDate || s.createdAt || s.timestamp) >= startDate
      );
      
      const serviceRevenue = completedServices.reduce((sum, service) => sum + (service.price || 0), 0);

      // Calculate transaction totals
      const incomeTransactions = filteredTransactions.filter(t => t.type === 'income');
      const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
      
      const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      setStats({
        totalIncome: totalIncome + serviceRevenue,
        totalExpenses,
        netProfit: (totalIncome + serviceRevenue) - totalExpenses,
        serviceRevenue,
        transactionCount: filteredTransactions.length
      });
    } catch (err) {
      console.error('Error calculating stats:', err);
    }
  };

  const handleTransactionAdded = () => {
    loadData();
    setShowTransactionForm(false);
  };

  const getFilteredTransactions = () => {
    let filtered = transactions;

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    // Filter by date
    const now = new Date();
    let startDate;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    filtered = filtered.filter(t => new Date(t.timestamp) >= startDate);

    return filtered;
  };

  const getCategoryBreakdown = () => {
    const breakdown = {};
    const filtered = getFilteredTransactions();

    filtered.forEach(transaction => {
      const category = transaction.category || 'sin_categoria';
      if (!breakdown[category]) {
        breakdown[category] = { income: 0, expense: 0 };
      }
      breakdown[category][transaction.type] += transaction.amount;
    });

    return Object.entries(breakdown).map(([category, amounts]) => ({
      category,
      income: amounts.income,
      expense: amounts.expense,
      net: amounts.income - amounts.expense
    }));
  };

  const StatCard = ({ title, value, icon: Icon, trend, color = "blue", subtitle }) => (
    <Card>
      <Card.Content className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold text-${color}-600`}>
              {typeof value === 'number' ? formatCurrency(value) : value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 bg-${color}-100 rounded-full`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center">
            {trend > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(trend)}%
            </span>
            <span className="text-sm text-gray-500 ml-1">vs período anterior</span>
          </div>
        )}
      </Card.Content>
    </Card>
  );

  // Mostrar loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center items-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando datos financieros...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión Financiera</h1>
          <p className="text-gray-600">Panel de control financiero y calculadora</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowCalculator(!showCalculator)}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculadora
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedTransactionType('expense');
              setShowTransactionForm(true);
            }}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Minus className="h-4 w-4 mr-2" />
            Registrar Gasto
          </Button>
          <Button
            onClick={() => {
              setSelectedTransactionType('income');
              setShowTransactionForm(true);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Registrar Ingreso
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <Card.Content className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Hoy</option>
                <option value="week">Esta Semana</option>
                <option value="month">Este Mes</option>
                <option value="year">Este Año</option>
                <option value="all">Todo el Tiempo</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas las Categorías</option>
                <option value="servicio_lavanderia">Servicio de Lavandería</option>
                <option value="suministros_lavanderia">Suministros</option>
                <option value="combustible_transporte">Transporte</option>
                <option value="otros_ingresos">Otros Ingresos</option>
                <option value="otros_gastos">Otros Gastos</option>
              </select>
            </div>
          </div>
        </Card.Content>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Stats Cards */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard
              title="Ingresos Totales"
              value={stats.totalIncome}
              icon={TrendingUp}
              color="green"
              subtitle={`${stats.transactionCount} transacciones`}
            />
            <StatCard
              title="Gastos Totales"
              value={stats.totalExpenses}
              icon={TrendingDown}
              color="red"
            />
            <StatCard
              title="Ganancia Neta"
              value={stats.netProfit}
              icon={DollarSign}
              color={stats.netProfit >= 0 ? "green" : "red"}
            />
            <StatCard
              title="Ingresos por Servicios"
              value={stats.serviceRevenue}
              icon={PieChart}
              color="blue"
              subtitle="Solo servicios completados"
            />
          </div>

          {/* Transactions List */}
          <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Transacciones Recientes
                  </h3>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </Card.Header>
              <Card.Content>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descripción
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Método
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredTransactions().slice(0, 10).map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(transaction.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.type === 'income' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.type === 'income' ? (
                                <Plus className="h-3 w-3 mr-1" />
                              ) : (
                                <Minus className="h-3 w-3 mr-1" />
                              )}
                              {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div>
                              <p className="font-medium">{transaction.description}</p>
                              {transaction.hotelName && (
                                <p className="text-xs text-gray-500">{transaction.hotelName}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${
                              transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.paymentMethod === 'cash' ? 'Efectivo' : 
                             transaction.paymentMethod === 'bank_transfer' ? 'Transferencia' :
                             transaction.paymentMethod === 'card' ? 'Tarjeta' :
                             transaction.paymentMethod}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {getFilteredTransactions().length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No hay transacciones registradas
                    </div>
                  )}
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Calculator Sidebar */}
          <div className="lg:col-span-1">
            {showCalculator && (
              <FinanceCalculator title="Calculadora Financiera" />
            )}
          </div>
        </div>

      {/* Category Breakdown */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Desglose por Categorías
          </h3>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getCategoryBreakdown().map(({ category, income, expense, net }) => (
              <div key={category} className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {category.replace('_', ' ').toUpperCase()}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">Ingresos:</span>
                    <span className="font-medium">{formatCurrency(income)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Gastos:</span>
                    <span className="font-medium">{formatCurrency(expense)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Neto:</span>
                    <span className={`font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(net)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <TransactionForm
          initialType={selectedTransactionType}
          onClose={() => setShowTransactionForm(false)}
          onTransactionAdded={handleTransactionAdded}
        />
      )}
    </div>
  );
};

export default Finance;