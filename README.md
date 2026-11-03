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

### Tu luyện nhàn rỗi + minh họa 2D

Catalog `2026-09-20.1` chuyển trọng tâm sang động phủ và lịch luyện, thay toàn bộ giao diện chọn chiêu từng lượt/Phaser/Blender cũ. `Home.tsx` hiển thị tu vi đã lưu và phần đang tích lũy ước tính; thu nạp hoặc đột phá quyết toán trên máy chủ, tối đa 24 giờ.

`Combat.tsx` có bốn bí cảnh, tám thủ lĩnh mở đường, chuẩn bị công pháp và lò luyện. Khiêu chiến gửi đúng một `combat.challenge {id,use_items}`; máy chủ tự thi triển bộ công pháp, chốt kết quả, vật phẩm và thưởng trong một giao dịch. Trận đang đánh của save cũ được tiếp tục từ trạng thái đã lưu, không khởi động lại miễn phí. Không còn API công khai `combat.start`, `combat.turn`, `combat.flee`.

`AutoBattle.tsx` chỉ trình diễn log đã lưu: tạm dừng, tốc độ ×1/×2, bỏ qua và xem lại không gửi action. Sinh lực lấy từ sự kiện thật, không tự mô phỏng sát thương. Tự dùng đan phù mặc định tắt; khi bật, máy chủ ưu tiên giải khóa khí/hồi máu/giải trạng thái rồi hộ giáp hoặc tăng công, tối đa hai vật phẩm có sẵn.

Sau khi vượt thủ lĩnh và đủ cảnh giới, `combat.expedition {id}` chốt bộ nhân vật để luyện công. Mỗi 5 phút là một trận thực sự, tối đa 8 giờ/96 trận chờ thu. `combat.harvest {}` nhận các chu kỳ hoàn tất, giữ thời gian lẻ; mỗi ba trận thắng nhận một nguyên liệu vùng. `combat.return {}` thu phần hoàn tất rồi dừng; xuất hành lại mới dùng build đã sửa. GET không tự cộng thưởng. Không dùng đan phù, tăng thuần thục, cấp vé hay tăng chiến tích từ farm offline.

`InkScene.tsx`, `ink-scene.css`, `public/art/ink/*.svg` là minh họa vector tự vẽ: bốn cảnh, bốn đạo tu, sáu nhân vật và mười boss. Không dùng tài nguyên trích từ Nhất Niệm Tiêu Dao. Cảnh tĩnh tu có đài sen/sương; chiến đấu có chuyển động ra đòn, trúng đòn và số sát thương từ log. `prefers-reduced-motion` tắt chuyển động; các nút và chữ vẫn là HTML sử dụng được bằng bàn phím. Không còn dependency Phaser hoặc atlas low-poly cũ.

Đợt đồ họa Kiếm tu `2026-10-04`: `sword-standing.svg` (600×1000) và `sword-seated.svg` (600×680) thay riêng nhân vật người chơi theo đạo kiếm. Hai tư thế dùng cùng khuôn mặt, tóc búi/trâm đồng, áo ngoài ngà và áo trong xanh ngọc; các nhóm SVG tách tóc, thân áo, tay và phụ kiện để sửa hình độc lập. `Cultivator` dùng ảnh đứng ở chiến đấu, giang hồ và thẻ đạo tu; ảnh ngồi ở động phủ. Nhánh có `person` vẫn dùng hình NPC cũ; ba đạo tu khác, boss, cảnh và gameplay không đổi. Tổng hai SVG là 23.355 byte, không thêm dependency hoặc hiệu ứng.

Đã kiểm tra bản này bằng `npm run build`, `xmllint --noout` và Chromium local ở 1440×1000/390×844: xem động phủ, chiến báo, giang hồ và thẻ Kiếm tu; cả hai ảnh tải/giải mã được, các màn đã xem không tràn ngang. Replay vẫn chạy với ảnh mới; khi bật `prefers-reduced-motion`, chuyển động cảnh dừng. Khoảng replay được quan sát không gửi action. Đây là thay hình tĩnh, chưa làm động tác theo khớp, sửa Hộ Sơn hoặc dàn lại sân đấu; nhân vật trong cảnh chiến đấu mobile vẫn nhỏ. Chưa kiểm tra điện thoại vật lý và chưa triển khai production.

Tiềm năng phân lại miễn phí, ba ô trang bị, thuần thục và công thức chế tạo/cường hóa giữ nguyên hợp đồng backend. `Collection.tsx` giải thích cùng vòng nguyên liệu → luyện đồ → chuẩn bị → lịch luyện. Hình ảnh là art direction 2D vector hiện tại, **không phải khẳng định chất lượng asset/animation ngang một game thương mại đã hoàn thiện**.

Đã chạy luồng local bằng tài khoản mới không cấp sẵn chỉ số: thắng boss đầu → xuất hành → thu 3 chu kỳ (9 thạch, 6 tu vi, 1 dược thảo) → dùng tổng 2 dược thảo và 40 thạch luyện Hồi Nguyên Đan. Chỉ thời điểm xuất hành/quyết toán của chính tài khoản thử được lùi 15 phút để kiểm tra offline; không giả chiến thắng hoặc thưởng. Đổi tiềm năng khi đang đi không đổi build chốt; trở về/xuất hành lại đổi HP 120→156, công 15→19. Bản thay đổi này chỉ chạy local, chưa triển khai production.

### Vượt ải Thanh Vân

Catalog `2026-10-03.1`: Bí cảnh mở tab **Vượt ải** trước; lịch luyện nằm trong **Luyện công**. Chọn Trư Yêu/Hộ Sơn, đọc hai chu kỳ thường/cuồng nộ, sửa và lưu tiềm năng/công pháp/trang bị trước khi đánh. Bản nháp chặn vào trận; học công pháp không tự trang bị. Nút đánh nằm ngay sau lựa chọn ải, không bắt cuộn hết mô tả đối thủ trên mobile.

**Đánh thử** gửi `combat.practice {id}`: không thưởng, không tiêu đan phù, không tăng thuần thục hoặc mở ải. Thắng thật Trư Yêu mới mở Hộ Sơn; thua Thanh Vân được thử lại ngay. Sau thắng thật vẫn có cooldown, nhưng còn đánh thử được. Chiến báo có sát thương đòn/trạng thái, chiêu mạnh nhất, số lần thực sự thi triển và nhịp từng hiệp; nút chỉnh chuẩn bị quay lại bộ hiện tại, nút thử lại chỉ hiện khi hợp lệ.

Đã chơi local bằng nhân vật Kiếm tu mới, không sửa DB/tặng tài nguyên: Trư Yêu thắng; bộ ban đầu thua Hộ Sơn, đối thủ còn 65/145 HP. Học Thiết Bố Sam, chế tạo/trang bị Thạch Châu và dùng bộ Thiết Bố Sam → Thanh Phong Kiếm: 4 Căn Cốt vẫn thua; đổi miễn phí thành 2 Căn Cốt + 2 Linh Khí thắng sau 9 hiệp, còn 13/156 HP, vẫn Luyện Khí. Cả hai trận tập so sánh không tăng thuần thục. Khiêu chiến thật bằng bộ thắng mở ải và nhận 75 thạch, 37 tu vi, 1 vé lần đầu, 1 dược thảo, 15 kinh nghiệm mùa. Chưa có kiểm chứng retention hoặc cân bằng dài hạn; chưa triển khai thay đổi này lên production.

Kiểm tra bản cuối: `npm run build` và backend `go test -race ./...` với PostgreSQL local đều qua. Chromium 1440×1000 và 390×844: thử luyện, chỉnh chuẩn bị, xem từng hiệp, lọc lịch sử tập luyện và tải lại tiến trình; không tràn ngang ở các màn đã xem. Tạm dừng/xem lại/bỏ qua log không gửi action. Chưa kiểm tra điện thoại vật lý. Kết quả 13 HP ở trên dùng công pháp bậc 1; sau khi trận thật nâng Thanh Phong Kiếm lên bậc 2, cùng bộ đã thua một trận tập vì chuyển cuồng nộ sớm hơn. Không coi bộ mẫu là công thức thắng mọi bậc; đây là điểm cân bằng cần đánh giá cùng các build khác.


## Bảo toàn tiến trình

Máy chủ sở hữu toàn bộ kết quả. Trước khi gửi action, frontend ghi `{request_id,type,payload}` vào localStorage theo tài khoản, không ghi access token/mật khẩu. Nếu mất phản hồi sau commit, marker tồn tại qua tải lại/đóng tab; thao tác khác bị chặn đến khi người chơi kiểm tra lại **cùng UUID**. Không tạo UUID mới để thử một giao dịch chưa rõ kết quả.

Service worker chỉ cache tài nguyên tĩnh; không cache API, token hoặc HTML trang riêng tư. Mất mạng không giả nhận thưởng: trang offline giải thích tiến trình máy chủ và tích lũy ngoại tuyến 24 giờ. Bản tin/bảng xếp hạng chỉ hiện dữ liệu người chơi thật đủ quyền riêng tư, không seed nhân vật giả.

Trong Tông môn & giang hồ, **Ẩn bản tin** (`social.mute`, `social.unmute`, payload `{user_id}`) chỉ lọc bài của tác giả với người xem đó, trước giới hạn 50 bài; không đổi hồ sơ, bảng vàng hay đồng thuận đấu pháp. Danh sách riêng tư tối đa 100 ID lấy từ `GET /game/social` trường `muted`, tách khỏi `blocked`, và có thể bỏ ẩn ngay cả khi tác giả chuyển hồ sơ riêng tư. **Chặn** vẫn áp dụng giữa hai bên. Các thao tác này dùng cùng cơ chế action/khôi phục ý định ở trên.

## Production

Runtime: `API_INTERNAL_URL=http://coduyen-api:8080`, `APP_PUBLIC_URL=https://coduyen.net`. Nginx phải chuyển `/api/v1/` tới frontend **không bỏ prefix** để áp dụng origin/cookie adapter; không chuyển tuyến này thẳng tới Go. Secrets ở backend, không bake vào bundle. Bản đang chạy tại `https://coduyen.net` dùng đúng cấu hình này; cookie refresh được ghi `Secure`, `HttpOnly`, phạm vi `/api/v1/auth`.

Cửa hàng và quyền quản trị nhận trạng thái thật từ backend. Thanh toán bị đóng khi merchant configuration chưa đủ hoặc `GAME_PAYMENTS_ENABLED=false`. Không coi trang xem trước/kiểm thử webhook tổng hợp là bằng chứng đã thu hoặc hoàn tiền thật. Điều kiện pháp lý, danh tính merchant và truy cập production phải do operator cung cấp và xác minh trước khi mở thu tiền.

## Đạo Tràng Online (trang chủ `/`)

Phòng tu luyện chung 2.5D (Three.js, camera nghiêng cố định) là **trang chủ**: không cần đăng nhập/đăng ký, khách nhận vé một lần qua `POST /api/v1/room/guest`, sau đó mở WebSocket `/v1/room/ws?ticket=…`; tiến độ gắn với đạo tịch lưu trên máy. Giao thức chính thức: `BE/internal/room/README.md`. `/dao-trang` chuyển hướng 308 về `/` (giữ phần `#dt=` của liên kết chuyển máy cũ). Game idle cũ có tài khoản đã đóng băng: không còn route công khai, `src/game` chỉ còn phục vụ `/admin`.

- Code: `src/room/` (`RoomClient` socket + trạng thái, `RoomScene` Three.js, `RoomView` giao diện).
- Next route handler **không proxy được WebSocket**. Dev: đặt `NEXT_PUBLIC_ROOM_WS_URL=ws://localhost:8080/v1/room/ws` (xem `.env.example`). Production: Nginx phải route `/v1/room/ws` thẳng tới dịch vụ Go (kèm `Upgrade`/`Connection`, `proxy_read_timeout` đủ dài) trên cùng origin; khi đó không cần đặt biến.
- Không thêm Three.js vào các màn hình game cũ; `RoomEntry` nạp `RoomView` bằng `dynamic(..., { ssr: false })`.
- Âm thanh twist và tiếng chiêng cúng dường: `public/sfx/*.mp3`, dựng bằng `scripts/build_sfx.sh` (cần `ffmpeg` có `libmp3lame`) từ bản ghi CC0 hoặc tự tổng hợp — nguồn và giấy phép từng file ở `public/sfx/SOURCES.txt`. Chỉ thêm âm thanh CC0 hoặc tự tổng hợp, và ghi nguồn vào file đó. Phát qua Web Audio sau cú bấm "Vào Đạo Tràng" (trình duyệt chặn âm thanh trước thao tác người dùng); người chơi tắt/bật bằng nút 🔊.
- Cúng dường: `OfferingSheet.tsx` (lễ vật lấy từ `welcome.offerings`; `payments=false` thì nút ghi "Sắp mở"), tạo đơn/hỏi trạng thái qua `RoomClient.createOffering/offeringStatus/recentOfferings`; tin `offering` → banner, mưa lễ vật, chiêng, cộng tu vi, `RoomScene.setPatron` (huy hiệu + mây). API: `BE/internal/room/README.md`.
- Nhạc nền "động phủ" + ảnh trang trí cúng dường (băng rôn tím tử khí, nhang linh khí, cuộn sổ, linh liên/lá ngọc rơi): `public/chanh-dien/`, **phái sinh** từ dự án MIT "Chánh Điện Tịnh Tâm" — dựng lại bằng `scripts/build_art.sh` (cần ImageMagick 7 + ffmpeg; tự tải bản gốc ở commit đã ghim vào `.runtime/art-src/`, đổi màu/lật/cắt ảnh, làm chậm + vang + trộn gió cho nhạc). **Phải giữ `LICENSE` trong thư mục đó**; bảng gốc → đã sửa gì, và cách gỡ ở `public/chanh-dien/SOURCES.txt`. Nhạc nền (`Sfx.startMusic/stopMusic`) phát khi vào phòng, theo nút 🔊, `MUSIC_VOLUME` 0,45 (≈7 dB dưới hiệu ứng).
- Dễ hiểu cho người mới: `Coach.tsx` là hướng dẫn 4 bước lần đầu (ngồi → hiểu tu vi → chào → mục tiêu), tự sang bước khi người chơi làm đúng việc, lưu `dt:guide=done` trong `localStorage`; `HelpSheet.tsx` (nút ❓) giải thích mọi luật bằng lời thường, kèm bảng cấp bậc và "ngồi một mình mất bao lâu". Thêm luật mới thì cập nhật cả hai, dùng lời thường thay cho thuật ngữ.
- Linh mạch tụ khí: tin `gather` → thanh nhỏ trong ô tu vi (`dt-gather`): pha `fill` hiện % theo `p/goal`, pha `bless` hiện "×mult · còn m:ss" đếm ngược tại máy từ `left_s` và phát sáng; `text` (chỉ có khi đổi pha) → banner + dòng nhật ký.
- Thiên Đạo hỏi: tin `poll` → thẻ bỏ phiếu (`dt-poll`; điện thoại: nằm trên khung trò chuyện, desktop: nổi giữa phía trên thanh dưới) với số phiếu trực tiếp và thanh thời gian từ `left_ms`; lựa chọn của mình chỉ nhớ tại máy, bấm lại lựa chọn khác là đổi phiếu (`RoomClient.vote`). `poll_end` → banner + nhật ký + hiệu ứng: `rain` mưa 💧✨ và cộng `qi`, `chicken` các `targets` nhảy (`RoomScene.playAnim`) + tiếng gà, `dance` mọi người xoay, `song` tiếng chiêng, `gather` không thêm gì. `prefers-reduced-motion` tắt mưa và động tác.
- Chặn & báo cáo: chạm tên người khác trong khung trò chuyện → 🔇 Chặn (danh sách id kết nối chỉ trong phiên, ẩn bong bóng và dòng chat của họ; chạm lại để bỏ chặn) hoặc 🚩 Báo cáo (`RoomClient.report`, lý do `chat`/`name`/`spam`; `report_ok` → toast; lỗi `report_dup`/`report_rate`/`report_bad` → câu tiếng Việt trong `RoomClient.errMessage`). Lỗi `chat_banned` hiện nguyên `msg` của máy chủ dưới ô chat.
- Tự nối lại: phiên đã có `welcome` mà rớt mạng (`end` loại `network`) thì `RoomClient` không kết thúc mà phát `reconnecting {attempt, delayMs}`, thử lại sau 1/2/4/8/16 s ±30% (tối đa 5 lần, thử ngay khi trình duyệt báo `online`), mỗi lần lấy vé mới với cùng đạo hiệu/màu áo; `welcome` mới → `RoomView` dựng lại cảnh từ đầu (giữ nhật ký chat) và ngồi lại bồ đoàn cũ. Hết lượt → `end` như cũ. Bị mời ra/afk/thay thế/đầy phòng… kết thúc ngay; "Rời đi" (`disconnect`) không bao giờ nối lại.
