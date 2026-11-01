# A&W Laundry — Design System & UI/UX Specification

## 1. Document Purpose

Dokumen ini menjadi pedoman utama desain UI/UX A&W Laundry.

Semua halaman, komponen, layout, warna, typography, responsive behavior, dan interaction pattern harus mengikuti dokumen ini agar tampilan aplikasi tetap konsisten.

Dokumen ini harus dibaca bersama:

- `docs/PRD.md`

Sebelum melakukan implementasi UI, developer atau AI coding agent harus membaca kedua dokumen tersebut.

---

# 2. Product Design Direction

A&W Laundry menggunakan gaya:

**Modern SaaS Dashboard**

Karakter desain:

- Clean
- Modern
- Professional
- Friendly
- Minimal
- Spacious
- Easy to scan
- Mobile friendly
- Consistent
- Accessible

Aplikasi harus terlihat profesional seperti aplikasi SaaS modern, tetapi tetap sederhana bagi pelanggan laundry yang tidak terbiasa menggunakan aplikasi kompleks.

---

# 3. Design Principle

## 3.1 Clarity

Informasi penting harus mudah ditemukan.

Contoh:

- Status laundry
- Total pembayaran
- Estimasi selesai
- Order ID
- Tombol membuat order

---

## 3.2 Simplicity

Jangan memberikan terlalu banyak pilihan dalam satu halaman.

Satu halaman sebaiknya memiliki satu tujuan utama.

---

## 3.3 Consistency

Komponen yang memiliki fungsi sama harus memiliki desain dan behavior yang sama.

Contoh:

Semua status menggunakan komponen `Badge`.

Semua form menggunakan style input yang sama.

Semua modal menggunakan komponen dialog yang sama.

---

## 3.4 Feedback

Setiap tindakan user harus memberikan feedback.

Contoh:

Setelah order dibuat:

```text
Order berhasil dibuat.
```

Setelah pembayaran dikonfirmasi:

```text
Pembayaran berhasil dikonfirmasi.
```

---

## 3.5 Mobile First Customer Experience

Customer interface dirancang dengan prioritas penggunaan smartphone.

Admin dashboard menggunakan pendekatan desktop-first tetapi tetap responsive.

---

# 4. Technology UI

UI menggunakan:

- Tailwind CSS
- shadcn/ui
- Lucide Icons

Gunakan komponen shadcn/ui ketika tersedia sebelum membuat custom component.

Contoh:

- Button
- Card
- Badge
- Dialog
- Sheet
- Tabs
- Table
- Dropdown Menu
- Select
- Input
- Textarea
- Avatar
- Tooltip
- Skeleton
- Alert
- Toast
- Drawer

---

# 5. Color System

## Primary

Gunakan warna biru sebagai warna utama A&W Laundry.

Primary:

```text
Blue 600
```

Contoh Tailwind:

```text
bg-blue-600
text-blue-600
border-blue-600
```

Primary Hover:

```text
Blue 700
```

---

## Background

Main background:

```text
Slate 50
```

Card:

```text
White
```

Secondary surface:

```text
Slate 100
```

---

## Text

Primary text:

```text
Slate 900
```

Secondary text:

```text
Slate 600
```

Muted text:

```text
Slate 500
```

---

# 6. Semantic Colors

## Success

Digunakan untuk:

- Payment Paid
- Order Completed
- Ready

Warna:

```text
Green
```

---

## Warning

Digunakan untuk:

- Pending
- Deadline mendekati batas
- Unpaid

Warna:

```text
Amber
```

---

## Danger

Digunakan untuk:

- Late order
- Failed payment
- Cancel order
- Error

Warna:

```text
Red
```

---

## Information

Digunakan untuk:

- Processing
- Washing
- Delivery

Warna:

```text
Blue
```

---

# 7. Typography

Gunakan font sans-serif modern.

Prioritas:

```text
Inter
```

Fallback:

```text
system-ui
sans-serif
```

Hierarchy:

```text
Page Title
text-2xl / text-3xl
font-bold

Section Title
text-lg / text-xl
font-semibold

Card Title
text-base
font-semibold

Body
text-sm / text-base

Caption
text-xs / text-sm
text-muted-foreground
```

---

# 8. Border Radius

Gunakan rounded corner modern.

Card:

```text
rounded-xl
```

Button:

```text
rounded-lg
```

Input:

```text
rounded-lg
```

Dialog:

```text
rounded-xl
```

---

# 9. Shadow

Gunakan shadow secara minimal.

Card utama:

```text
shadow-sm
```

Floating element:

```text
shadow-lg
```

Jangan menggunakan shadow berlebihan.

---

# 10. Customer Application Layout

Customer interface menggunakan mobile-first layout.

Desktop customer menggunakan centered content area.

Maximum content width:

```text
max-w-7xl
```

Mobile:

```text
full width
```

---

# 11. Customer Mobile Navigation

Customer menggunakan bottom navigation.

Menu utama:

```text
Home
Orders
New Order
Chat
Profile
```

Visual:

```text
┌─────────────────────────────┐
│                             │
│        PAGE CONTENT         │
│                             │
│                             │
├─────────────────────────────┤
│ Home Orders  +  Chat Profile│
└─────────────────────────────┘
```

`New Order` menjadi tombol paling menonjol.

Gunakan icon:

Home:

```text
House
```

Orders:

```text
ClipboardList
```

New Order:

```text
Plus
```

Chat:

```text
MessageCircle
```

Profile:

```text
User
```

---

# 12. Customer Desktop Navigation

Pada desktop gunakan top navigation.

Contoh:

```text
A&W Laundry

Home
Services
My Orders
Chat

Profile
```

---

# 13. Customer Home

Customer homepage harus memperlihatkan informasi paling penting terlebih dahulu.

Struktur:

```text
Greeting

Active Order

Quick Actions

Services

Recent Orders

Promotion
```

Contoh:

```text
Good Morning, Anwar 👋

Your Active Order
────────────────────────

AWL-20261102-0021

Cuci + Setrika

Sedang Dicuci

Estimated Finish
Today, 17:00

[View Order]
```

---

# 14. Quick Action

Customer dashboard memiliki quick actions.

Minimal:

```text
New Order
Track Order
Price List
Chat Assistant
```

Gunakan card atau icon button.

---

# 15. Service Card

Service card berisi:

- Icon
- Service name
- Description
- Starting price
- Estimated duration

Contoh:

```text
Cuci + Setrika

Laundry kiloan lengkap
dengan pencucian dan setrika.

Mulai Rp10.000/kg

± 24 Jam
```

---

# 16. Create Order Flow

Order dibuat menggunakan multi-step form.

Jangan menampilkan seluruh form sekaligus.

Flow:

```text
Step 1
Choose Service

↓

Step 2
Laundry Details

↓

Step 3
Pickup / Drop-off

↓

Step 4
Schedule

↓

Step 5
Order Summary

↓

Create Order
```

---

# 17. Step Indicator

Gunakan indicator seperti:

```text
1 ─── 2 ─── 3 ─── 4 ─── 5
●     ●     ○     ○     ○
```

Mobile boleh menggunakan:

```text
Step 2 of 5
```

---

# 18. Order Summary

Sebelum order dibuat user harus melihat summary.

Contoh:

```text
Order Summary

Service
Cuci + Setrika

Estimated Weight
5 Kg

Price
Rp10.000/kg

Estimated Laundry
Rp50.000

Pickup
Rp5.000

Estimated Total
Rp55.000

Harga final akan ditentukan
setelah laundry ditimbang.
```

CTA:

```text
Create Order
```

---

# 19. Customer Order List

Gunakan card pada mobile.

Contoh:

```text
AWL-20261102-0021

Cuci + Setrika

PROCESSING

2 November 2026

Rp65.000
```

Desktop dapat menggunakan table.

---

# 20. Order Detail

Order detail terdiri dari:

```text
Order Header

Status

Timeline

Service Detail

Price Detail

Pickup / Delivery

Payment

Notes

Invoice
```

---

# 21. Order Status Timeline

Gunakan vertical timeline.

Contoh:

```text
✓ Order dibuat

✓ Laundry dijemput

✓ Laundry diterima

● Sedang dicuci

○ Quality Control

○ Ready

○ Completed
```

Current status harus paling menonjol.

---

# 22. Order Status Badge

Gunakan komponen Badge.

Contoh mapping:

```text
ORDER_CREATED
Gray

WAITING_PICKUP
Amber

PICKED_UP
Blue

RECEIVED
Blue

WASHING
Blue

DRYING
Blue

IRONING
Blue

QUALITY_CONTROL
Purple

PACKING
Purple

READY
Green

OUT_FOR_DELIVERY
Blue

COMPLETED
Green

CANCELLED
Red
```

---

# 23. Payment UI

Payment card menampilkan:

```text
Payment

Total
Rp68.000

Status
UNPAID

Payment Method
QRIS

[Pay Now]
```

Status PAID:

```text
PAID ✓
```

Gunakan warna hijau.

---

# 24. Login Page

Login harus clean dan sederhana.

Desktop:

```text
┌──────────────────┬────────────────────┐
│                  │                    │
│ A&W Laundry      │       Login        │
│                  │                    │
│ Brand / Visual   │ Email              │
│                  │ Password           │
│                  │                    │
│                  │ [Login]            │
│                  │                    │
└──────────────────┴────────────────────┘
```

Mobile:

Hanya login card dan branding.

---

# 25. Registration

Registration customer meminta:

- Full name
- Email
- Phone
- Password
- Confirm password

Alamat dapat ditambahkan setelah login.

---

# 26. AI Chatbot Design

Nama chatbot:

**A&W Laundry Assistant**

Chatbot menggunakan:

```text
MessageCircle
Sparkles
Bot
```

sebagai icon.

---

# 27. Chatbot Desktop

Gunakan floating action button di kanan bawah.

Contoh:

```text
                        ┌──────┐
                        │  AI  │
                        └──────┘
```

Ketika dibuka:

```text
┌──────────────────────────────┐
│ A&W Laundry Assistant     ×  │
│ Online                       │
├──────────────────────────────┤
│                              │
│ AI                           │
│ Halo 👋                      │
│ Ada yang bisa saya bantu?    │
│                              │
│               User           │
│ Laundry saya sudah sampai    │
│ mana?                        │
│                              │
│ AI                           │
│ Order AWL-0021 sedang        │
│ dalam proses pencucian.      │
│                              │
├──────────────────────────────┤
│ Tulis pesan...          ➤    │
└──────────────────────────────┘
```

---

# 28. Chatbot Mobile

Pada mobile gunakan halaman khusus:

```text
/chat
```

Header:

```text
← A&W Laundry Assistant
```

Chat harus menggunakan hampir seluruh layar.

---

# 29. Chat Message

AI message:

Align left.

User message:

Align right.

AI bubble:

Light neutral background.

User bubble:

Primary blue.

---

# 30. Chat Quick Prompts

Ketika chat kosong tampilkan suggestion:

```text
Cek status laundry saya

Berapa harga laundry kiloan?

Bagaimana cara pickup?

Kapan laundry saya selesai?

Metode pembayaran apa saja?
```

---

# 31. AI Loading State

Saat AI sedang menjawab tampilkan:

```text
● ● ●
```

atau skeleton typing indicator.

Jangan membuat halaman terlihat freeze.

---

# 32. Admin Layout

Admin menggunakan sidebar layout.

Desktop:

```text
┌───────────────┬────────────────────────────┐
│               │                            │
│ A&W Laundry   │ Dashboard                  │
│               │                            │
│ Dashboard     │ [Card] [Card] [Card]       │
│ Orders        │                            │
│ Production    │ Charts / Tables            │
│ Customers     │                            │
│ Payments      │                            │
│ Complaints    │                            │
│ Reports       │                            │
│ Settings      │                            │
│               │                            │
└───────────────┴────────────────────────────┘
```

---

# 33. Admin Sidebar

Menu:

```text
Dashboard
Orders
Production
Customers
Payments
Complaints
Reports
Services
Settings
```

Icons:

Dashboard:

```text
LayoutDashboard
```

Orders:

```text
ClipboardList
```

Production:

```text
WashingMachine
```

Customers:

```text
Users
```

Payments:

```text
WalletCards
```

Complaints:

```text
MessageSquareWarning
```

Reports:

```text
ChartNoAxesCombined
```

Services:

```text
Shirt
```

Settings:

```text
Settings
```

---

# 34. Admin Header

Header memiliki:

```text
Page Title

Search

Notification

Admin Profile
```

---

# 35. Admin Dashboard

Dashboard menggunakan card-based layout.

Stat cards:

```text
Orders Today

Active Orders

Completed

Late Orders

Revenue Today

Unpaid
```

---

# 36. Stat Card

Contoh:

```text
Orders Today

42

+12% from yesterday
```

Gunakan icon kecil.

Jangan menggunakan terlalu banyak warna dalam stat cards.

---

# 37. Order Pipeline

Dashboard mempunyai pipeline:

```text
Waiting          8

Washing         10

Drying           5

Ironing          7

Quality Control  3

Packing          2

Ready            7
```

---

# 38. Admin Orders Table

Column:

```text
Order ID

Customer

Service

Status

Payment

Total

Deadline

Action
```

---

# 39. Table Actions

Gunakan dropdown menu.

Actions:

```text
View Order

Edit

Update Status

Payment

Print QR
```

Action destructive:

```text
Cancel Order
```

harus dipisahkan secara visual.

---

# 40. Production Queue

Production menggunakan Kanban-like workflow atau grouped list.

Column:

```text
Waiting

Washing

Drying

Ironing

QC

Packing

Ready
```

Order card menampilkan:

```text
Order ID

Customer

Service

Deadline

Priority
```

---

# 41. Priority

Priority:

```text
NORMAL
WARNING
URGENT
LATE
```

Mapping:

```text
NORMAL
Neutral

WARNING
Amber

URGENT
Orange

LATE
Red
```

---

# 42. Customer Management

Desktop menggunakan table.

Column:

```text
Customer

Phone

Total Order

Total Spending

Last Order

Status

Action
```

---

# 43. Complaint UI

Complaint menggunakan status:

```text
OPEN
IN_REVIEW
RESOLVED
REJECTED
```

Gunakan badge.

Complaint detail memperlihatkan:

- Customer
- Order
- Category
- Description
- Evidence
- Timeline
- Resolution

---

# 44. Empty State

Setiap halaman yang belum memiliki data harus mempunyai empty state.

Jangan hanya menampilkan table kosong.

Contoh:

```text
Belum ada order.

Order laundry pertama Anda
akan muncul di sini.

[Create Order]
```

---

# 45. Loading State

Gunakan Skeleton.

Contoh:

Dashboard:

```text
Skeleton Card
Skeleton Card
Skeleton Card
```

Jangan menampilkan layar putih kosong ketika loading.

---

# 46. Error State

Contoh:

```text
Something went wrong.

Kami gagal memuat data order.

[Try Again]
```

---

# 47. Confirmation Dialog

Gunakan confirmation dialog untuk tindakan penting.

Contoh:

```text
Cancel Order?

Order yang dibatalkan tidak dapat
dilanjutkan ke proses laundry.

[Back]

[Cancel Order]
```

---

# 48. Toast

Toast digunakan untuk feedback singkat.

Contoh:

```text
Order berhasil dibuat.

Status berhasil diperbarui.

Pembayaran berhasil dikonfirmasi.
```

---

# 49. Responsive Breakpoints

Ikuti breakpoint Tailwind.

```text
sm
640px

md
768px

lg
1024px

xl
1280px

2xl
1536px
```

---

# 50. Mobile Rules

Pada mobile:

- Sidebar admin berubah menjadi Sheet / Drawer
- Table dapat berubah menjadi card
- Button utama dapat full width
- Chat menjadi full-screen
- Customer menggunakan bottom navigation
- Form menggunakan single column
- Modal panjang menggunakan Drawer

---

# 51. Desktop Rules

Pada desktop:

- Admin menggunakan sidebar tetap
- Content menggunakan grid
- Table digunakan untuk data besar
- Chatbot menggunakan floating panel
- Form dapat menggunakan maksimal dua column jika sesuai

---

# 52. Button Hierarchy

## Primary

Untuk tindakan utama.

Contoh:

```text
Create Order
Save
Confirm Payment
```

---

## Secondary

Untuk tindakan alternatif.

Contoh:

```text
Back
View Detail
```

---

## Destructive

Untuk:

```text
Delete
Cancel Order
Reject
```

Gunakan warna merah.

---

# 53. Form Rules

Semua form harus memiliki:

- Label
- Input
- Validation message
- Required indicator jika diperlukan

Jangan hanya menggunakan placeholder sebagai label.

---

# 54. Form Validation

Error harus ditampilkan di bawah field.

Contoh:

```text
Phone Number

[             ]

Nomor telepon wajib diisi.
```

---

# 55. Accessibility

Target minimum:

- Keyboard navigation
- Visible focus state
- Semantic HTML
- Label untuk input
- Alt text untuk image
- Sufficient color contrast
- Button mempunyai accessible name

---

# 56. Icon Rules

Gunakan:

**Lucide React**

Jangan mencampur banyak icon library kecuali benar-benar diperlukan.

Ukuran default:

```text
16px
18px
20px
24px
```

---

# 57. Image Rules

Gunakan image hanya ketika memberikan nilai.

Contoh:

- Service illustration
- Complaint evidence
- Laundry condition evidence
- User avatar

Jangan menggunakan gambar dekoratif berlebihan di dashboard.

---

# 58. Customer Routes

Target route:

```text
/

 /login

 /register

 /forgot-password

 /services

 /orders

 /orders/new

 /orders/:orderId

 /chat

 /profile

 /profile/addresses
```

---

# 59. Admin Routes

Admin route menggunakan prefix:

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

# 60. Protected Route

Customer-only page harus membutuhkan authentication.

Admin page harus membutuhkan:

```text
role = ADMIN
```

Customer tidak boleh membuka route admin.

---

# 61. Layout Components

Target reusable layout:

```text
CustomerLayout

AdminLayout

AuthLayout
```

---

# 62. Shared UI Components

Komponen reusable yang diprioritaskan:

```text
PageHeader

StatusBadge

PaymentBadge

OrderCard

ServiceCard

StatCard

EmptyState

ErrorState

LoadingSkeleton

OrderTimeline

PriceSummary

ConfirmDialog

ChatBubble
```

---

# 63. UX Writing

Gunakan bahasa yang:

- Singkat
- Jelas
- Ramah
- Tidak terlalu teknis

Contoh baik:

```text
Laundry Anda sedang dicuci.
```

Hindari:

```text
Order sedang berada pada WASHING state.
```

Internal admin boleh menggunakan terminology lebih teknis.

---

# 64. Main Customer Experience

Target pengalaman customer:

```text
Login

↓

Home

↓

New Order

↓

Choose Service

↓

Choose Pickup / Drop-off

↓

Order Summary

↓

Order Created

↓

Track Laundry

↓

Final Price

↓

Payment

↓

Delivery / Pickup

↓

Completed

↓

Rating
```

---

# 65. Main Admin Experience

Target pengalaman admin:

```text
Login

↓

Dashboard

↓

New Order Alert

↓

Receive Laundry

↓

Verify Weight

↓

Determine Final Price

↓

Production Queue

↓

Update Status

↓

Quality Control

↓

Ready

↓

Payment

↓

Delivery / Pickup

↓

Complete Order
```

---

# 66. Design Consistency Rule

Sebelum membuat UI baru:

1. Periksa apakah shadcn/ui sudah menyediakan komponennya.

2. Periksa apakah project sudah mempunyai reusable component yang sama.

3. Jangan membuat komponen baru jika fungsi yang sama sudah tersedia.

4. Jangan menggunakan style inline jika dapat menggunakan Tailwind.

5. Jangan mengubah design system hanya untuk satu halaman.

---

# 67. AI Coding Design Instruction

Ketika Codex mengimplementasikan UI:

- Read `docs/PRD.md`
- Read `docs/DESIGN.md`
- Follow existing component patterns
- Use TypeScript
- Use Tailwind CSS
- Prefer shadcn/ui
- Use Lucide React icons
- Maintain responsive behavior
- Avoid unnecessary dependencies
- Do not redesign unrelated pages
- Do not invent features not defined in PRD
- Reuse existing components whenever possible

---

# 68. Final Design Goal

A&W Laundry harus terasa seperti:

**aplikasi SaaS modern untuk bisnis laundry yang profesional tetapi tetap mudah digunakan pelanggan biasa.**

Customer interface harus:

**Simple + Fast + Friendly**

Admin interface harus:

**Efficient + Informative + Structured**

Keseluruhan produk harus memberikan kesan:

**Clean + Trustworthy + Modern + Professional**