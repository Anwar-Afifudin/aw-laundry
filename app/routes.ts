import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  layout("layouts/auth-layout.tsx", [
    route("login", "routes/auth/login.tsx"),
    route("register", "routes/auth/register.tsx"),
    route("forgot-password", "routes/auth/forgot-password.tsx"),
  ]),
  route("app", "layouts/customer-layout.tsx", [
    index("routes/customer/home.tsx"),
    route("orders", "routes/customer/orders.tsx"),
    route("orders/new", "routes/customer/new-order.tsx"),
    route("orders/:orderId", "routes/customer/order-detail.tsx"),
    route("complaints", "routes/customer/complaints.tsx"),
    route("complaints/new", "routes/customer/new-complaint.tsx"),
    route("complaints/:complaintId", "routes/customer/complaint-detail.tsx"),
    route("chat", "routes/customer/chat.tsx"),
    route("profile", "routes/customer/profile.tsx"),
  ]),
  route("admin", "layouts/admin-layout.tsx", [
    index("routes/admin/dashboard.tsx"),
    route("orders", "routes/admin/orders.tsx"),
    route("orders/:orderId", "routes/admin/order-detail.tsx"),
    route("production", "routes/admin/production.tsx"),
    route("production/:orderId", "routes/admin/production-detail.tsx"),
    route("customers", "routes/admin/customers.tsx"),
    route("customers/:customerId", "routes/admin/customer-detail.tsx"),
    route("payments", "routes/admin/payments.tsx"),
    route("payments/:orderId", "routes/admin/payment-detail.tsx"),
    route("complaints", "routes/admin/complaints.tsx"),
    route("complaints/:complaintId", "routes/admin/complaint-detail.tsx"),
    route("services", "routes/admin/services.tsx"),
    route("reports", "routes/admin/reports.tsx"),
    route("settings", "routes/admin/settings.tsx"),
  ]),
] satisfies RouteConfig;
