# Cẩu Đạo Ký — Frontend

Next.js 15, React 18, TypeScript, Tailwind; output standalone. Giao diện Việt ngữ cho game ở `../BE`. Source đã đổi sản phẩm; trạng thái triển khai production phải được xác nhận riêng.

PostCSS được cố định ở `8.5.28` và dùng cùng phiên bản qua npm override để vá các lỗi đọc source map của dependency bắc cầu mà không nâng Next sang major mới. Giữ `package-lock.json`; không bỏ override hoặc dùng `npm audit fix --force` thay cho đánh giá tương thích. `npm audit` toàn bộ dependency trả 0 lỗ hổng tại lần kiểm chứng 2026-09-13.

## Chạy cục bộ

```sh
cp .env.example .env.development.local
# Chỉnh API_INTERNAL_URL và APP_PUBLIC_URL theo cổng backend/frontend thực tế.
npm ci
npm run dev
```

Mặc định frontend ở `http://localhost:3000`, backend ở `http://127.0.0.1:8080`. Không ghi đè `.env.local` cũ có thể chứa bí mật. Không dùng `NEXT_PUBLIC_*` cho backend hoặc merchant secrets.

```sh
npm run typecheck
npm run build
npm start
```

## Đường dẫn chính

- `src/game/Shell.tsx`: phiên, điều hướng, snapshot và khôi phục ý định đang chờ.
- `src/game/views/`: động phủ, cơ duyên/NPC, chiến đấu, tông môn, sưu tầm/mùa, cửa hàng và quản trị.
- `src/game/CosmeticArt.tsx`: cùng một hình cho xem trước, sở hữu, trang bị và hồ sơ công khai.
- `src/game/api.ts`: access token chỉ ở bộ nhớ, refresh cookie HttpOnly.
- `src/app/api/v1/[...path]/route.ts`: proxy runtime cùng origin; chuyển cookie auth từ `/v1/auth` sang `/api/v1/auth`, giữ raw body/header chữ ký SePay và header MFA.
- `src/game/PWA.tsx`, `public/sw.js`, `public/offline.html`: cài ứng dụng và trang mất mạng trung thực.

## Bảo toàn tiến trình

Máy chủ sở hữu toàn bộ kết quả. Trước khi gửi action, frontend ghi `{request_id,type,payload}` vào localStorage theo tài khoản, không ghi access token/mật khẩu. Nếu mất phản hồi sau commit, marker tồn tại qua tải lại/đóng tab; thao tác khác bị chặn đến khi người chơi kiểm tra lại **cùng UUID**. Không tạo UUID mới để thử một giao dịch chưa rõ kết quả.

Service worker chỉ cache tài nguyên tĩnh; không cache API, token hoặc HTML trang riêng tư. Mất mạng không giả nhận thưởng: trang offline giải thích tiến trình máy chủ và tích lũy ngoại tuyến 24 giờ. Bản tin/bảng xếp hạng chỉ hiện dữ liệu người chơi thật đủ quyền riêng tư, không seed nhân vật giả.

Trong Tông môn & giang hồ, **Ẩn bản tin** (`social.mute`, `social.unmute`, payload `{user_id}`) chỉ lọc bài của tác giả với người xem đó, trước giới hạn 50 bài; không đổi hồ sơ, bảng vàng hay đồng thuận đấu pháp. Danh sách riêng tư tối đa 100 ID lấy từ `GET /game/social` trường `muted`, tách khỏi `blocked`, và có thể bỏ ẩn ngay cả khi tác giả chuyển hồ sơ riêng tư. **Chặn** vẫn áp dụng giữa hai bên. Các thao tác này dùng cùng cơ chế action/khôi phục ý định ở trên.

## Production

Image build từ `deployment/Dockerfile`; CI publish commit tag và báo immutable digest, không tự deploy. Dùng workflow deploy thủ công phía BE với cả hai digest.

Runtime: `API_INTERNAL_URL=http://coduyen-api:8080`, `APP_PUBLIC_URL=https://coduyen.net`. Nginx phải chuyển `/api/v1/` tới frontend **không bỏ prefix** để áp dụng origin/cookie adapter; không chuyển tuyến này thẳng tới Go. Secrets ở backend, không bake vào bundle.

Cửa hàng và quyền quản trị nhận trạng thái thật từ backend. Thanh toán bị đóng khi merchant configuration chưa đủ hoặc `GAME_PAYMENTS_ENABLED=false`. Không coi trang xem trước/kiểm thử webhook tổng hợp là bằng chứng đã thu hoặc hoàn tiền thật. Điều kiện pháp lý, danh tính merchant và truy cập production phải do operator cung cấp và xác minh trước khi mở thu tiền.
