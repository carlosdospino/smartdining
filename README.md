# 🍽️ SmartDining

> Plataforma web para digitalizar la experiencia en sala de restaurantes: pedidos colaborativos en tiempo real mediante QR, panel administrativo para sala y sistema Kitchen Display System (KDS) para cocina.

---

## 📌 Descripción del Proyecto

**SmartDining** es una solución integral que elimina fricciones en el servicio presencial de restaurantes:
- **Clientes:** Escanean un código QR dinámico en su mesa, exploran el menú digital interactivo y realizan pedidos grupales/colaborativos en tiempo real desde el navegador móvil (PWA) sin instalar aplicaciones.
- **Cocina (KDS):** Visualización en tiempo real de comandas clasificadas por estado y tiempos de preparación.
- **Administración & Sala:** Control del estado de mesas, gestión del catálogo de platos, reportes y supervisión de pedidos.
- **Infraestructura en tiempo real:** Comunicación bidireccional mediante WebSockets y pagos integrados.

---

## 👥 Equipo de Desarrollo y Roles

| Integrante | Rol | Responsabilidades Principales |
| :--- | :--- | :--- |
| **Jarrison Pulgarin** *(Líder)* | **Frontend Restaurante + Base de Datos** | Modelado e implementación en PostgreSQL (9 tablas), panel administrativo web del restaurante. |
| **Juan Buelvas** | **Frontend Cliente (PWA)** | Experiencia del comensal móvil, carrito colaborativo, escaneo y consumo de menú. |
| **Carlos Ospino** | **Backend + API REST + KDS** | Arquitectura del API REST (Node/Express), lógica de negocio, contratos de endpoints y pantalla KDS para cocina. |
| **Roberto Buelvas** | **WebSockets + QR + Pagos + Notificaciones** | Servidor Socket.io en tiempo real, emisión/sincronización de eventos de mesa, generación de tokens QR, notificaciones push y pasarela de pago. |

---

## 📂 Estructura del Repositorio

El proyecto utiliza un esquema monorepo organizado por módulos:

```plaintext
restaurante-app/
├── database/               # Scripts SQL, migraciones y diccionario de datos (PostgreSQL)
├── backend/                # API REST principal (Node.js + Express)
├── socket-server/          # Servidor de WebSockets (Socket.io) para sincronización en vivo
├── frontend-cliente/       # Aplicación web móvil PWA para comensales (React + Vite)
├── frontend-restaurante/   # Panel de control administrativo y gestión de sala (React + Vite)
└── frontend-kds/           # Sistema de pantalla de cocina para visualización de comandas
```

---

## 🌿 Flujo de Trabajo en Git (GitFlow)

Para evitar conflictos y coordinar de forma ordenada:

1. **Rama Principal (`main`):** Código estable y probado.
2. **Ramas de Funcionalidad (`feature/...`):** Cada integrante crea su rama desde `main` para trabajar sus tareas:
   - `feature/base-datos` (Jarrison)
   - `feature/frontend-restaurante` (Jarrison)
   - `feature/frontend-cliente` (Juan)
   - `feature/backend-api` (Carlos)
   - `feature/frontend-kds` (Carlos)
   - `feature/socket-server` (Roberto)
3. **Pull Requests (PR):** Antes de fusionar con `main`, se realiza revisión de código entre los integrantes correspondientes.

---

## 📋 Hoja de Ruta Inicial

- [x] **Paso 1:** Creación del repositorio y estructura base de carpetas.
- [ ] **Paso 2:** Creación y subida del script SQL de PostgreSQL con las 9 tablas en `/database`.
- [x] **Paso 3:** Definición del contrato de API REST (endpoints y esquemas JSON) en `/backend` → [backend/docs/api-spec.md](backend/docs/api-spec.md), alineado con el modelo ER de Jarrison ([backend/docs/modelo-er.md](backend/docs/modelo-er.md)).
- [ ] **Paso 4:** Definición de eventos WebSocket y formato de token QR en `/socket-server`.
- [ ] **Paso 5:** Inicialización de proyectos base ("Hello World") en cada módulo.
- [ ] **Paso 6:** Integración con datos simulados (mocks) en frontend.
- [ ] **Paso 7:** Conexión completa Frontend ↔ Backend ↔ Base de Datos.
- [ ] **Paso 8:** Pruebas integrales y puesta a punto para Exposoftware.
