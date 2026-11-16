import type { ComplaintCategory, ComplaintStatus } from "./types";

export const complaintCategoryLabels: Record<ComplaintCategory, string> = {
  SERVICE_QUALITY: "Kualitas layanan",
  ITEM_DAMAGE: "Barang rusak",
  ITEM_LOST: "Barang hilang",
  PICKUP_DELIVERY: "Penjemputan / pengantaran",
  BILLING: "Tagihan / pembayaran",
  OTHER: "Lainnya",
};

export const complaintStatusLabels: Record<ComplaintStatus, string> = {
  OPEN: "Terbuka",
  IN_PROGRESS: "Diproses",
  RESOLVED: "Terselesaikan",
  CLOSED: "Ditutup",
};

export const complaintTimelineLabels: Record<ComplaintStatus, string> = {
  OPEN: "Komplain dibuat",
  IN_PROGRESS: "Sedang ditangani",
  RESOLVED: "Terselesaikan",
  CLOSED: "Ditutup",
};

export const complaintStatusStyles: Record<ComplaintStatus, string> = {
  OPEN: "bg-amber-50 text-amber-700 ring-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CLOSED: "bg-slate-100 text-slate-700 ring-slate-200",
};

export const complaintDateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeZone: "Asia/Jakarta",
});

export const complaintDateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});
