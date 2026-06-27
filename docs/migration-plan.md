# Kế hoạch Migration & Hợp nhất Core API (Phase 0)

Tài liệu này phân tích hiện trạng và lên lộ trình hợp nhất backend/database của 2 ứng dụng **Sale Manager** và **Stock Manager** vào hệ thống **Core API** trung tâm.

## 1. Phân tích Route API

### 1.1. Stock Manager (Frontend Vite + Legacy Express)
**Các route đã gọi sang Core API (`/core-api`):**
- `/auth`
- `/users`
- `/roles`
- `/permissions`
- `/products` (Frontend Stock gọi là items, đã alias về products)
- `/customers`
- `/companies`
- `/audit-logs`
- `/backups`
- `/suppliers` (Đã chuyển sang Core API)
- `/locations` (Đã chuyển sang Core API)
- `/inventory` (Đã chuyển sang Core API)
- `/goods-receipts` (Đã chuyển sang Core API)
- `/goods-issues` (Đã chuyển sang Core API)
- `/processing-orders` (Đã chuyển sang Core API)
- `/stocktakes` (Đã chuyển sang Core API)
- `/damage-reports` (Đã chuyển sang Core API)
- `/adjustments` (Đã chuyển sang Core API)

**Các route vẫn đang gọi Legacy Express (`/api`):**
- `/reports` (bao gồm export / dashboard)

### 1.2. Sale Manager (Next.js)
**Các route đang dùng API nội bộ (`/api/...`):**
- `auth` (NextAuth)
- `customers`
- `dashboard`
- `opportunities`
- `orders`
- `products`
- `quotes`
- `reports`
- `settings`
- `tasks`
- `teams`
- `trips`
- `upload`
- `users`

---

## 2. Phân tích Schema (Bảng / Model)

### 2.1. Các bảng trùng lặp (Overlap Models)
1. **User**: Có mặt ở cả 3 project.
2. **Customer**: Có mặt ở cả 3 project.
3. **Product / Item**: Core & Sale dùng `Product`, Stock dùng `Item`.
4. **AuditLog**: Có mặt ở cả 3 project.

### 2.2. Đề xuất Mapping Schema
- **User (Sale/Stock) ➔ Core User**:
  - Tích hợp thêm các trường của Sale: `status`, `avatar`, quan hệ với `Team` (cần tạo bảng `Team` ở Core).
  - Ánh xạ `role` (chuỗi) sang hệ thống RBAC của Core API (`UserRole` / `Role`).
- **Customer (Sale/Stock) ➔ Core Customer**:
  - Giữ các trường hiện có ở Core.
  - Bổ sung các trường CRM của Sale: `type`, `contactPerson`, `province`, `source`, `assignedToId`, `status`, `productNeeds`, `estimatedArea`, `estimatedBudget`, `nextFollowUpDate`.
  - Có thể để các trường này là optional (`?`) để không ảnh hưởng đến Stock.
- **Product (Sale) + Item (Stock) ➔ Core Product**:
  - Gộp chung `Product` và `Item` thành một bảng `Product` duy nhất ở Core để dùng chung danh mục.
  - Mở rộng model `Product` của Core thêm các thuộc tính vật lý của kính (Stock): `glassType`, `thickness`, `color`, `standardSize`, `lengthMm`, `widthMm`, `areaM2`, `minStock`, `supplierId`.
  - Các trường này set mặc định hoặc optional cho các loại sản phẩm không phải kính (ví dụ phụ kiện của Sale).

---

## 3. Các rủi ro (Risks & Blockers)

1. **Khác biệt về định dạng khóa chính (ID Type):**
   - Core API: dùng `UUID` (String).
   - Sale Manager: dùng `CUID` (String).
   - Stock Manager: dùng `Int` (Auto-increment).
   - *Rủi ro*: Frontend của Stock đang xử lý ID là `number`. Khi chuyển sang Core API (String UUID), frontend sẽ vỡ nếu có strict type check (TypeScript) hoặc các phép so sánh `===`. Cần có bước normalize data ở frontend.
   
2. **Hệ thống Xác thực (Auth) khác nhau:**
   - Core API: `JWT` tự build.
   - Sale Manager: `NextAuth.js` (dùng session/JWT chuẩn riêng).
   - Stock Manager: `JWT` lưu localStorage.
   - *Giải pháp*: Phase 5 cần xây dựng một Auth Bridge hoặc custom credential provider cho NextAuth để verify JWT qua Core API.

3. **Cơ sở dữ liệu (Database Provider):**
   - Core API: `PostgreSQL`.
   - Sale & Stock: `SQLite`.
   - *Lưu ý*: Việc migration dữ liệu không thể dùng script Prisma đơn giản, cần viết script ETL thủ công để map ID và di chuyển data.

4. **Chênh lệch cấu trúc Product / Item:**
   - Việc gom `Item` (Stock) vào `Product` (Core) sẽ tạo ra một bảng khá to, tuy nhiên an toàn nhất vì không phá frontend. Nếu tách riêng bảng `InventoryItem`, sẽ cần sửa rất nhiều code mapping ở frontend.

---

## 4. Đề xuất tiến trình tiếp theo

Sẵn sàng bước vào **Giai đoạn 1**: Mở rộng Schema ở Core API để thêm các field cho Product và port toàn bộ Schema của phần Inventory (Suppliers, Locations, StockMovements...) từ Stock Manager sang Core API.
