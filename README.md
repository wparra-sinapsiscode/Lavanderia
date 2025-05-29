# 🧺 Fumy Limp - Sistema de Gestión de Lavandería

Sistema completo de gestión para lavandería industrial especializada en servicios hoteleros, desarrollado en React con funcionalidad 100% frontend.

## 🎯 Descripción del Proyecto

Fumy Limp es una aplicación web React que simula un sistema completo de gestión de lavandería industrial para hoteles en Lima, Perú. El sistema maneja todo el flujo operativo desde la entrega de bolsas hasta la entrega final del servicio, con roles diferenciados para administradores y repartidores.

## ✨ Características Principales

### 🔐 Sistema de Autenticación
- **Login simulado** con usuarios predefinidos
- **Roles diferenciados**: Administrador y Repartidor
- **Gestión de sesiones** con localStorage
- **Redirección automática** según tipo de usuario

### 👥 Gestión de Usuarios y Roles

#### 👨‍💼 Administrador (María González)
- Dashboard ejecutivo con KPIs completos
- Gestión completa de clientes/hoteles
- Configuración de precios diferenciados
- Reportes y analytics avanzados
- Gestión de usuarios y permisos
- Acceso a todos los módulos
- Gestión de inventario global

#### 🚚 Repartidor (Carlos, Ana, José)
- Dashboard operativo personalizado
- Registro de recojo de bolsas
- Upload de fotos y captura de firmas
- Consulta de servicios asignados
- Actualización de estado de entregas
- Acceso a inventario de su zona

### 🏨 Gestión de Hoteles
- **5 hoteles predefinidos**: Los Delfines, Country Club, Sheraton, Marriott, Hilton
- Información completa de contacto
- Gestión de inventario de bolsas por hotel
- Precios diferenciados por cliente

### 📋 Gestión de Servicios

#### 📝 Registro de Huéspedes
- Formulario completo con validación en tiempo real
- Campos requeridos: nombre, habitación, hotel, bolsas, observaciones
- Cálculo automático de precio estimado
- Verificación de inventario disponible
- Timestamp automático

#### 📦 Sistema de Recojos
- Pesaje y registro de peso exacto
- Upload múltiple de fotos
- Captura de firma digital en canvas HTML5
- Geolocalización simulada
- Observaciones del recojo
- Validación completa antes de confirmar

#### 🔄 Flujo de Estados
1. **Pendiente Recojo** → Servicio registrado, esperando recojo
2. **Recogido** → Bolsas recogidas y pesadas
3. **En Proceso** → Servicio en planta de lavado
4. **Entrega Parcial** → 80% entregado (configurable)
5. **Completado** → Servicio finalizado

### 💰 Sistema de Precios
- **Precios diferenciados** por hotel/cliente
- **Cálculo automático**: (Peso × Precio/kg) + (Bolsas × Precio/bolsa)
- **Configuración flexible** para administradores
- **Ejemplos de precios** en tiempo real

### 📊 Inventario de Bolsas
- **Control dinámico** por hotel
- **Alertas automáticas** cuando stock es bajo
- **Descuento automático** al entregar bolsas
- **Funciones de agregar/quitar** bolsas
- **Estados visuales** del inventario

### 📈 Dashboard y Analytics
- **Gráficos interactivos** con Recharts
- **KPIs en tiempo real**
- **Análisis de rendimiento**
- **Actividad reciente**
- **Estadísticas por estado**

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 19.1.0** - Framework principal
- **Tailwind CSS 4.1.7** - Styling y diseño responsive
- **React Router v6.26.2** - Navegación (compatible con Node.js v18)
- **React Hook Form 7.56.4** - Manejo de formularios
- **Recharts 2.15.3** - Gráficos y visualizaciones
- **Lucide React 0.511.0** - Iconografía moderna

### Librerías de Utilidad
- **jsPDF 3.0.1** - Generación de PDFs
- **html2canvas 1.4.1** - Captura de pantalla
- **clsx 2.1.1** - Manejo de clases CSS

### Herramientas de Desarrollo
- **Vite 6.3.5** - Build tool y dev server
- **ESLint 9.25.0** - Linting
- **PostCSS 8.5.3** - Procesamiento CSS
- **Autoprefixer 10.4.21** - Compatibilidad CSS

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── ui/                 # Componentes base (Button, Input, Card, etc.)
│   ├── forms/              # Formularios específicos
│   ├── dashboards/         # Dashboards diferenciados
│   └── shared/             # Componentes compartidos (Layout, Navbar, Sidebar)
├── pages/                  # Páginas principales
├── hooks/                  # Custom hooks
├── store/                  # Gestión de estado (Context API)
├── utils/                  # Funciones utilitarias y storage
├── types/                  # Definiciones de tipos
├── constants/              # Constantes y configuración
└── assets/                 # Recursos estáticos
```

## 🚀 Instalación y Ejecución

### Prerrequisitos
- **Node.js v18.19.1** (compatible con el proyecto)
- **npm 9.2.0** o superior

### Pasos de Instalación

1. **Clonar o navegar al directorio del proyecto**
```bash
cd fumy-limp-app
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Ejecutar en modo desarrollo**
```bash
npm run dev
```

4. **Abrir en el navegador**
```
http://localhost:5173/
```

### Comandos Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # Ejecutar linting
```

## 👤 Usuarios de Demostración

### 🔑 Credenciales de Acceso

#### Administrador
- **Email**: maria@fumylimp.com
- **Contraseña**: admin123
- **Rol**: Gerente General
- **Acceso**: Completo a todas las funcionalidades

#### Repartidores
- **Carlos Mendoza** (Zona Norte)
  - Email: carlos@fumylimp.com
  - Contraseña: repartidor123

- **Ana Torres** (Zona Sur)
  - Email: ana@fumylimp.com
  - Contraseña: repartidor123

- **José Ramírez** (Zona Centro)
  - Email: jose@fumylimp.com
  - Contraseña: repartidor123

## 📊 Datos de Demostración

### 🏨 Hoteles Incluidos
1. **Hotel Los Delfines** (50 habitaciones)
2. **Hotel Country Club** (120 habitaciones)
3. **Hotel Sheraton** (200 habitaciones)
4. **Hotel Marriott** (180 habitaciones)
5. **Hotel Hilton** (150 habitaciones)

### 📦 Servicios Simulados
- **55+ servicios** con diferentes estados
- **Variedad de pesos**: 2kg - 25kg por servicio
- **Diferentes cantidades**: 1-15 bolsas por servicio
- **Estados variados**: desde pendientes hasta completados
- **Datos realistas** con nombres y observaciones

## 💾 Persistencia de Datos

### LocalStorage
Todos los datos se almacenan en el navegador usando localStorage:

- **`fumy_limp_user`** - Sesión del usuario actual
- **`fumy_limp_hotels`** - Información de hoteles
- **`fumy_limp_services`** - Servicios y estados
- **`fumy_limp_users`** - Usuarios del sistema
- **`fumy_limp_audit`** - Log de auditoría

### Inicialización Automática
- Los datos se inicializan automáticamente al cargar la app
- Se preservan entre sesiones del navegador
- Sistema de respaldo en caso de datos corruptos

## 🎨 Diseño y UX

### 🎯 Principios de Diseño
- **Mobile-first**: Optimizado para tablets y smartphones
- **Interfaz intuitiva**: Flujo de trabajo lógico y sin fricción
- **Colores corporativos**: Azul y blanco como principales
- **Accesibilidad**: Diseñado pensando en usabilidad
- **Feedback visual**: Estados de carga y mensajes claros

### 📱 Responsive Design
- **Breakpoints optimizados** para móvil, tablet y desktop
- **Navegación adaptativa** según el dispositivo
- **Formularios responsive** con validación en tiempo real
- **Tablas scrolleable** en dispositivos pequeños

## 🔧 Funcionalidades Técnicas

### 🔄 Gestión de Estado
- **React Context** para autenticación y notificaciones
- **useState/useEffect** para estado local
- **LocalStorage** para persistencia

### 📝 Formularios
- **React Hook Form** con validación
- **Validación en tiempo real**
- **Campos condicionales**
- **Manejo de errores**

### 📸 Simulaciones Realistas
- **Upload de fotos** con preview
- **Firma digital** en canvas HTML5
- **Geolocalización simulada** con ubicaciones predefinidas
- **Notificaciones toast** para feedback
- **Sistema de auditoría** completo

### 🔒 Seguridad
- **Validación en frontend**
- **Sanitización de datos**
- **Gestión segura de sesiones**
- **No exposición de datos sensibles**

## 📋 Flujo de Trabajo Completo

### 1. **Registro de Huésped**
1. Admin/Repartidor registra nuevo huésped
2. Sistema verifica inventario de bolsas disponibles
3. Se entregan bolsas y se descuenta del inventario
4. Servicio queda en estado "Pendiente Recojo"

### 2. **Proceso de Recojo**
1. Repartidor ve servicios pendientes en su dashboard
2. Selecciona servicio para recojo
3. Pesa las bolsas y registra peso exacto
4. Toma fotos de las bolsas
5. Captura firma digital del cliente
6. Sistema registra geolocalización automáticamente
7. Calcula precio final basado en peso y cantidad
8. Servicio pasa a estado "Recogido"

### 3. **Gestión de Entregas**
1. Admin puede actualizar estado a "En Proceso"
2. Opción de marcar "Entrega Parcial" (80% por defecto)
3. Finalizar con "Completado"
4. Sistema registra fechas de cada transición

### 4. **Seguimiento y Reportes**
1. Dashboard muestra KPIs en tiempo real
2. Gráficos de rendimiento por período
3. Análisis por hotel y repartidor
4. Log de auditoría completo

## 🔮 Funcionalidades Futuras

Las siguientes funcionalidades están preparadas para desarrollo futuro:

- **📅 Calendario** para programación de recojos
- **🗺️ Mapas interactivos** con rutas optimizadas
- **🖼️ Galería de fotos** con zoom y anotaciones
- **📄 Exportación PDF** de reportes
- **🌙 Tema oscuro** con persistencia
- **🔍 Búsqueda global** avanzada
- **📱 WhatsApp simulado** para comunicación
- **🎨 Temas personalizables**

## 🤝 Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o consultas:

- **Email**: soporte@fumylimp.com
- **Teléfono**: +51 999 888 777
- **Dirección**: Lima, Perú

---

**⚡ Desarrollado con React + Vite | 🎨 Diseñado con Tailwind CSS | 💾 Datos persistentes en localStorage**

*Sistema de demostración - Solo Frontend | © 2024 Fumy Limp. Todos los derechos reservados.*