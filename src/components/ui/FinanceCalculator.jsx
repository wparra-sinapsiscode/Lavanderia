import React, { useState } from 'react';
import { Calculator, Plus, Minus, X, Divide, Equal, Delete, RotateCcw } from 'lucide-react';
import Button from './Button';
import Card from './Card';

const FinanceCalculator = ({ onResult, title = "Calculadora Financiera" }) => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState([]);

  const inputNumber = (num) => {
    if (waitingForOperand) {
      setDisplay(String(num));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const clearEntry = () => {
    setDisplay('0');
  };

  const performOperation = (nextOperation) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
      
      // Add to history
      const calculation = `${currentValue} ${getOperationSymbol(operation)} ${inputValue} = ${newValue}`;
      setHistory(prev => [calculation, ...prev].slice(0, 5)); // Keep last 5 calculations
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue, secondValue, operation) => {
    switch (operation) {
      case 'add':
        return firstValue + secondValue;
      case 'subtract':
        return firstValue - secondValue;
      case 'multiply':
        return firstValue * secondValue;
      case 'divide':
        return secondValue !== 0 ? firstValue / secondValue : 0;
      default:
        return secondValue;
    }
  };

  const getOperationSymbol = (op) => {
    switch (op) {
      case 'add': return '+';
      case 'subtract': return '-';
      case 'multiply': return '×';
      case 'divide': return '÷';
      default: return '';
    }
  };

  const performEquals = () => {
    performOperation(null);
    setOperation(null);
    setPreviousValue(null);
    setWaitingForOperand(true);
  };

  const useResult = () => {
    const result = parseFloat(display);
    if (onResult && !isNaN(result)) {
      onResult(result);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value);
  };

  const CalculatorButton = ({ onClick, className, children, variant = "outline" }) => (
    <Button
      variant={variant}
      onClick={onClick}
      className={`h-12 text-lg font-medium ${className}`}
    >
      {children}
    </Button>
  );

  return (
    <Card className="w-full max-w-md">
      <Card.Header>
        <div className="flex items-center">
          <Calculator className="h-5 w-5 mr-2 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      </Card.Header>
      <Card.Content>
        {/* Display */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-gray-900 mb-1">
              {display}
            </div>
            <div className="text-sm text-gray-600">
              {formatCurrency(parseFloat(display) || 0)}
            </div>
            {operation && previousValue !== null && (
              <div className="text-xs text-blue-600">
                {previousValue} {getOperationSymbol(operation)}
              </div>
            )}
          </div>
        </div>

        {/* Calculator Buttons */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {/* First Row */}
          <CalculatorButton onClick={clear} className="text-red-600 hover:bg-red-50">
            C
          </CalculatorButton>
          <CalculatorButton onClick={clearEntry} className="text-orange-600 hover:bg-orange-50">
            CE
          </CalculatorButton>
          <CalculatorButton onClick={() => setDisplay(display.slice(0, -1) || '0')} className="text-gray-600">
            <Delete className="h-4 w-4" />
          </CalculatorButton>
          <CalculatorButton onClick={() => performOperation('divide')} className="text-blue-600 hover:bg-blue-50">
            <Divide className="h-4 w-4" />
          </CalculatorButton>

          {/* Second Row */}
          <CalculatorButton onClick={() => inputNumber(7)}>7</CalculatorButton>
          <CalculatorButton onClick={() => inputNumber(8)}>8</CalculatorButton>
          <CalculatorButton onClick={() => inputNumber(9)}>9</CalculatorButton>
          <CalculatorButton onClick={() => performOperation('multiply')} className="text-blue-600 hover:bg-blue-50">
            <X className="h-4 w-4" />
          </CalculatorButton>

          {/* Third Row */}
          <CalculatorButton onClick={() => inputNumber(4)}>4</CalculatorButton>
          <CalculatorButton onClick={() => inputNumber(5)}>5</CalculatorButton>
          <CalculatorButton onClick={() => inputNumber(6)}>6</CalculatorButton>
          <CalculatorButton onClick={() => performOperation('subtract')} className="text-blue-600 hover:bg-blue-50">
            <Minus className="h-4 w-4" />
          </CalculatorButton>

          {/* Fourth Row */}
          <CalculatorButton onClick={() => inputNumber(1)}>1</CalculatorButton>
          <CalculatorButton onClick={() => inputNumber(2)}>2</CalculatorButton>
          <CalculatorButton onClick={() => inputNumber(3)}>3</CalculatorButton>
          <CalculatorButton onClick={() => performOperation('add')} className="text-blue-600 hover:bg-blue-50">
            <Plus className="h-4 w-4" />
          </CalculatorButton>

          {/* Fifth Row */}
          <CalculatorButton onClick={() => inputNumber(0)} className="col-span-2">0</CalculatorButton>
          <CalculatorButton onClick={inputDecimal}>.</CalculatorButton>
          <CalculatorButton onClick={performEquals} variant="default" className="bg-green-600 hover:bg-green-700 text-white">
            <Equal className="h-4 w-4" />
          </CalculatorButton>
        </div>

        {/* Action Buttons */}
        {onResult && (
          <div className="mb-4">
            <Button onClick={useResult} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Usar Resultado: {formatCurrency(parseFloat(display) || 0)}
            </Button>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Historial</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistory([])}
                className="text-gray-500 hover:text-gray-700"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {history.map((calc, index) => (
                <div key={index} className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded">
                  {calc}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default FinanceCalculator;