# Prompt khởi động cho từng đợt

Mở một session mới trong thư mục `D:\Claude\learning`, dán nguyên một khối prompt bên dưới.
Session mới tự nạp `CLAUDE.md` và `docs/PRODUCT.md`, nên không cần giải thích lại từ đầu.

Thứ tự: **Lịch** (làm lúc nào cũng được) → **Đợt 1** (trước 3/10) → **Đợt 2** (trước 12/10) →
**Đợt 3** (trước 15/11). Mỗi đợt một session. Xong đợt nào, đánh dấu ở mục "Current status" trong
`CLAUDE.md`.

---

## Lịch — dọn Google Calendar

```
Dọn Google Calendar của tôi theo lịch tuần (mục 4) và các mốc (mục 5) trong docs/PRODUCT.md.

Cách làm:
1. Đọc lịch của tôi từ hôm nay tới 31/03/2027. Liệt kê theo nhóm: sự kiện lặp lại, sự kiện
   trùng hoặc trùng giờ với khung 9:30, sự kiện cũ đã qua, sự kiện có vẻ rác. Chưa sửa gì.
2. Đề xuất một bảng: giữ / sửa / xoá cho từng sự kiện, và danh sách sự kiện sẽ tạo mới.
   Chờ tôi duyệt từng nhóm rồi mới làm. Không xoá gì khi tôi chưa đồng ý.
3. Tạo mới, bắt đầu từ thứ 3 29/09/2026:
   - Sự kiện lặp "IELTS · Tổ Kiến" T2–T6 9:30–11:00, thông báo 15 phút trước (9:15 = ra khỏi nhà).
   - "IELTS · Altec" T7 9:30–11:00 và CN 9:30–12:00, thông báo 30 phút trước (9:00 ra khỏi nhà).
   - "Chốt kế hoạch tuần" CN 12:00–12:10.
   - Lớp học: T3 15:30–18:30, T4 12:00–15:00, T6 12:00–15:00 (hỏi tôi tên môn từng buổi).
   - Các mốc: thi thử 0 (3/10), midterm EFM (11/10), AFEP cá nhân (25/10), AFEP nhóm (8/11),
     thi thử 1 (15/11), final EFM + AFEP reflection (25/11), final BFN (2/12), thi thử 2 (12/12).
   - "Lên giường" 23:45 hằng ngày, thông báo đúng giờ.
4. Dùng màu khác nhau cho: IELTS, lớp học, hạn chót, thi thử.
5. Báo cáo bằng tiếng Việt: đã tạo / sửa / xoá những gì.

Giờ Asia/Ho_Chi_Minh. Không gửi lời mời cho ai.
```

---

## Đợt 1 — buổi IELTS trong app (hạn: trước thi thử 0, thứ 7 3/10)

```
Làm Đợt 1 trong docs/PRODUCT.md mục 8. Đọc kỹ mục 3 (định nghĩa đếm, bảng quy đổi band) và
mục 7 (quy trình Listening, 4 loại lỗi) trước khi thiết kế.

Cần có:
1. Màn Hôm nay: một nút lớn "Bắt đầu IELTS · <đề tiếp theo>", bấm là chạy đồng hồ phiên như
   hiện tại với area IELTS chọn sẵn (KHÔNG làm đồng hồ thứ hai). Dưới đó: "Khung 9:30: x/7 tuần
   này" theo định nghĩa ở mục 3.
2. Khi hoàn thành một phiên area IELTS, form kết thúc có thêm phần IELTS:
   - kỹ năng (Listening / Reading / Writing / Speaking), mặc định Listening;
   - đề: Cam (10–19), Test (1–4), Section (1–4, chọn được nhiều), tự điền đề tiếp theo;
   - số câu đã làm (tự tính từ số section × 10) và số câu đúng;
   - 4 bộ đếm lỗi ① Không nghe ra ② Viết sai ③ Bẫy/paraphrase ④ Lạc chỗ, mỗi bộ có một dòng
     định nghĩa. Chỉ lưu được khi tổng 4 bộ = số câu sai;
   - phút chép chính tả (chip 0 / 5 / 10 / 15).
   Cả phần này nhập được dưới 30 giây. Writing/Speaking: chỉ ghi band AI chấm (tuỳ chọn), không
   đếm lỗi.
3. Ghi kết quả thi thử (tối thiểu một form trong Ôn tập hoặc Cài đặt, tab IELTS là Đợt 2):
   ngày, nơi thi (ở nhà / trung tâm), L và R điểm thô /40 (tự quy ra band ≈), W và S band,
   overall tự tính theo quy tắc làm tròn ở mục 3.

Dữ liệu (theo CLAUDE.md):
- Bảng mới cần `this.version(n)` mới trong db.ts, khoá UUID (Dexie Cloud). Không sửa version cũ.
- Thêm vào backup.ts (xuất / nhập / kiểm tra từng dòng / ROW_RULES), cloudUpload, demoData
  (dữ liệu mẫu có tag [MẪU]).
- Logic thuần (quy đổi band, làm tròn overall, đề tiếp theo, đếm khung 9:30) để trong src/lib với
  test, gồm các trường hợp biên của bảng quy đổi và của khung 9:00–10:30.

Kiểm tra trước khi báo xong:
- npm run build (lint + test + type-check + build) qua.
- Trình duyệt thật trên localhost với dữ liệu giả: chạy trọn một phiên IELTS → nhập điểm và lỗi →
  thấy "Khung 9:30" tăng. Kiểm 390 / 768 / 1280 px, sáng / tối, cỡ hiển thị 100 / 150%.
- Không động vào Dự đoán / Thí nghiệm (đó là Đợt 2).

Giải thích từng bước ngắn gọn bằng tiếng Việt. Có quyết định nào PRODUCT.md chưa trả lời thì hỏi
tôi trước khi làm. Xong thì cập nhật CLAUDE.md (status + quy tắc mới), rồi commit và push lên main
để deploy, kiểm tra production đã lên bản mới, báo cáo: đã làm gì, kiểm tra ra sao, còn giới hạn gì.
```

---

## Đợt 2 — đếm ngược, dời khung, tab IELTS (hạn: trước 12/10)

```
Làm Đợt 2 trong docs/PRODUCT.md mục 8. Đợt 1 đã xong (xem CLAUDE.md "Current status"); đọc
code Đợt 1 trước để dùng lại, không làm trùng.

Cần có:
1. Đếm ngược tới kỳ thi thử kế tiếp trên màn Hôm nay, thay banner lịch 12 tuần cũ. Thay
   src/config/protocolPhases.ts bằng danh sách mốc ở mục 5 (vẫn là MỘT file để sửa lịch). Tuần có
   thi môn (11/10, 25/11, 2/12) thì Hôm nay nhắc "tuần nhẹ nhịp: giữ sàn 30 phút Listening".
   Kiểm tra mọi chỗ đang dùng BASELINE_FROM / BASELINE_TO và findProtocolPhase trước khi đổi.
2. Dời khung: sau 10:30 mà hôm nay chưa có phiên IELTS, Hôm nay hiện một dòng "Khung 9:30 chưa
   bắt đầu — dời sang lúc nào?" với chip giờ (sau giờ học / tối / mai). Lưu lần dời và lý do
   (chip: việc gấp của trường / công ty / việc riêng / khác). Không bao giờ hiện lời trách.
   Đếm số lần dời mỗi tuần.
3. Tab IELTS thay tab Dự đoán trên thanh điều hướng: đề tiếp theo + nút bắt đầu, lịch sử buổi
   luyện, kết quả thi thử, tổng lỗi theo 4 loại trong 4 tuần gần nhất.
4. Chuyển Dự đoán và Thí nghiệm vào Cài đặt → "Công cụ khác". Dữ liệu giữ nguyên, vẫn mở và dùng
   được, vẫn nằm trong sao lưu. Không xoá bảng, không migration phá dữ liệu (luật số 4).

Theo đúng mọi quy tắc trong CLAUDE.md (bảng mới → version Dexie mới + backup + cloudUpload +
demoData; logic thuần có test; 44px; nhập < 30 giây; màu theo token cả hai theme).

Kiểm tra: npm run build qua; trình duyệt thật 5 tab ở 390 / 768 / 1280, sáng / tối, 100 / 150%;
giả lập giờ 10:45 chưa có phiên IELTS để thấy dòng dời khung; dữ liệu Dự đoán cũ vẫn mở được.

Giải thích ngắn bằng tiếng Việt; hỏi tôi khi PRODUCT.md chưa trả lời. Xong thì cập nhật CLAUDE.md,
commit và push lên main, kiểm tra production, báo cáo kết quả và giới hạn.
```

---

## Đợt 3 — Thống kê theo kết quả, chốt kế hoạch Chủ nhật, thẻ có nguồn (hạn: trước 15/11)

```
Làm Đợt 3 trong docs/PRODUCT.md mục 8. Đợt 1 và 2 đã xong; đọc code hiện có trước.

Cần có:
1. Thống kê: đầu trang là biểu đồ "giờ IELTS mỗi tuần" (cột) ghép với "điểm Listening" (đường:
   % đúng các buổi luyện, và band ≈ các lần thi thử), rồi xu hướng 4 loại lỗi theo tuần, rồi số
   ngày giữ khung 9:30 mỗi tuần. Các biểu đồ cũ (deep work theo area, ngủ và deep work, tỷ lệ nhớ)
   giữ nguyên, xếp bên dưới. Trung thực thống kê: n nhỏ thì ghi "sơ bộ (n=…)", không p-value.
   Biểu đồ nằm trong DashboardCharts.tsx (lazy), chữ trục qua px() theo cỡ hiển thị.
2. Chốt kế hoạch Chủ nhật thay "Tổng kết tuần" (giữ dữ liệu tổng kết cũ, vẫn xem được):
   - Nhìn lại, chỉ bấm chạm: khung 9:30 x/7, giờ IELTS / 11.5, loại lỗi nhiều nhất, số lần dời.
   - Một điều chỉnh cho tuần tới (giữ cơ chế oneChange + lastChangeResult đã có).
   - Chốt tuần tới: đề tiếp theo (app đề xuất, tôi bấm đồng ý), deadline 7 ngày tới, tuần nhẹ nhịp.
   Làm xong trong khoảng 10 phút, chủ yếu bằng chạm.
3. Thẻ ôn có nguồn: IELTS (lỗi nghe / từ vựng), Writing (lỗi AI chỉ ra), góp ý của manager. Lọc
   được theo nguồn trong Kho thẻ. Tạo nhanh một thẻ từ màn kết thúc buổi IELTS.
4. Nút "Sao chép prompt chấm Writing": chép vào clipboard một prompt yêu cầu AI chấm theo 4 tiêu
   chí band descriptor và liệt kê lỗi lặp lại. App không gửi gì lên mạng.

Theo đúng mọi quy tắc trong CLAUDE.md. Kiểm tra: npm run build; trình duyệt thật với dữ liệu mẫu
nhiều tuần (thêm vào demoData nếu thiếu); 390 / 768 / 1280, sáng / tối, 100 / 150%; đo tương phản
chữ biểu đồ >= 4.5:1.

Giải thích ngắn bằng tiếng Việt; hỏi tôi khi PRODUCT.md chưa trả lời. Xong thì cập nhật CLAUDE.md,
commit và push lên main, kiểm tra production, báo cáo kết quả và giới hạn.
```

---

## Khi cần điều chỉnh kế hoạch

```
Tôi muốn đổi kế hoạch trong docs/PRODUCT.md: <viết điều muốn đổi>.
Đọc lại mục liên quan, chỉ ra điều này ảnh hưởng tới những đợt build nào và thước đo nào, đề xuất
cách sửa tài liệu, chờ tôi đồng ý rồi mới sửa. Chưa sửa code.
```

Dùng prompt này sau thi thử 2 (12/12) để quyết định giữ tháng 3 hay dời sang tháng 5–6.
