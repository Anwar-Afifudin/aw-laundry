# Product Requirements Document

## A&W Laundry

**Version:** 1.0  
**Product Type:** Laundry Management Web Application  
**Platform:** Responsive Web Application  
**Primary Users:** Customer dan Admin Laundry  
**Project Status:** MVP / Version 1

---

# 1. Product Overview

A&W Laundry adalah aplikasi web manajemen laundry yang dirancang untuk membantu pelanggan melakukan pemesanan laundry secara digital sekaligus membantu pengelola laundry mengelola proses operasional dari penerimaan order hingga pesanan selesai.

Aplikasi tidak hanya berfungsi sebagai sistem pencatatan transaksi, tetapi juga sebagai sistem pelacakan proses laundry yang memberikan transparansi kepada pelanggan dan kontrol operasional kepada admin.

A&W Laundry mendukung berbagai jenis layanan seperti:

- Laundry kiloan
- Laundry satuan
- Cuci dan setrika
- Setrika saja
- Sepatu
- Bed cover
- Selimut
- Boneka
- Karpet
- Layanan khusus lainnya

Aplikasi juga menyediakan layanan pickup dan delivery.

---

# 2. Product Vision

Membangun sistem laundry digital yang mampu memberikan:

- Transparansi proses laundry kepada pelanggan
- Kemudahan pemesanan laundry
- Kemudahan pickup dan delivery
- Pengurangan risiko pakaian tertukar
- Pengurangan kesalahan pencatatan
- Monitoring order secara real-time
- Pengelolaan pembayaran yang lebih rapi
- Pengelolaan operasional laundry secara terpusat
- Pengalaman pelanggan yang lebih modern
- Data bisnis yang dapat digunakan untuk pengambilan keputusan

---

# 3. Problem Statement

Bisnis laundry konvensional memiliki beberapa permasalahan utama.

## 3.1 Masalah Pelanggan

Pelanggan sering mengalami:

- Tidak mengetahui status cucian
- Tidak mengetahui kapan cucian selesai
- Harus datang langsung untuk membuat pesanan
- Tidak mengetahui estimasi harga
- Sulit mengetahui detail layanan
- Tidak mendapatkan informasi ketika laundry selesai
- Kesulitan melacak riwayat laundry
- Kesulitan menyampaikan komplain
- Risiko cucian tertukar
- Tidak mengetahui status pembayaran
- Sulit mendapatkan informasi laundry dengan cepat

---

## 3.2 Masalah Admin Laundry

Admin laundry sering mengalami:

- Pencatatan pesanan masih manual
- Kesalahan pencatatan berat
- Kesalahan perhitungan harga
- Kesulitan mengetahui order aktif
- Sulit mengetahui order yang terlambat
- Sulit mengetahui posisi suatu cucian dalam proses produksi
- Cucian berisiko tertukar
- Kesulitan mencatat pembayaran
- Riwayat pelanggan tidak terdokumentasi dengan baik
- Kesulitan mengetahui jumlah transaksi
- Sulit memantau performa bisnis
- Komplain pelanggan tidak terdokumentasi
- Tidak mengetahui siapa yang mengubah data tertentu

---

# 4. Product Goals

A&W Laundry memiliki tujuan utama sebagai berikut.

1. Mendigitalisasi proses pemesanan laundry.

2. Memberikan sistem tracking laundry kepada pelanggan.

3. Mempermudah admin mengelola seluruh order.

4. Mengurangi risiko pakaian tertukar dengan Order ID dan QR Code.

5. Menyediakan pickup dan delivery.

6. Memberikan estimasi harga sebelum laundry diproses.

7. Menghasilkan harga final setelah barang diverifikasi.

8. Mendigitalisasi pencatatan pembayaran.

9. Memberikan dashboard operasional kepada admin.

10. Menyediakan AI Chatbot sebagai customer assistant.

11. Menyimpan riwayat transaksi pelanggan.

12. Membangun sistem yang dapat dikembangkan menjadi multi-branch di masa depan.

---

# 5. User Roles

Aplikasi Version 1 memiliki dua role utama.

## 5.1 Customer

Customer adalah pengguna yang menggunakan layanan laundry.

Customer dapat:

- Membuat akun
- Login
- Melihat layanan
- Melihat harga
- Membuat order
- Memilih pickup atau drop-off
- Menentukan alamat pickup
- Memilih jadwal pickup
- Memberikan instruksi khusus
- Melihat estimasi harga
- Melihat status order
- Melihat estimasi selesai
- Melihat harga final
- Memilih metode pembayaran
- Melihat invoice
- Melihat riwayat order
- Menggunakan chatbot
- Memberikan rating
- Mengirim komplain

---

## 5.2 Admin

Admin bertugas mengelola operasional laundry.

Admin dapat:

- Login ke dashboard
- Melihat seluruh order
- Membuat order pelanggan
- Mengubah status order
- Memverifikasi berat
- Memasukkan jumlah barang
- Menentukan harga final
- Mengelola layanan
- Mengelola harga
- Mengelola pelanggan
- Mengelola pickup dan delivery
- Mengkonfirmasi pembayaran
- Membuat QR Code order
- Melihat laporan
- Mengelola komplain
- Melihat dashboard operasional
- Melihat riwayat perubahan order

---

# 6. Authentication

Authentication menggunakan Supabase Auth.

## Customer

Customer dapat melakukan:

- Register
- Login
- Logout
- Forgot password
- Reset password

Data dasar customer:

- Full name
- Email
- Phone number
- Password
- Address

---

## Admin

Admin login menggunakan akun yang sudah memiliki role Admin.

Admin tidak dapat mendaftarkan dirinya sebagai admin melalui halaman register publik.

---

# 7. Service Management

Admin dapat membuat dan mengelola layanan laundry.

Setiap layanan memiliki:

- Service name
- Description
- Category
- Price
- Price type
- Estimated duration
- Active status

---

# 8. Service Categories

Contoh kategori:

- Laundry Kiloan
- Laundry Satuan
- Sepatu
- Bed Cover
- Selimut
- Boneka
- Karpet
- Special Cleaning

Kategori dapat ditambah oleh admin.

---

# 9. Pricing System

A&W Laundry harus mendukung beberapa metode harga.

## PER_KG

Digunakan untuk layanan kiloan.

Contoh:

Cuci + Setrika  
Rp10.000/kg

---

## PER_ITEM

Digunakan untuk barang satuan.

Contoh:

Sepatu  
Rp35.000/pasang

Bed Cover  
Rp30.000/item

---

## PER_METER

Digunakan untuk layanan seperti karpet.

Contoh:

Karpet  
Rp20.000/m²

---

## FIXED

Digunakan untuk biaya tetap.

Contoh:

Biaya pickup  
Rp5.000

---

# 10. Estimated Price

Saat membuat order, customer mendapatkan estimasi harga.

Estimasi harga bukan harga final.

Contoh:

Estimated Weight:

5 kg

Service:

Cuci + Setrika

Price:

Rp10.000/kg

Estimated Price:

Rp50.000

Sistem harus memberikan informasi:

> Harga final akan ditentukan setelah laundry diterima dan diverifikasi oleh pihak A&W Laundry.

---

# 11. Final Price

Setelah laundry diterima, admin melakukan verifikasi.

Admin dapat memasukkan:

- Actual weight
- Item quantity
- Additional service
- Pickup fee
- Delivery fee
- Discount
- Additional charge

Sistem kemudian menghitung:

**Final Price**

Harga final ditampilkan kepada customer.

---

# 12. Order Creation

Customer dapat membuat order baru.

Customer memilih:

- Laundry service
- Quantity atau estimated weight
- Pickup / Drop-off
- Pickup address
- Pickup date
- Pickup time
- Special instruction

Setelah order dibuat, sistem menghasilkan:

- Order ID
- Estimated price
- Order status
- Created date
- Estimated completion date

---

# 13. Order ID

Setiap order memiliki ID unik.

Format awal:

AWL-YYYYMMDD-XXXX

Contoh:

AWL-20261102-0001

---

# 14. Order Lifecycle

Status order utama:

1. ORDER_CREATED
2. WAITING_PICKUP
3. PICKED_UP
4. RECEIVED
5. WEIGHING
6. WAITING_PROCESS
7. WASHING
8. DRYING
9. IRONING
10. QUALITY_CONTROL
11. PACKING
12. READY
13. OUT_FOR_DELIVERY
14. COMPLETED
15. CANCELLED

Tidak semua order harus menggunakan semua status.

Contohnya layanan sepatu mungkin mempunyai workflow berbeda.

---

# 15. Customer Tracking

Customer tidak perlu melihat status teknis terlalu kompleks.

Status customer dapat disederhanakan menjadi:

- Order dibuat
- Laundry diterima
- Sedang diproses
- Quality Control
- Siap diambil
- Sedang dikirim
- Selesai

Customer dapat membuka detail order dan melihat timeline.

---

# 16. Order Timeline

Setiap perubahan status dicatat.

Contoh:

09:00 — Order dibuat  
09:30 — Laundry dijemput  
10:00 — Laundry diterima  
10:15 — Berat diverifikasi  
11:00 — Proses pencucian  
13:00 — Pengeringan  
14:00 — Setrika  
15:00 — Quality Control  
15:30 — Packing  
16:00 — Ready  
17:00 — Completed

Timeline digunakan untuk memberikan transparansi.

---

# 17. QR Code Tracking

Setiap order menghasilkan QR Code.

QR Code dapat ditempel pada:

- Laundry bag
- Packaging
- Order label

QR Code mengarah ke informasi internal order.

QR dapat digunakan admin untuk:

- Membuka order
- Memeriksa customer
- Melihat service
- Melihat berat
- Melihat status
- Mengubah status sesuai hak akses

QR Code tidak boleh menampilkan data pribadi sensitif kepada pengguna yang tidak memiliki akses.

---

# 18. Pickup System

Customer dapat memilih:

**Pickup**

Customer menentukan:

- Address
- Pickup date
- Pickup time
- Notes

Status:

WAITING_PICKUP

kemudian:

PICKED_UP

---

# 19. Drop-off System

Customer dapat memilih:

**Drop-off**

Customer mengantar cucian langsung.

Order tidak memerlukan proses pickup.

---

# 20. Delivery System

Setelah laundry selesai, customer dapat menerima laundry melalui delivery.

Status:

READY

kemudian:

OUT_FOR_DELIVERY

kemudian:

COMPLETED

---

# 21. Payment System

Pembayaran utama dilakukan setelah laundry selesai dan harga final sudah diketahui.

Metode pembayaran Version 1:

- Cash
- Bank Transfer
- QRIS
- COD

---

# 22. Payment Status

Status pembayaran:

- UNPAID
- PENDING
- PAID
- FAILED
- REFUNDED

Untuk MVP, flow utama:

UNPAID → PAID

Struktur database tetap disiapkan untuk status lainnya.

---

# 23. COD Flow

Untuk customer yang memilih COD:

Laundry selesai

↓

Order dikirim

↓

Customer menerima laundry

↓

Customer membayar

↓

Admin / delivery staff mengkonfirmasi pembayaran

↓

Payment Status = PAID

↓

Order = COMPLETED

---

# 24. QRIS / Transfer Flow

Laundry selesai

↓

Customer menerima informasi total pembayaran

↓

Customer membayar melalui QRIS / Transfer

↓

Pembayaran diverifikasi

↓

Payment Status = PAID

↓

Order dapat dikirim atau diambil

---

# 25. Invoice

Setiap order memiliki digital invoice.

Invoice berisi:

- Order ID
- Customer name
- Service
- Actual weight
- Quantity
- Service price
- Pickup fee
- Delivery fee
- Discount
- Additional charge
- Final total
- Payment method
- Payment status
- Transaction date

Invoice nantinya dapat dikembangkan menjadi:

- Download PDF
- Share
- WhatsApp

---

# 26. Customer Dashboard

Customer Dashboard menampilkan:

- Greeting
- Active Order
- Current Status
- Estimated Completion
- Final Price
- Payment Status
- Recent Orders
- Quick Order Button
- Promotion
- Chatbot Shortcut

---

# 27. Admin Dashboard

Dashboard admin menampilkan minimal:

- Orders Today
- Active Orders
- Processing Orders
- Completed Orders
- Late Orders
- Revenue Today
- Unpaid Orders
- New Customers

---

# 28. Order Management

Admin mempunyai halaman order management.

Admin dapat:

- Search order
- Filter order
- Sort order
- Open order
- Update order
- Update status
- Verify weight
- Change price
- Confirm payment

Filter:

- Date
- Status
- Payment status
- Service
- Customer

---

# 29. Production Queue

Admin mempunyai halaman production queue.

Order dapat dikelompokkan berdasarkan:

- Waiting
- Washing
- Drying
- Ironing
- QC
- Packing
- Ready

Order dengan deadline dekat diberikan prioritas.

---

# 30. SLA Warning

Sistem memberikan peringatan ketika order mendekati deadline.

Contoh:

NORMAL

WARNING

LATE

Contoh kondisi:

Deadline < 2 jam:

WARNING

Melewati deadline:

LATE

---

# 31. Customer Management

Admin dapat melihat customer.

Informasi:

- Name
- Phone
- Email
- Address
- Total orders
- Total spending
- Last order
- Registration date

---

# 32. Order History

Customer dapat melihat riwayat order.

Informasi:

- Order ID
- Date
- Service
- Total
- Status
- Payment
- Detail

Customer dapat melakukan:

REORDER

dari order sebelumnya.

---

# 33. Complaint Management

Customer dapat mengirim komplain berdasarkan order.

Kategori komplain:

- Lost item
- Wrong item
- Damaged item
- Stain
- Smell
- Late order
- Service quality
- Other

Customer dapat:

- Menulis deskripsi
- Upload foto
- Melihat status komplain

Status:

OPEN

IN_REVIEW

RESOLVED

REJECTED

---

# 34. Rating & Review

Setelah order selesai, customer dapat memberikan:

Rating 1–5

dan

Review

Rating hanya dapat diberikan kepada order yang sudah selesai.

---

# 35. Notification

Sistem mempersiapkan mekanisme notifikasi.

Notifikasi utama:

- Order dibuat
- Laundry diterima
- Laundry sedang diproses
- Laundry siap
- Harga final tersedia
- Payment confirmed
- Laundry sedang dikirim
- Laundry selesai
- Order terlambat

Version awal dapat menggunakan notification di dalam aplikasi.

Integrasi WhatsApp dapat ditambahkan setelah core system stabil.

---

# 36. AI Chatbot

A&W Laundry memiliki AI Customer Assistant.

Chatbot tersedia untuk customer.

Nama sementara:

**A&W Laundry Assistant**

---

# 37. Chatbot Capabilities

Chatbot Version 1 harus dapat membantu pengguna untuk:

- Menanyakan layanan
- Menanyakan harga
- Menanyakan estimasi waktu laundry
- Menjelaskan pickup
- Menjelaskan delivery
- Menjelaskan pembayaran
- Menjelaskan cara membuat order
- Menjelaskan status laundry
- Memberikan rekomendasi layanan
- Membantu menghitung estimasi harga
- Menjawab FAQ

---

# 38. Authenticated Chatbot

Jika customer sudah login, chatbot dapat menggunakan konteks customer.

Contoh:

Customer:

> Laundry saya sudah sampai mana?

Chatbot dapat mencari active order milik customer dan menjawab:

> Order AWL-20261102-0012 saat ini sedang dalam proses pencucian. Estimasi selesai hari ini pukul 17.00.

---

# 39. Chatbot Security

Chatbot hanya boleh membaca order milik customer yang sedang login.

Chatbot tidak boleh:

- Melihat order customer lain
- Mengubah harga
- Mengkonfirmasi pembayaran
- Mengubah status order
- Mengakses dashboard admin
- Menampilkan informasi sensitif

AI harus mengikuti permission sistem aplikasi.

---

# 40. Chatbot Escalation

Jika chatbot tidak dapat menyelesaikan masalah, chatbot memberikan pilihan:

**Hubungi Admin**

Contoh:

> Saya belum dapat menyelesaikan masalah tersebut. Silakan hubungi admin A&W Laundry agar dapat diperiksa lebih lanjut.

---

# 41. Photo Evidence

Admin dapat mengunggah foto ketika laundry diterima.

Foto digunakan sebagai dokumentasi kondisi barang.

Admin dapat menambahkan:

- Condition note
- Stain note
- Damage note
- Special note

File disimpan menggunakan Supabase Storage.

---

# 42. Audit Log

Aktivitas penting admin harus dapat dicatat.

Contoh:

- Status changed
- Price changed
- Payment confirmed
- Weight changed
- Order cancelled

Audit log menyimpan:

- User
- Action
- Old value
- New value
- Date
- Time

---

# 43. Reports

Admin mempunyai basic report.

Minimal:

- Daily revenue
- Monthly revenue
- Number of orders
- Completed orders
- Cancelled orders
- Unpaid orders
- Most used services

---

# 44. Search

Admin dapat melakukan pencarian berdasarkan:

- Order ID
- Customer name
- Phone number

---

# 45. Responsive Design

Aplikasi harus responsive.

Customer interface diprioritaskan untuk penggunaan mobile.

Admin dashboard diprioritaskan untuk:

- Desktop
- Laptop

tetapi tetap dapat digunakan melalui tablet dan mobile.

---

# 46. UI Direction

Design direction:

**Modern SaaS Dashboard**

Karakter:

- Clean
- Modern
- Professional
- Spacious
- Easy to scan
- Simple navigation
- Clear status indicators
- Card-based layout
- Responsive

---

# 47. Technology Stack

Frontend:

React Router

Language:

TypeScript

UI:

Tailwind CSS

Component Library:

shadcn/ui

Database:

Supabase PostgreSQL

Authentication:

Supabase Auth

Storage:

Supabase Storage

Development Environment:

Visual Studio Code

AI Coding Assistant:

Codex

Deployment:

Vercel

---

# 48. MVP Features

Fitur wajib Version 1:

- Authentication
- Customer profile
- Service management
- Pricing
- Order creation
- Pickup
- Drop-off
- Delivery
- Order tracking
- Order timeline
- QR order tracking
- Estimated price
- Final price
- Payment
- Digital invoice
- Admin dashboard
- Customer dashboard
- Order management
- Customer management
- Production queue
- Photo evidence
- Complaint
- Rating
- Basic reporting
- Audit log
- AI chatbot

---

# 49. Future Features

Fitur berikut tidak menjadi prioritas MVP.

## Version 2

- Loyalty points
- Membership
- Voucher
- Promotion engine
- Inventory
- Staff management
- WhatsApp automation
- Advanced reporting

## Version 3

- Multi branch
- Driver application
- Route optimization
- Real payment gateway
- Subscription laundry
- Advanced CRM
- Customer segmentation
- AI demand forecasting
- Predictive operational analytics

---

# 50. Non-Goals for MVP

Version 1 tidak berfokus pada:

- Marketplace laundry
- Multi-vendor laundry
- Franchise management
- Advanced accounting
- Payroll
- Full ERP
- Native Android application
- Native iOS application
- Automatic route optimization

Fokus Version 1 adalah membuat core laundry management berjalan dengan baik.

---

# 51. Success Criteria

MVP dianggap berhasil apabila:

1. Customer dapat register dan login.

2. Customer dapat membuat order.

3. Customer dapat memilih pickup atau drop-off.

4. Admin menerima order.

5. Admin dapat memverifikasi laundry.

6. Admin dapat menentukan harga final.

7. Admin dapat memperbarui status.

8. Customer dapat melihat status secara real-time.

9. QR Code dapat digunakan untuk membuka order.

10. Customer dapat melihat total pembayaran.

11. Admin dapat mengkonfirmasi pembayaran.

12. Customer dapat melihat invoice.

13. Customer dapat melihat order history.

14. Admin dapat melihat dashboard operasional.

15. Chatbot dapat menjawab pertanyaan laundry.

16. Chatbot dapat membaca status order user yang sedang login.

17. Customer tidak dapat melihat data customer lain.

18. Sistem dapat digunakan dengan baik melalui mobile dan desktop.

---

# 52. Core Product Principle

Setiap fitur yang dibuat harus membantu setidaknya salah satu dari tujuan berikut:

**Transparency**

Pelanggan mengetahui apa yang terjadi pada laundry mereka.

**Traceability**

Setiap order dapat dilacak dari awal sampai selesai.

**Accountability**

Perubahan penting dalam sistem dapat diketahui siapa yang melakukannya.

**Efficiency**

Admin dapat mengelola operasional dengan lebih cepat dan terstruktur.

**Customer Experience**

Pelanggan mendapatkan pengalaman laundry yang mudah, modern, dan informatif.

---

# 53. Main Business Flow

Customer Login

↓

Create Order

↓

Choose Service

↓

Choose Pickup / Drop-off

↓

Estimated Price

↓

Order Created

↓

Pickup / Customer Drop-off

↓

Laundry Received

↓

Weight & Item Verification

↓

Final Price Calculated

↓

Laundry Processing

↓

Quality Control

↓

Packing

↓

Ready

↓

Payment

↓

Pickup / Delivery

↓

Completed

↓

Rating / Review

---

# 54. Product Summary

A&W Laundry bukan sekadar sistem pencatatan laundry.

A&W Laundry merupakan sistem manajemen operasional dan customer experience yang menghubungkan:

Customer

↓

Order

↓

Laundry Process

↓

Payment

↓

Delivery

↓

Business Monitoring

dalam satu aplikasi terintegrasi.