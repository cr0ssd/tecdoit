# tecdoit - Sistema Integral de Gestión de Laboratorios

Bienvenido al repositorio oficial de **tecdoit**, una plataforma robusta diseñada para la optimización, control y mantenimiento de activos en redes de laboratorios. Este sistema facilita la gestión técnica y operativa, automatizando procesos críticos y proporcionando herramientas analíticas para el control de gastos operativos (**OpEx**).

## 🚀 Propósito del Proyecto
**tecdoit** centraliza la operación de laboratorios mediante un ecosistema digital que integra el seguimiento de inventarios en tiempo real, la automatización de mantenimientos preventivos y correctivos, y el monitoreo de uso de equipos mediante tecnologías de lectura rápida (QR).

## 🛠️ Stack Tecnológico

### Frontend (Interfaces de Usuario)
* **Framework:** React.js (Vite)
* **Enrutamiento:** React Router 7
* **Visualización de Datos:** Recharts (Analítica de estatus y OpEx)
* **Reportes:** jsPDF + AutoTable (Generación de reportes técnicos detallados en PDF)
* **Hardware:** React QR Scanner (Gestión de préstamos y uso de activos)
* **Estilos:** CSS3 Moderno (Diseño responsivo, profesional y minimalista)

### Backend (Lógica de Negocio y Automatización)
* **Servidor:** Node.js + Express.js
* **Base de Datos:** Supabase (PostgreSQL con Row-Level Security)
* **Almacenamiento:** Supabase Storage (Resguardo de evidencias fotográficas de activos)
* **Automatización:** node-cron (Escaneo de mantenimientos programados y alertas)
* **Comunicaciones:** Resend API (Alertas automáticas por correo electrónico)

## 📦 Módulos Principales

### 1. Panel de Control (Dashboard Analítico)
* **Gestión de OpEx:** Cálculo automático del Gasto Operativo Acumulado, desglosado en:
  * **Reposiciones:** Costo total de inversión en activos de inventario.
  * **Servicios:** Costos derivados de mantenimientos preventivos y correctivos.
* **Centro de Notificaciones:** Sistema dinámico que alerta sobre mantenimientos urgentes, umbrales de horas de uso alcanzados y avisos del sistema.
* **Calendario Preventivo:** Widget interactivo para visualizar próximas fechas de servicio.
* **KPIs Operativos:** Monitoreo en tiempo real de equipos disponibles, en mantenimiento y en uso.

### 2. Gestión de Inventario (Activos)
* **Catálogo de Activos:** CRUD completo de equipos con parámetros técnicos (marca, modelo, laboratorio asignado).
* **Control Financiero:** Registro de costo de reposición y configuración de umbrales operativos (límite de horas).
* **Evidencia Visual:** Integración con Supabase Storage para la carga y visualización de fotografías de los equipos.

### 3. Mantenimiento Preventivo (Ciclo de Vida)
* **Programación por Periodicidad:** Configuración de intervalos (desde 7 días hasta 6 meses) para servicios recurrentes.
* **Checklists de Tareas:** Definición de tareas específicas por equipo para asegurar la calidad del servicio.
* **Workflow de Cierre:** Proceso de finalización que registra resultados de tareas y recalcula automáticamente la próxima fecha de mantenimiento.

### 4. Mantenimiento Correctivo (Tickets de Falla)
* **Ciclo de Tickets:** Gestión de estados (Abierto -> En Progreso -> Completado) con priorización del 0 al 5 (Crítica).
* **Análisis de Causa Raíz:** Registro detallado de fallas detectadas y acciones correctivas aplicadas.
* **Reportes PDF:** Generación de expedientes técnicos profesionales que incluyen KPIs del equipo, historial de tickets y detalles de intervenciones.

### 5. Uso de Equipos (Bitácora QR)
* **Préstamos mediante QR:** Registro instantáneo de entrada/salida de equipos eliminando errores manuales.
* **Validación de Usuarios:** Registro de nombre de usuario y carrera (con validación de formato institucional).
* **Bitácora en Tiempo Real:** Seguimiento activo de quién utiliza cada activo y por cuánto tiempo.

## ⚙️ Configuración del Entorno (Setup)

### Requisitos Previos
* Node.js (v18+)
* Cuenta en Supabase y Resend API

### Pasos para la Instalación

1. **Clonar el repositorio e instalar dependencias:**
   ```bash
   npm install
   # Instalar dependencias del servidor
   cd server && npm install && cd ..
   ```

2. **Variables de Entorno:**
   Crea un archivo `.env` en la raíz (para el Frontend) y otro en la carpeta `server/` (para el Backend).

   **Frontend (`.env`):**
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_llave_anonima
   VITE_API_URL=http://localhost:3001/api
   ```

   **Backend (`server/.env`):**
   ```env
   SUPABASE_URL=tu_url_de_supabase
   SUPABASE_KEY=tu_llave_de_servicio_o_anonima
   RESEND_API_KEY=tu_api_key_de_resend
   PORT=3001
   ```

3. **Ejecución del Sistema:**
   Inicia ambos servicios simultáneamente:
   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: Backend
   cd server && node index.js
   ```

## 🛡️ Estándares de Ingeniería

* **Seguridad:** Implementación de Row-Level Security (RLS) para proteger los datos en Supabase.
* **Modularidad:** Separación estricta entre controladores de API, servicios de automatización y componentes de UI.
* **UX/UI:** Uso de estados optimistas y validaciones en tiempo real para una experiencia de usuario fluida.

---
*Documentación oficial mantenida por el equipo Zarzilla Games. Última actualización: Optimización de OpEx y Reportes PDF.*
