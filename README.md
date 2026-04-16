# tecdoit - Sistema Centralizado de Gestión de Laboratorios

Bienvenido al repositorio oficial de **tecdoit**, desarrollado por el equipo Zarzilla Games. Este sistema está diseñado para optimizar el control de inventarios, automatizar los mantenimientos preventivos y facilitar la toma de decisiones financieras (CAPEX) en la red de laboratorios mediante un entorno web escalable.

## Stack Tecnológico
* **Frontend:** React.js (Vite)
* **Backend y Base de Datos:** Supabase (PostgreSQL)
* **Gráficas y Analítica:** Recharts
* **Lectura de Hardware:** React QR Scanner

## Módulos Principales del Sistema

Actualmente, el sistema se divide en cuatro módulos críticos con responsabilidades únicas (Separation of Concerns):

1. **Dashboard (Panel Analítico):**
   * Calcula el presupuesto en tiempo real restando la inversión (equipos) y los gastos operativos (mantenimientos) del fondo global (Regla de los 5 segundos).
   * Contiene el **Centro de Notificaciones**, el cual intercepta alertas dinámicas por límite de horas o urgencia, y alertas estáticas del servidor. Posee redirección inteligente hacia el módulo de mantenimiento.

2. **Inventario:**
   * Operaciones CRUD (Crear, Leer, Actualizar, Eliminar) para los activos.
   * Integración con Supabase Storage para alojamiento de fotografías.
   * Manejo de umbrales operativos (límite de horas de uso opcional por activo).

3. **Mantenimiento:**
   * Registro de servicios preventivos y correctivos.
   * Vinculación de proveedores, costos estimados y fechas programadas.
   * Al "Completar" un servicio, el sistema restablece automáticamente los contadores operativos del equipo a cero para limpiar las alertas del Dashboard.

4. **Uso de Equipos (Módulo QR):**
   * Automatización de préstamos de hardware en laboratorio mediante lectura de códigos QR para evitar errores tipográficos y agilizar el flujo.

## Configuración del Entorno de Desarrollo (Setup)

Para correr este proyecto en tu máquina local, sigue estos pasos:

1. Clona el repositorio e instala las dependencias:
   ```bash
   npm install
   ```

2. Crea un archivo oculto llamado `.env` en la raíz del proyecto. **No subas este archivo a GitHub**. Solicita las credenciales al líder técnico. Debe contener la siguiente estructura:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase_aqui
   VITE_SUPABASE_ANON_KEY=tu_llave_anonima_aqui
   ```

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Estructura de la Base de Datos

El backend en Supabase interactúa principalmente con las siguientes tablas:
* **equipos:** Catálogo central. Contiene los parámetros `horas_acumuladas` y `limite_horas`.
* **mantenimientos:** Historial de intervenciones técnicas y costos asociados.
* **registro_uso:** Bitácora de préstamos mediante QR.
* **presupuesto_global:** Tabla de un solo registro para el cálculo del CAPEX.
* **post1** y **author1:** Tablas dedicadas exclusivamente al control e historial del sistema de notificaciones y alertas.

## Estándares y Reglas para el Equipo (Zarzilla Games)

Para mantener la calidad del código, por favor respeten los siguientes principios acordados durante la fase de diseño:

* **KISS (Keep It Simple, Stupid):** No compliquen las consultas SQL. El cálculo financiero se hace mediante sumatorias directas en el frontend para no sobrecargar el servidor.
* **SRP (Single Responsibility Principle):** Si necesitan crear una nueva conexión a base de datos, utilicen estrictamente el archivo centralizado `services/supabase.js`. No escriban credenciales en los componentes.
* **Seguridad (RLS):** La base de datos tiene políticas de Row-Level Security activas. Las inserciones directas fallarán si intentan manipular la base de datos sin estar autenticados.
* **Estado de UI Optimista:** Al marcar una notificación como leída o completar un mantenimiento, actualicen primero el estado local (React state) para que el usuario perciba rapidez, y luego ejecuten la petición a Supabase en segundo plano.

---
*Documentación mantenida por la dirección técnica de Zarzilla Games. Última actualización: Sprint de Notificaciones y Mantenimiento.*
