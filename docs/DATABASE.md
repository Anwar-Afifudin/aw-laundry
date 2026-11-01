# A&W Laundry — Database Design

## 1. Document Purpose

Dokumen ini mendefinisikan struktur database A&W Laundry.

Database utama menggunakan:

**Supabase PostgreSQL**

Authentication menggunakan:

**Supabase Auth**

File storage menggunakan:

**Supabase Storage**

Database harus mendukung kebutuhan yang didefinisikan dalam:

- `docs/PRD.md`
- `docs/DESIGN.md`

Dokumen ini menjadi referensi sebelum membuat migration, schema, API, loader, action, dan fitur aplikasi.

---

# 2. Database Principles

Database A&W Laundry mengikuti prinsip berikut.

**Relational**

Data utama menggunakan relasi PostgreSQL.

**Traceable**

Perubahan status order harus memiliki history.

**Secure**

Customer hanya dapat mengakses data miliknya sendiri.

**Scalable**

Struktur dipersiapkan agar dapat dikembangkan untuk multi-role dan multi-branch.

**Auditable**

Perubahan penting oleh admin dapat dicatat.

**AI Safe**

Chatbot hanya boleh membaca data yang memang dapat diakses oleh user yang sedang login.

---

# 3. Authentication Architecture

Supabase Auth menjadi sumber authentication.

Table bawaan:

```text
auth.users
```

A&W Laundry tidak membuat table password sendiri.

Setiap user Supabase memiliki:

```text
auth.users.id
```

bertipe:

```text
UUID
```

User tersebut dihubungkan ke:

```text
public.profiles
```

Relationship:

```text
auth.users
     |
     | 1 : 1
     v
profiles
```

---

# 4. User Role

Version 1 memiliki role:

```text
CUSTOMER
ADMIN
```

Database tetap dipersiapkan agar di masa depan dapat memiliki:

```text
OWNER
CASHIER
OPERATOR
DRIVER
```

Role tidak boleh ditentukan hanya dari frontend.

Authorization harus tetap diverifikasi di database/server.

---

# 5. Core Entity Relationship

High-level relationship:

```text
auth.users
    |
    v
profiles
    |
    +--------------------+
    |                    |
    v                    v
addresses             orders
                        |
          +-------------+-------------+
          |             |             |
          v             v             v
     order_items   status_history   payments
          |
          |
          +-----------------------------+
          |              |              |
          v              v              v
     order_photos    complaints      reviews
```

Chat system:

```text
profiles
    |
    v
chat_conversations
    |
    v
chat_messages
```

Service system:

```text
service_categories
        |
        v
     services
        |
        v
   order_items
```

---

# 6. Table: profiles

Purpose:

Menyimpan informasi aplikasi untuk user Supabase.

Table:

```text
profiles
```

Columns:

| Column | Type | Description |
|---|---|---|
| id | uuid PK | Sama dengan `auth.users.id` |
| role | enum | CUSTOMER / ADMIN |
| full_name | text | Nama user |
| phone | text | Nomor telepon |
| avatar_url | text nullable | Foto profile |
| is_active | boolean | Status akun |
| created_at | timestamptz | Waktu dibuat |
| updated_at | timestamptz | Waktu diperbarui |

Relationship:

```text
auth.users.id
      ↓
profiles.id
```

Default role untuk public registration:

```text
CUSTOMER
```

Public user tidak boleh menentukan role ADMIN sendiri.

---

# 7. Table: addresses

Purpose:

Menyimpan alamat customer.

Table:

```text
addresses
```

Columns:

| Column | Type | Description |
|---|---|---|
| id | uuid PK | Address ID |
| customer_id | uuid FK | profiles.id |
| label | text | Rumah, Kantor, dll |
| recipient_name | text | Nama penerima |
| phone | text | Nomor telepon |
| address_line | text | Alamat lengkap |
| city | text nullable | Kota |
| district | text nullable | Kecamatan |
| postal_code | text nullable | Kode pos |
| latitude | numeric nullable | Latitude |
| longitude | numeric nullable | Longitude |
| notes | text nullable | Catatan |
| is_default | boolean | Alamat default |
| created_at | timestamptz | Created |
| updated_at | timestamptz | Updated |

Relationship:

```text
profiles
   |
   | 1 : many
   v
addresses
```

---

# 8. Table: service_categories

Purpose:

Mengelompokkan layanan.

Examples:

```text
Laundry Kiloan
Laundry Satuan
Sepatu
Bed Cover
Karpet
Boneka
Special Cleaning
```

Columns:

| Column | Type |
|---|---|
| id | uuid PK |
| name | text |
| slug | text unique |
| description | text nullable |
| icon | text nullable |
| sort_order | integer |
| is_active | boolean |
| created_at | timestamptz |
| updated_at | timestamptz |

---

# 9. Table: services

Purpose:

Menyimpan layanan A&W Laundry.

Columns:

| Column | Type | Description |
|---|---|---|
| id | uuid PK | Service ID |
| category_id | uuid FK | service_categories.id |
| name | text | Nama layanan |
| slug | text unique | URL friendly |
| description | text nullable | Deskripsi |
| price | numeric(12,2) | Harga |
| price_type | enum | PER_KG / PER_ITEM / PER_METER / FIXED |
| estimated_duration_hours | integer | Estimasi proses |
| image_url | text nullable | Gambar |
| is_active | boolean | Aktif/tidak |
| created_at | timestamptz | Created |
| updated_at | timestamptz | Updated |

Price type:

```text
PER_KG
PER_ITEM
PER_METER
FIXED
```

Relationship:

```text
service_categories
        |
        | 1 : many
        v
     services
```

---

# 10. Table: orders

Purpose:

Table utama transaksi laundry.

Columns utama:

| Column | Type | Description |
|---|---|---|
| id | uuid PK | Internal ID |
| order_number | text unique | AWL-YYYYMMDD-XXXX |
| customer_id | uuid FK | profiles.id |
| status | enum | Current order status |
| intake_method | enum | PICKUP / DROPOFF |
| return_method | enum | DELIVERY / CUSTOMER_PICKUP |
| estimated_completion_at | timestamptz nullable | Estimasi selesai |
| actual_completion_at | timestamptz nullable | Waktu selesai |
| special_instructions | text nullable | Catatan customer |
| admin_notes | text nullable | Catatan internal |
| estimated_subtotal | numeric(12,2) | Estimasi biaya layanan |
| final_subtotal | numeric(12,2) | Biaya aktual layanan |
| pickup_fee | numeric(12,2) | Biaya pickup |
| delivery_fee | numeric(12,2) | Biaya delivery |
| discount_amount | numeric(12,2) | Diskon |
| additional_charge | numeric(12,2) | Biaya tambahan |
| estimated_total | numeric(12,2) | Total estimasi |
| final_total | numeric(12,2) | Total final |
| payment_status | enum | Current payment state |
| created_at | timestamptz | Created |
| updated_at | timestamptz | Updated |

---

# 11. Order Status Enum

Order status:

```text
ORDER_CREATED

WAITING_PICKUP

PICKED_UP

RECEIVED

WEIGHING

WAITING_PROCESS

WASHING

DRYING

IRONING

QUALITY_CONTROL

PACKING

READY

OUT_FOR_DELIVERY

COMPLETED

CANCELLED
```

Tidak semua layanan wajib melewati seluruh status.

---

# 12. Intake Method

```text
PICKUP
DROPOFF
```

Meaning:

`PICKUP`

A&W Laundry mengambil laundry dari customer.

`DROPOFF`

Customer membawa laundry sendiri.

---

# 13. Return Method

Setelah proses selesai:

```text
DELIVERY

CUSTOMER_PICKUP
```

Dengan demikian sistem dapat menangani skenario:

```text
Pickup → Delivery
Pickup → Customer Pickup
Drop-off → Delivery
Drop-off → Customer Pickup
```

---

# 14. Order Address Snapshot

Order harus menyimpan snapshot alamat.

Tujuannya:

Jika customer mengubah alamat profile setelah order dibuat, alamat order lama tidak ikut berubah.

Tambahkan pada `orders`:

| Column | Type |
|---|---|
| pickup_address_snapshot | jsonb nullable |
| delivery_address_snapshot | jsonb nullable |

Contoh:

```json
{
  "recipient_name": "Anwar",
  "phone": "08xxxxxxxxxx",
  "address_line": "Jl. Example No. 10",
  "city": "Semarang",
  "notes": "Rumah pagar hitam"
}
```

Table `addresses` digunakan untuk saved address.

`orders` menyimpan snapshot pada saat transaksi.

---

# 15. Pickup Schedule

Tambahkan pada `orders`:

| Column | Type |
|---|---|
| pickup_scheduled_at | timestamptz nullable |
| pickup_actual_at | timestamptz nullable |

Jika intake method:

```text
DROPOFF
```

field pickup dapat bernilai null.

---

# 16. Delivery Information

Tambahkan:

| Column | Type |
|---|---|
| delivery_scheduled_at | timestamptz nullable |
| delivered_at | timestamptz nullable |

---

# 17. Table: order_items

Purpose:

Satu order dapat memiliki lebih dari satu jenis layanan.

Contoh:

```text
Order AWL-001

Cuci + Setrika 5.2 KG
Sepatu 1 Pasang
Bed Cover 1 Item
```

Columns:

| Column | Type | Description |
|---|---|---|
| id | uuid PK | Order item |
| order_id | uuid FK | orders.id |
| service_id | uuid FK | services.id |
| service_name_snapshot | text | Nama ketika order dibuat |
| price_type_snapshot | enum | Pricing method |
| unit_price_snapshot | numeric(12,2) | Harga saat order |
| estimated_quantity | numeric nullable | Perkiraan |
| actual_quantity | numeric nullable | Aktual |
| estimated_subtotal | numeric(12,2) | Estimasi |
| final_subtotal | numeric(12,2) | Aktual |
| notes | text nullable | Notes |
| created_at | timestamptz | Created |
| updated_at | timestamptz | Updated |

---

# 18. Why Price Snapshot Is Required

Order tidak boleh hanya mengandalkan harga terkini dari table `services`.

Contoh:

Hari ini:

```text
Cuci + Setrika
Rp10.000/kg
```

Bulan depan harga berubah:

```text
Rp12.000/kg
```

Order lama tetap harus menampilkan:

```text
Rp10.000/kg
```

Karena itu `order_items` menyimpan:

```text
service_name_snapshot

unit_price_snapshot

price_type_snapshot
```

---

# 19. Estimated vs Actual Quantity

Contoh PER_KG:

Customer:

```text
estimated_quantity = 5
```

Setelah ditimbang:

```text
actual_quantity = 6.3
```

Calculation:

```text
6.3 × 10.000
= Rp63.000
```

Contoh PER_ITEM:

```text
actual_quantity = 2
```

Harga:

```text
2 × Rp35.000
= Rp70.000
```

---

# 20. Table: order_status_history

Purpose:

Menyimpan timeline perubahan order.

Columns:

| Column | Type |
|---|---|
| id | uuid PK |
| order_id | uuid FK |
| from_status | enum nullable |
| to_status | enum |
| changed_by | uuid FK nullable |
| note | text nullable |
| created_at | timestamptz |

Relationship:

```text
orders
   |
   | 1 : many
   v
order_status_history
```

Customer tracking menggunakan data ini.

---

# 21. Current Status vs History

`orders.status`

digunakan untuk mendapatkan status saat ini dengan cepat.

Sedangkan:

`order_status_history`

digunakan untuk melihat perjalanan order.

Contoh:

```text
orders.status
=
WASHING
```

History:

```text
09:00 ORDER_CREATED

09:30 PICKED_UP

10:00 RECEIVED

10:15 WEIGHING

11:00 WASHING
```

---

# 22. Table: payments

Purpose:

Menyimpan transaksi pembayaran.

Satu order dapat memiliki lebih dari satu payment record agar sistem siap untuk retry, refund, atau pengembangan berikutnya.

Columns:

| Column | Type |
|---|---|
| id | uuid PK |
| order_id | uuid FK |
| amount | numeric(12,2) |
| method | enum |
| status | enum |
| proof_url | text nullable |
| reference_number | text nullable |
| paid_at | timestamptz nullable |
| confirmed_by | uuid FK nullable |
| notes | text nullable |
| created_at | timestamptz |
| updated_at | timestamptz |

---

# 23. Payment Method Enum

```text
CASH

BANK_TRANSFER

QRIS

COD
```

---

# 24. Payment Status Enum

```text
UNPAID

PENDING

PAID

FAILED

REFUNDED
```

Primary MVP flow:

```text
UNPAID
   |
   v
PAID
```

Transfer atau QRIS manual dapat menggunakan:

```text
PENDING
```

jika bukti pembayaran masih menunggu verifikasi admin.

---

# 25. Payment Proof

Untuk transfer manual atau QRIS manual, customer dapat mengunggah bukti.

File disimpan di:

```text
Supabase Storage
```

Database hanya menyimpan path atau URL file.

---

# 26. Table: order_photos

Purpose:

Dokumentasi kondisi barang.

Columns:

| Column | Type |
|---|---|
| id | uuid PK |
| order_id | uuid FK |
| file_path | text |
| photo_type | enum |
| description | text nullable |
| uploaded_by | uuid FK |
| created_at | timestamptz |

Photo type:

```text
RECEIVED_CONDITION

STAIN

DAMAGE

ITEM_EVIDENCE

PACKING

OTHER
```

---

# 27. Storage Buckets

Recommended Supabase Storage buckets:

```text
avatars

order-evidence

payment-proofs

complaint-evidence
```

Bucket access harus mengikuti authorization.

File private customer tidak boleh otomatis menjadi public.

---

# 28. Table: complaints

Purpose:

Mengelola keluhan customer.

Columns:

| Column | Type |
|---|---|
| id | uuid PK |
| order_id | uuid FK |
| customer_id | uuid FK |
| category | enum |
| description | text |
| status | enum |
| resolution | text nullable |
| resolved_by | uuid FK nullable |
| resolved_at | timestamptz nullable |
| created_at | timestamptz |
| updated_at | timestamptz |

---

# 29. Complaint Category

```text
LOST_ITEM

WRONG_ITEM

DAMAGED_ITEM

STAIN

SMELL

LATE_ORDER

SERVICE_QUALITY

OTHER
```

---

# 30. Complaint Status

```text
OPEN

IN_REVIEW

RESOLVED

REJECTED
```

---

# 31. Table: complaint_attachments

Columns:

| Column | Type |
|---|---|
| id | uuid PK |
| complaint_id | uuid FK |
| file_path | text |
| created_at | timestamptz |

File disimpan pada Supabase Storage.

---

# 32. Table: reviews

Purpose:

Customer memberikan review setelah order selesai.

Columns:

| Column | Type |
|---|---|
| id | uuid PK |
| order_id | uuid FK unique |
| customer_id | uuid FK |
| rating | integer |
| comment | text nullable |
| created_at | timestamptz |
| updated_at | timestamptz |

Constraint:

```text
rating >= 1 AND rating <= 5
```

Satu order hanya boleh mempunyai satu review.

---

# 33. Table: notifications

Purpose:

Notification center di aplikasi.

Columns:

| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid FK |
| title | text |
| message | text |
| type | text |
| related_order_id | uuid nullable |
| is_read | boolean |
| created_at | timestamptz |

Examples:

```text
Order berhasil dibuat

Laundry sedang diproses

Harga final tersedia

Laundry siap diambil

Pembayaran dikonfirmasi
```

---

# 34. Table: audit_logs

Purpose:

Mencatat aksi penting admin.

Columns:

| Column | Type |
|---|---|
| id | uuid PK |
| actor_id | uuid FK |
| action | text |
| entity_type | text |
| entity_id | uuid |
| old_value | jsonb nullable |
| new_value | jsonb nullable |
| created_at | timestamptz |

Contoh action:

```text
ORDER_STATUS_CHANGED

ORDER_PRICE_CHANGED

PAYMENT_CONFIRMED

ORDER_CANCELLED

SERVICE_PRICE_CHANGED
```

---

# 35. Audit Example

```json
{
  "action": "ORDER_PRICE_CHANGED",
  "entity_type": "ORDER",
  "old_value": {
    "final_total": 65000
  },
  "new_value": {
    "final_total": 68000
  }
}
```

---

# 36. Table: chat_conversations

Purpose:

Menyimpan sesi percakapan A&W Laundry Assistant.

Columns:

| Column | Type |
|---|---|
| id | uuid PK |
| customer_id | uuid FK |
| title | text nullable |
| created_at | timestamptz |
| updated_at | timestamptz |

Relationship:

```text
profiles
   |
   | 1 : many
   v
chat_conversations
```

---

# 37. Table: chat_messages

Purpose:

Menyimpan pesan chatbot.

Columns:

| Column | Type |
|---|---|
| id | uuid PK |
| conversation_id | uuid FK |
| role | enum |
| content | text |
| metadata | jsonb nullable |
| created_at | timestamptz |

Role:

```text
USER

ASSISTANT

SYSTEM
```

---

# 38. Chat Metadata

Metadata dapat menyimpan informasi non-sensitif terkait response.

Contoh:

```json
{
  "intent": "CHECK_ORDER_STATUS",
  "order_id": "uuid"
}
```

Jangan menyimpan secret, password, token, atau service key dalam chat messages.

---

# 39. AI Order Access

Chatbot authenticated menggunakan identity customer yang sedang login.

Contoh request:

```text
Laundry saya sudah sampai mana?
```

System mencari:

```text
orders.customer_id
=
auth.uid()
```

Chatbot tidak boleh melakukan query customer lain.

---

# 40. Chatbot Permission

Version 1 AI diperbolehkan:

```text
READ service data

READ customer own profile

READ customer own orders

READ customer own payment status

READ customer own order timeline
```

AI tidak diperbolehkan:

```text
UPDATE order status

UPDATE final price

CONFIRM payment

DELETE order

READ another customer's data

CHANGE user role

ACCESS admin-only information
```

---

# 41. Row Level Security

Supabase RLS wajib digunakan untuk data customer.

RLS harus aktif untuk table sensitif.

Customer hanya dapat membaca:

```text
profiles.id = auth.uid()
```

Customer order:

```text
orders.customer_id = auth.uid()
```

Customer address:

```text
addresses.customer_id = auth.uid()
```

Customer complaint:

```text
complaints.customer_id = auth.uid()
```

Customer chat:

```text
chat_conversations.customer_id = auth.uid()
```

---

# 42. Admin Access

Admin memerlukan policy terpisah.

Admin status berasal dari:

```text
profiles.role
```

Example concept:

```text
role = 'ADMIN'
```

Authorization tidak boleh hanya mengandalkan UI.

Menyembunyikan menu admin di frontend tidak cukup.

Database/server harus memverifikasi role.

---

# 43. Important Security Rule

Jangan pernah menggunakan:

```text
SUPABASE_SERVICE_ROLE_KEY
```

di browser/client bundle.

Service Role Key hanya boleh digunakan pada trusted server environment jika benar-benar diperlukan.

Customer browser menggunakan public client configuration dan akses dibatasi melalui authentication + RLS.

---

# 44. Database Timestamps

Gunakan:

```text
created_at

updated_at
```

pada entity utama.

Default created:

```text
now()
```

`updated_at` diperbarui ketika record berubah.

---

# 45. Primary Key

Gunakan UUID untuk primary key utama.

Example:

```text
id uuid primary key default gen_random_uuid()
```

Exception:

```text
profiles.id
```

menggunakan UUID dari:

```text
auth.users.id
```

---

# 46. Human Readable Order Number

Internal database menggunakan UUID.

Customer tidak perlu melihat UUID.

Customer melihat:

```text
AWL-20261102-0001
```

Stored as:

```text
order_number
```

UUID:

```text
orders.id
```

digunakan untuk database relation.

---

# 47. Order Number Rule

Format:

```text
AWL-YYYYMMDD-XXXX
```

Example:

```text
AWL-20261102-0001
```

Order number harus unique.

Generation harus dilakukan secara aman agar tidak menghasilkan duplicate number pada concurrent orders.

---

# 48. Calculated Order Price

Concept:

```text
Estimated Total
=
Estimated Subtotal
+ Pickup Fee
+ Delivery Fee
- Discount
+ Additional Charge
```

Final:

```text
Final Total
=
Final Subtotal
+ Pickup Fee
+ Delivery Fee
- Discount
+ Additional Charge
```

Backend/server harus menjadi sumber final calculation.

Jangan mempercayai total harga yang dikirim frontend.

---

# 49. Order Data Integrity

Customer boleh mengirim:

```text
service

estimated quantity

pickup preference

schedule

notes
```

Tetapi field sensitif seperti:

```text
final_total

payment_status

admin_notes

actual_quantity
```

tidak boleh dapat dimodifikasi bebas oleh customer.

---

# 50. Recommended Indexes

Index penting:

```text
orders.customer_id

orders.status

orders.payment_status

orders.created_at

orders.order_number

order_items.order_id

order_status_history.order_id

payments.order_id

complaints.customer_id

complaints.order_id

notifications.user_id

chat_conversations.customer_id

chat_messages.conversation_id
```

---

# 51. Delete Strategy

Hindari hard delete untuk transaksi penting.

Order yang dibatalkan menggunakan:

```text
status = CANCELLED
```

bukan langsung dihapus.

Payment history juga tidak boleh mudah dihapus.

Audit log sebaiknya bersifat append-only.

---

# 52. MVP Database Tables

Database MVP terdiri dari:

```text
profiles

addresses

service_categories

services

orders

order_items

order_status_history

payments

order_photos

complaints

complaint_attachments

reviews

notifications

audit_logs

chat_conversations

chat_messages
```

---

# 53. Future Tables

Belum diperlukan pada Version 1:

```text
branches

employees

drivers

delivery_routes

inventory_items

inventory_transactions

memberships

loyalty_points

vouchers

promotions

subscriptions
```

Jangan membuat table tersebut sebelum dibutuhkan.

---

# 54. Full ERD

```text
                         auth.users
                             |
                             | 1:1
                             v
                          profiles
                    _________|____________
                   |         |            |
                   |         |            |
                   v         v            v
              addresses    orders   chat_conversations
                             |             |
             ________________|_____        |
            |       |        |     |       v
            |       |        |     |   chat_messages
            v       v        v     v
      order_items  status  payments photos
            |
            |
            v
         services
            |
            v
   service_categories


orders
   |
   +---- complaints
   |          |
   |          v
   |    complaint_attachments
   |
   +---- reviews
   |
   +---- notifications (related_order_id)
```

`status` pada diagram di atas berarti:

```text
order_status_history
```

---

# 55. Core Transaction Relationship

```text
CUSTOMER
   |
   v
ORDER
   |
   +---- ORDER ITEMS
   |
   +---- STATUS HISTORY
   |
   +---- PAYMENT
   |
   +---- PHOTOS
   |
   +---- COMPLAINT
   |
   +---- REVIEW
```

Order adalah pusat transaksi A&W Laundry.

---

# 56. Customer Data Flow

```text
Supabase Auth

↓

profiles

↓

addresses

↓

orders

↓

order_items

↓

order_status_history

↓

payments
```

---

# 57. AI Data Flow

```text
Authenticated Customer

↓

auth.uid()

↓

profiles.id

↓

Find customer's orders

↓

Read relevant order

↓

Read status/history/payment

↓

Generate safe response

↓

Save conversation

↓

chat_messages
```

---

# 58. Data Ownership

Customer owns:

```text
Profile

Addresses

Orders

Complaints

Reviews

Chat conversations
```

Admin manages operational data but does not become owner of customer data.

---

# 59. Database Development Rule

Sebelum menambahkan column atau table baru:

1. Periksa `PRD.md`.

2. Periksa `DATABASE.md`.

3. Tentukan apakah data tersebut benar-benar diperlukan.

4. Hindari duplicate data jika tidak membutuhkan snapshot.

5. Jika schema berubah, update `DATABASE.md`.

6. Gunakan migration untuk perubahan database.

---

# 60. Codex Database Instruction

Sebelum Codex membuat schema atau migration:

```text
Read:
docs/PRD.md
docs/DESIGN.md
docs/DATABASE.md
```

Codex harus:

```text
Follow database relationships.

Use PostgreSQL-compatible SQL.

Implement Supabase RLS.

Do not expose service role key.

Do not invent tables without justification.

Use UUID primary keys.

Use timestamps.

Use foreign keys.

Preserve transactional history.

Avoid destructive migrations unless explicitly requested.
```

---

# 61. Database Success Criteria

Database dianggap memenuhi MVP jika:

Customer dapat memiliki profile.

Customer dapat memiliki beberapa alamat.

Admin dapat mengelola service.

Customer dapat membuat order.

Order dapat memiliki beberapa layanan.

Estimated dan actual quantity dapat dibedakan.

Harga lama tetap tersimpan walaupun service price berubah.

Order status memiliki history.

Payment dapat dicatat.

Foto kondisi barang dapat disimpan.

Complaint dapat dikaitkan dengan order.

Customer dapat memberikan review.

Notification dapat disimpan.

Admin action penting dapat diaudit.

Chatbot memiliki conversation history.

Chatbot hanya dapat membaca order milik authenticated customer.

RLS mencegah customer mengakses customer lain.

---

# 62. Final Database Principle

Database A&W Laundry harus mendukung tiga kebutuhan utama:

**Operational Reliability**

Order dan pembayaran tercatat dengan benar.

**Traceability**

Perjalanan laundry dapat diketahui dari awal sampai selesai.

**Data Security**

Setiap pengguna hanya dapat mengakses informasi sesuai hak aksesnya.