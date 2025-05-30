# Solución para el error en backend

## Problema identificado

El backend actualmente tiene un error cuando se intenta acceder a la ruta `/services/my-services`. El error es:

```
Error getting service: PrismaClientValidationError:

Invalid `prisma.service.findUnique()` invocation in
C:\Users\User\OneDrive\Documentos\LavanderiaC\fumy-limp-backend\src\controllers\service.controller.js:346:42

  343 try {
  344   const { id } = req.params;
  345
→ 346   const service = await prisma.service.findUnique({
          where: {
            id: "my-services"
          },
          include: {
            hotel: {
              select: {
                name: true,
                zone: true,
                contactPerson: true,
                contactPhone: true,
                ~~~~~~~~~~~~
        ?       id?: true,
        ?       address?: true,
        ?       latitude?: true,
        ?       longitude?: true,
        ?       phone?: true,
        ?       email?: true,
        ?       bagInventory?: true,
        ?       pricePerKg?: true,
        ?       createdAt?: true,
        ?       updatedAt?: true,
        ?       services?: true,
        ?       bagLabels?: true,
        ?       transactions?: true,
        ?       _count?: true
              }
            },
            repartidor: {
              select: {
                id: true,
                name: true,
                phone: true
              }
            },
            bagLabels: true
          }
        })

Unknown field `contactPhone` for select statement on model `Hotel`. Available options are marked with ?.
```

## Causas del error

Hay dos causas para este error:

1. El router está confundiendo la ruta `/services/my-services` con una solicitud para obtener un servicio con ID "my-services"
2. En el modelo `Hotel`, se está intentando seleccionar un campo `contactPhone` que no existe en el esquema de Prisma

## Soluciones

### Solución 1: Corregir el router para la ruta `/services/my-services`

Abrir el archivo `src/routes/service.routes.js` y asegurarse de que la definición de la ruta para `my-services` esté antes que la ruta para obtener un servicio por ID:

```javascript
// Antes de la definición de la ruta :id
router.get('/my-services', authMiddleware, serviceController.getMyServices);

// Después poner la ruta de servicio por ID
router.get('/:id', authMiddleware, serviceController.getServiceById);
```

### Solución 2: Corregir la referencia al campo `contactPhone` en el modelo Hotel

Abrir el archivo `src/controllers/service.controller.js` y buscar la definición del método `getServiceById`. Cambiar la referencia de `contactPhone` a `phone` (que es el campo que existe):

```javascript
const service = await prisma.service.findUnique({
  where: {
    id
  },
  include: {
    hotel: {
      select: {
        name: true,
        zone: true,
        contactPerson: true,
        phone: true, // Cambiar contactPhone por phone
        // resto del código...
      }
    },
    // resto del código...
  }
});
```

### Solución 3: Actualizar el esquema de Prisma para incluir el campo contactPhone

Si es necesario mantener el campo `contactPhone`, se puede actualizar el esquema de Prisma:

1. Abrir el archivo `prisma/schema.prisma`
2. Buscar el modelo `Hotel`
3. Agregar el campo `contactPhone` como alias de `phone`:

```prisma
model Hotel {
  id           String    @id @default(uuid())
  name         String
  address      String?
  zone         Zone
  phone        String?
  contactPhone String?   @map("phone") // Esto es un alias que apunta al mismo campo en la base de datos
  // resto del modelo...
}
```

4. Ejecutar `npx prisma generate` para actualizar el cliente de Prisma

### Solución 4: Crear una nueva ruta para obtener servicios por repartidor

Como solución temporal y para evitar la confusión con la ruta `/my-services`, se puede crear una nueva ruta específica:

```javascript
// En service.routes.js
router.get('/repartidor', authMiddleware, serviceController.getMyServices);
```

Esto evitará que se confunda con la ruta de obtener un servicio por ID.

## Solución aplicada en el frontend

Mientras tanto, hemos implementado las siguientes soluciones en el frontend:

1. Cambiado la URL de `/services/my-services` a `/services/repartidor` con fallback a la URL original
2. Implementado un modo offline que carga servicios desde el almacenamiento local cuando la API falla
3. Filtrado de servicios por zona del repartidor para mantener las restricciones de acceso incluso sin backend

Estas soluciones permiten que la aplicación siga funcionando mientras se corrige el problema en el backend.