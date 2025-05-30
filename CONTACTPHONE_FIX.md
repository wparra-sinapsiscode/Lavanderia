# Solución para el campo contactPhone en el modelo Hotel

## Problema actual

En el controlador de servicios del backend, se está haciendo referencia a un campo `contactPhone` en el modelo Hotel:

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
        contactPhone: true, // Este campo no existe en el modelo
        // ... 
      }
    },
    // ...
  }
});
```

Pero este campo no existe en el esquema de Prisma, lo que genera el error:

```
Unknown field `contactPhone` for select statement on model `Hotel`. Available options are marked with ?.
```

## Soluciones propuestas

### Opción 1: Modificar el controlador para usar el campo phone

Simplemente cambiar la referencia en el controlador para usar el campo `phone` que sí existe:

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
        phone: true, // Usar phone en lugar de contactPhone
        // ...
      }
    },
    // ...
  }
});
```

### Opción 2: Modificar el esquema Prisma para agregar el campo contactPhone

Abrir el archivo `prisma/schema.prisma` y agregar el campo `contactPhone` mapeado al campo `phone` en la base de datos:

```prisma
model Hotel {
  id           String   @id @default(uuid())
  name         String
  address      String?
  zone         Zone
  phone        String?
  contactPhone String?  @map("phone") // Alias que apunta al mismo campo en la base de datos
  contactPerson String?
  // ... otros campos ...
}
```

Después ejecutar:
```bash
npx prisma generate
```

Para actualizar el cliente de Prisma.

### Opción 3: Crear un middleware Prisma para transformar la selección

```javascript
// En src/config/prisma.js
const prisma = new PrismaClient().$extends({
  query: {
    hotel: {
      async findUnique({ args, query }) {
        // Si se está seleccionando contactPhone, modificamos para usar phone
        if (args.select && args.select.contactPhone) {
          args.select.phone = true;
          delete args.select.contactPhone;
        }
        return query(args);
      }
    }
  }
});

export default prisma;
```

## Propuesta de cambio completo

Recomendamos la Opción 1 por ser la más simple y directa. Los cambios necesarios son:

1. Ubicar todos los lugares donde se hace referencia a `contactPhone` en los controladores:
   - src/controllers/service.controller.js
   - Cualquier otro controlador que use este campo

2. Reemplazar todas las referencias de `contactPhone` por `phone`

3. En el frontend, agregar lógica para manejar ambos campos:
   ```javascript
   const hotelPhone = hotel.phone || hotel.contactPhone || "No disponible";
   ```

Esto asegurará la compatibilidad con versiones anteriores y futuras del esquema.

## Ubicación del error

El error principal está en `src/controllers/service.controller.js` alrededor de la línea 346, donde se hace la consulta:

```javascript
const service = await prisma.service.findUnique({
  where: {
    id: "my-services" // Aquí hay otro error: confunde la ruta con un ID
  },
  include: {
    hotel: {
      select: {
        name: true,
        zone: true,
        contactPerson: true,
        contactPhone: true, // <- Este es el campo que causa el error
        // ...
      }
    },
    // ...
  }
});
```

## Posible cambio de nomenclatura para el futuro

Si se desea mantener consistencia en la nomenclatura, se podría considerar:

1. Renombrar el campo `phone` a `contactPhone` en una migración futura
2. O establecer un estándar claro para la nomenclatura de los campos de contacto

En cualquier caso, la solución más rápida es adaptar el código para usar el campo `phone` que ya existe.