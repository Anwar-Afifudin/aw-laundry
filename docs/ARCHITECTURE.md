# A&W Laundry — Application Architecture

## 1. Document Purpose

Dokumen ini menjelaskan arsitektur teknis A&W Laundry.

Dokumen harus dibaca bersama:

- `docs/PRD.md`
- `docs/DESIGN.md`
- `docs/DATABASE.md`

Tujuan dokumen ini adalah memastikan developer dan AI coding agent memahami:

- Struktur aplikasi
- Routing
- Authentication
- Authorization
- Supabase integration
- Feature organization
- Data flow
- Admin/customer separation
- Chatbot architecture
- Security boundary
- Error handling
- Deployment strategy

---

# 2. Technology Stack

## Application Framework

React Router Framework Mode

Language:

TypeScript

Rendering strategy:

SPA Mode

Configuration:

```ts
ssr: false
```

---

## Styling

- Tailwind CSS
- shadcn/ui
- Lucide React

---

## Backend Platform

Supabase

Services:

- PostgreSQL
- Authentication
- Storage
- Row Level Security
- Realtime jika diperlukan
- Edge Functions untuk server-side operations tertentu

---

## Development

IDE:

Visual Studio Code

AI Coding Assistant:

Codex

Package Manager:

Bun

---

## Deployment

Application:

Vercel

Backend:

Supabase

---

# 3. Architecture Overview

High-level architecture:

```text
                  CUSTOMER / ADMIN
                         |
                         v
                 React Router App
                         |
               ---------------------
               |                   |
               v                   v
         Supabase Client       Server Function
               |                   |
               |                   |
      --------------------          |
      |       |        |            |
      v       v        v            v
   Auth   Database   Storage     AI Provider
      |       |
      |       v
      |      RLS
      |
      v
Authenticated User
```

Frontend tidak menjadi sumber utama authorization.

Database RLS tetap menjadi lapisan keamanan utama.

---

# 4. Architecture Style

A&W Laundry menggunakan pendekatan:

**Feature-oriented architecture**

Artinya kode dikelompokkan berdasarkan domain bisnis.

Contoh:

```text
features/
├── auth/
├── orders/
├── services/
├── payments/
├── customers/
├── complaints/
└── chat/
```

Bukan hanya berdasarkan jenis file seperti:

```text
components/
hooks/
functions/
pages/
```

tanpa konteks bisnis.

---

# 5. Main Application Layers

Aplikasi dibagi menjadi beberapa layer:

```text
Presentation Layer

        ↓

Feature / Business Layer

        ↓

Data Access Layer

        ↓

Supabase

        ↓

PostgreSQL + Auth + Storage
```

---

# 6. Presentation Layer

Presentation Layer bertanggung jawab terhadap:

- Page
- Layout
- Form
- Modal
- Table
- Card
- Navigation
- User interaction

Presentation tidak boleh berisi business logic kompleks.

---

# 7. Feature Layer

Feature Layer bertanggung jawab terhadap domain tertentu.

Contoh:

```text
orders

payments

services

auth

chat
```

Setiap feature dapat memiliki:

```text
components

queries

mutations

types

utils

schemas
```

sesuai kebutuhan.

---

# 8. Data Access Layer

Data access bertanggung jawab berkomunikasi dengan Supabase.

Contoh:

```ts
supabase
  .from("orders")
  .select(...)
```

Query kompleks sebaiknya tidak tersebar ke seluruh component.

Gunakan function yang dapat digunakan kembali.

Contoh konsep:

```ts
getOrders()

getOrderById()

createOrder()

updateOrderStatus()
```

---

# 9. Proposed Project Structure

Target struktur awal:

```text
aw-laundry/
│
├── app/
│   │
│   ├── components/
│   │   ├── shared/
│   │   └── ui/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── orders/
│   │   ├── services/
│   │   ├── payments/
│   │   ├── customers/
│   │   ├── production/
│   │   ├── complaints/
│   │   ├── reviews/
│   │   ├── notifications/
│   │   └── chat/
│   │
│   ├── layouts/
│   │   ├── auth-layout.tsx
│   │   ├── customer-layout.tsx
│   │   └── admin-layout.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   ├── auth/
│   │   ├── utils/
│   │   └── constants/
│   │
│   ├── routes/
│   │
│   ├── root.tsx
│   └── routes.ts
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed.sql
│
├── docs/
│   ├── PRD.md
│   ├── DESIGN.md
│   ├── DATABASE.md
│   └── ARCHITECTURE.md
│
├── public/
│
├── .env.example
├── .gitignore
├── package.json
├── react-router.config.ts
├── tsconfig.json
└── README.md
```

Struktur dapat berkembang, tetapi perubahan besar harus memiliki alasan yang jelas.

---

# 10. Routes Configuration

React Router menggunakan central route configuration.

Target:

```text
app/routes.ts
```

Route modules berada di:

```text
app/routes/
```

---

# 11. Public Routes

Routes yang dapat diakses tanpa login:

```text
/

/login

/register

/forgot-password

/services
```

Home `/` dapat menampilkan landing page jika user belum login.

---

# 12. Customer Protected Routes

Customer yang sudah login dapat mengakses:

```text
/app

/app/orders

/app/orders/new

/app/orders/:orderId

/app/chat

/app/profile

/app/profile/addresses

/app/notifications
```

Menggunakan prefix `/app` membantu memisahkan authenticated customer application dari public website.

---

# 13. Admin Routes

Admin menggunakan prefix:

```text
/admin
```

Routes:

```text
/admin

/admin/orders

/admin/orders/:orderId

/admin/production

/admin/customers

/admin/customers/:customerId

/admin/payments

/admin/complaints

/admin/services

/admin/reports

/admin/settings
```

---

# 14. Layout Architecture

Tiga layout utama:

```text
AuthLayout

CustomerLayout

AdminLayout
```

---

# 15. Auth Layout

Digunakan oleh:

```text
/login

/register

/forgot-password
```

Tujuannya agar authentication page mempunyai desain konsisten.

---

# 16. Customer Layout

Digunakan oleh:

```text
/app/*
```

Customer layout menangani: