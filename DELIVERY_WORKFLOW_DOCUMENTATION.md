# Documentación del Flujo de Entrega de Servicios

## Resumen

Esta implementación automatiza la creación de servicios de entrega cuando un servicio de lavandería está listo para ser entregado al cliente. El sistema maneja tanto entregas completas como parciales, creando automáticamente nuevos servicios en la sección "Gestión de Entregas".

## Arquitectura del Sistema

### Componentes Principales

1. **ProcessDecisionModal.jsx** - Modal principal para decidir tipo de entrega
2. **ServiceWorkflowModal.jsx** - Modal de seguimiento que llama al ProcessDecisionModal
3. **RotuladoForm.jsx** - Formulario de rotulado que puede activar automáticamente IN_PROCESS

### Estados del Servicio

```javascript
SERVICE_STATUS = {
  PENDING_PICKUP: 'pendiente_recojo',
  ASSIGNED_TO_ROUTE: 'asignado_ruta', 
  PICKED_UP: 'recogido',
  LABELED: 'rotulado',
  IN_PROCESS: 'en_proceso',
  PARTIAL_DELIVERY: 'entrega_parcial',
  COMPLETED: 'completado',
  READY_FOR_DELIVERY: 'listo_entrega' // Para servicios de entrega
}
```

## Flujo de Trabajo Completo

### Paso 1: Rotulado con Fotos → IN_PROCESS Automático

**Ubicación**: `RotuladoForm.jsx` líneas 275-276

```javascript
// Si se suben fotos durante el rotulado, el servicio pasa automáticamente a IN_PROCESS
const finalStatus = uploadedPhotoUrls.length > 0 ? 'IN_PROCESS' : 'LABELED';
```

**¿Qué sucede?**
- Usuario completa rotulado con fotos
- Sistema detecta fotos y cambia estado automáticamente a "EN_PROCESO"
- Servicio queda listo para el siguiente paso

### Paso 2: Desde IN_PROCESS → Modal de Decisión de Entrega

**Ubicación**: `ServiceWorkflowModal.jsx` líneas 443-445

```javascript
// Click en ENTREGA cuando está en IN_PROCESS
else if (step.status === SERVICE_STATUS.PARTIAL_DELIVERY && normalizedServiceStatus === SERVICE_STATUS.IN_PROCESS) {
  setShowProcessDecision(true);
}
```

**¿Qué sucede?**
- Usuario hace click en "Entrega" en el workflow
- Se abre ProcessDecisionModal
- Usuario puede elegir entre entrega completa o parcial

### Paso 3A: Entrega Completa

**Ubicación**: `ProcessDecisionModal.jsx` líneas 62-76

```javascript
const handleComplete = () => {
  createDeliveryService(service.bagCount, 'COMPLETE');
  updateServiceStatus(SERVICE_STATUS.COMPLETED);
  // Notificación de éxito
};
```

**¿Qué sucede?**
- Se crea un nuevo servicio con estado `READY_FOR_DELIVERY`
- Servicio original cambia a `COMPLETED`
- Se incluyen todas las bolsas del servicio original

### Paso 3B: Entrega Parcial

**Ubicación**: `ProcessDecisionModal.jsx` líneas 78-107

```javascript
const handlePartial = () => {
  const deliveredBags = selectedBags.filter(bag => bag.delivered);
  const remainingBags = selectedBags.filter(bag => !bag.delivered);
  
  createDeliveryService(deliveredBags.length, 'PARTIAL', deliveredBags);
  updateServiceStatus(SERVICE_STATUS.PARTIAL_DELIVERY, {
    deliveredBags: deliveredBags.map(bag => bag.number),
    remainingBags: remainingBags.map(bag => bag.number),
    partialDeliveryPercentage: partialPercentage
  });
};
```

**¿Qué sucede?**
- Usuario selecciona qué bolsas entregar
- Se crea servicio de entrega solo para bolsas seleccionadas
- Servicio original cambia a `PARTIAL_DELIVERY` y mantiene información de bolsas pendientes
- Se puede hacer otra entrega parcial posteriormente

## Creación del Servicio de Entrega

### Función Principal: `createDeliveryService()`

**Ubicación**: `ProcessDecisionModal.jsx` líneas 109-187

#### Datos que se copian del servicio original:
```javascript
{
  guestName: service.guestName,
  roomNumber: service.roomNumber,
  hotel: service.hotel,
  hotelId: service.hotelId,
  specialInstructions: service.specialInstructions,
  priority: service.priority,
  photos: service.labelingPhotos || service.photos,
  labelingPhotos: service.labelingPhotos
}
```

#### Datos específicos del servicio de entrega:
```javascript
{
  id: `delivery-${service.id}-${Date.now()}`,
  status: 'READY_FOR_DELIVERY',
  bagCount: bagCount, // Solo bolsas para entregar
  weight: proportionalWeight, // Peso proporcional
  originalServiceId: service.id,
  serviceType: 'DELIVERY',
  isDeliveryService: true,
  deliveryBags: selectedBagsData.map(b => b.number)
}
```

#### Asignación automática de repartidor:
```javascript
const assignedRepartidor = assignRepartidorByZone(service.hotel, users);
```

## Gestión de Estados y Datos

### Actualización del Servicio Original

**Función**: `updateServiceStatus(newStatus, additionalData)`

Para entrega parcial, se guardan:
- `deliveredBags`: Array de bolsas entregadas
- `remainingBags`: Array de bolsas pendientes  
- `partialDeliveryPercentage`: Porcentaje entregado
- `partialDeliveryDate`: Timestamp de la entrega parcial

### Notas Internas Detalladas

```javascript
internalNotes: [
  `[${new Date().toLocaleString('es-PE')}] Servicio de entrega creado automáticamente`,
  `Servicio origen: ${service.id}`,
  `Tipo: ${deliveryType} (${bagCount}/${service.bagCount} bolsas)`,
  deliveryType === 'PARTIAL' ? `Bolsas para entregar: ${selectedBagsData.map(b => b.number).join(', ')}` : '',
  `Cliente: ${service.guestName} - Hab. ${service.roomNumber}`,
  `Hotel: ${typeof service.hotel === 'object' ? service.hotel.name : service.hotel}`,
  assignedRepartidor ? `Repartidor asignado: ${assignedRepartidor.name}` : 'Sin repartidor asignado'
].filter(Boolean).join(' | ')
```

## Cómo Ejecutar y Probar

### 1. Preparar un Servicio
```bash
# Crear un servicio en estado PICKED_UP
# Agregar rotulado con fotos para que pase a IN_PROCESS automáticamente
```

### 2. Acceder al Workflow
```bash
# Ir a la sección de servicios
# Hacer click en un servicio en estado IN_PROCESS
# Se abre ServiceWorkflowModal
```

### 3. Iniciar Proceso de Entrega
```bash
# En el workflow, hacer click en "Entrega" (debe estar disponible y pulsante)
# Se abre ProcessDecisionModal
```

### 4. Probar Entrega Completa
```bash
# Hacer click en "Marcar Completado"
# Verificar que se crea nuevo servicio en "Gestión de Entregas"
# Verificar que servicio original cambia a COMPLETED
```

### 5. Probar Entrega Parcial
```bash
# Seleccionar bolsas a entregar (usar controles numéricos o hacer click individual)
# Hacer click en "Entrega Parcial"
# Verificar que se crea servicio de entrega solo para bolsas seleccionadas
# Verificar que servicio original mantiene bolsas pendientes
```

## Ubicaciones de los Servicios

### Servicios Originales
- **Pendientes**: Aparecen en dashboard principal
- **En Proceso**: Aparecen en "Mis Servicios" 
- **Completados**: Aparecen en historial

### Servicios de Entrega
- **READY_FOR_DELIVERY**: Aparecen en "Gestión de Entregas"
- **OUT_FOR_DELIVERY**: En ruta de entrega
- **DELIVERED**: Entregados al cliente

## Identificación de Servicios

### Flags de Identificación
```javascript
{
  serviceType: 'DELIVERY',
  isDeliveryService: true,
  originalServiceId: 'service-123'
}
```

### Filtrado en la UI
Los servicios de entrega se filtran usando:
```javascript
services.filter(s => s.isDeliveryService === true)
```

## Casos de Uso Típicos

### Caso 1: Hotel con 10 bolsas, entrega completa
1. Rotulado → IN_PROCESS (automático)
2. Entrega → COMPLETED
3. Nuevo servicio: 10 bolsas para entrega

### Caso 2: Hotel con 10 bolsas, entrega parcial de 6
1. Rotulado → IN_PROCESS (automático)  
2. Entrega parcial → PARTIAL_DELIVERY
3. Nuevo servicio: 6 bolsas para entrega
4. Servicio original: 4 bolsas pendientes

### Caso 3: Segunda entrega parcial
1. Servicio en PARTIAL_DELIVERY con 4 bolsas pendientes
2. Nueva entrega parcial de 2 bolsas → sigue en PARTIAL_DELIVERY
3. Nuevo servicio: 2 bolsas para entrega
4. Servicio original: 2 bolsas pendientes

### Caso 4: Entrega final
1. Servicio en PARTIAL_DELIVERY con 2 bolsas pendientes
2. Entrega completa → COMPLETED
3. Nuevo servicio: 2 bolsas para entrega

## Beneficios del Sistema

1. **Automatización**: Reduce pasos manuales
2. **Trazabilidad**: Mantiene historial completo
3. **Flexibilidad**: Permite entregas parciales múltiples
4. **Organización**: Separa servicios de lavandería de servicios de entrega
5. **Escalabilidad**: Fácil de extender con nuevas funcionalidades

## Consideraciones Técnicas

### Almacenamiento
- Utiliza `serviceStorage` para persistir en localStorage
- Mantiene sincronización con backend cuando esté disponible

### IDs Únicos
- Servicios de entrega: `delivery-${originalId}-${timestamp}`
- Evita colisiones y mantiene trazabilidad

### Peso Proporcional
```javascript
const proportionalWeight = deliveryType === 'COMPLETE' 
  ? service.weight 
  : service.weight ? (parseFloat(service.weight) * (bagCount / service.bagCount)).toFixed(1) : null;
```

### Asignación de Repartidor
- Automática por zona del hotel
- Utiliza función `assignRepartidorByZone()` existente