# tecdoit - Sistema Integral de Gestión de Laboratorios

Bienvenido al repositorio oficial de **tecdoit**, una plataforma robusta diseñada para la optimización, control y mantenimiento de activos en redes de laboratorios. Este sistema facilita la gestión técnica y operativa, automatizando procesos críticos y proporcionando herramientas analíticas para la toma de decisiones financieras (CAPEX).

## 🚀 Propósito del Proyecto
**tecdoit** centraliza la operación de laboratorios mediante un ecosistema digital que integra el seguimiento de inventarios en tiempo real, la automatización de mantenimientos preventivos y correctivos, y el monitoreo de uso de equipos mediante tecnologías de lectura rápida (QR).

## 🛠️ Stack Tecnológico

### Frontend (Interfaces de Usuario)
* **Framework:** React.js (Vite)
* **Enrutamiento:** React Router 7
* **Visualización de Datos:** Recharts (Analítica financiera y operativa)
* **Reportes:** jsPDF + AutoTable (Generación de fichas técnicas en PDF)
* **Hardware:** React QR Scanner (Gestión de préstamos y uso)
* **Estilos:** CSS3 Moderno (Diseño responsivo y profesional)

### Backend (Lógica de Negocio y Automatización)
* **Servidor:** Node.js + Express.js
* **Base de Datos:** Supabase (PostgreSQL con Row-Level Security)
* **Automatización:** node-cron (Escaneo diario de mantenimientos programados)
* **Comunicaciones:** Resend API (Alertas automáticas por correo electrónico)

## 📦 Módulos Principales

### 1. Panel de Control (Dashboard Analítico)
* **Cálculo de CAPEX:** Monitoreo en tiempo real del presupuesto global, restando inversiones en activos y gastos operativos.
* **Centro de Notificaciones:** Sistema dinámico que intercepta alertas por umbrales de horas de uso o vencimiento de servicios.
* **KPIs Operativos:** Visualización clara de equipos activos, en mantenimiento y disponibilidad general.

### 2. Gestión de Inventario
* **Control de Activos:** CRUD completo de equipos con parámetros técnicos detallados (marca, modelo, laboratorios).
* **Almacenamiento en la Nube:** Integración con Supabase Storage para el resguardo de evidencias fotográficas.
* **Umbrales Operativos:** Configuración de límites de horas de uso para disparar mantenimientos preventivos.

### 3. Mantenimiento Preventivo (Cíclico)
* **Programación Inteligente:** Configuración de periodicidades (7 días hasta 6 meses o personalizados).
* **Listas de Verificación:** Definición de tareas específicas por equipo para asegurar la calidad del servicio.
* **Reset Automático:** Al completar un ciclo, el sistema recalcula la próxima fecha y restablece contadores de uso.

### 4. Mantenimiento Correctivo (Tickets de Falla)
* **Gestión de Tickets:** Ciclo de vida completo (Abierto -> En Progreso -> Completado).
* **Análisis de Fallas:** Registro de causas raíz y acciones correctivas aplicadas.
* **Reportes Técnicos:** Generación instantánea de reportes PDF detallados con el historial de intervenciones y costos asociados.

### 5. Uso de Equipos (Módulo QR)
* **Préstamos Automatizados:** Registro ágil de entrada/salida de equipos mediante escaneo de códigos QR, eliminando errores de captura manual.
* **Bitácora de Uso:** Historial transparente de quién y por cuánto tiempo utilizó cada activo.

## ⚙️ Configuración del Entorno (Setup)

### Requisitos Previos
* Node.js (v18+)
* Cuenta en Supabase y Resend

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
   Inicia ambos servicios para el funcionamiento completo:
   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: Backend
   cd server && node index.js
   ```

## 🛡️ Estándares de Ingeniería

* **Seguridad:** Uso estricto de Row-Level Security (RLS) en Supabase.
* **Mantenibilidad:** Arquitectura modular con separación clara entre lógica de API y componentes de interfaz.
* **Experiencia de Usuario:** Implementación de "Estado Optimista" para transiciones fluidas en el Dashboard y Mantenimiento.

---
*Documentación oficial mantenida por el equipo Zarzilla Games. Última actualización: Integración de Mantenimiento Correctivo y Reportes PDF.*
:D