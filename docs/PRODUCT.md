# Learning OS — Vision, mission, scope

Chốt qua buổi phỏng vấn ngày 27/09/2026. Đây là **nguồn sự thật về việc app nên làm gì**.
Mọi tính năng mới phải trả lời được: *nó giúp phần nào trong "Vấn đề" bên dưới?*
Không trả lời được thì không build.

---

## 1. Vấn đề

Tự chẩn đoán của chủ app (50% A · 40% D · 10% B):

- **A — Không bắt đầu được.** Không ai giao việc thì thời gian trôi vào manhwa, YouTube, LoL.
- **D — Không biết làm gì, lúc nào.** 3 môn học, IELTS, AFEP, việc công ty giành nhau → chữa cháy.
- **B — Không giữ được tập trung trong phiên.** Có, nhưng nhỏ.

Phát hiện then chốt: **việc người khác giao (có hạn, có người nhắc) thì làm đúng hạn. Việc tự giao
thì thất bại.** Việc tự giao duy nhất còn lại là **IELTS** — trường, AFEP và công ty đều đã có người
giao và hạn chót (báo cáo M&A thực chất là task công ty, sếp review).

Chuỗi phá khung giờ: ngủ 12–1h → dậy 7:30–8h → chiều buồn ngủ → "một ván LoL cho tỉnh" → thành
nhiều ván → lại ngủ muộn. Buổi tối (về nhà 6–7h, gym, nấu ăn tới 8:30) gần như không còn chỗ học.

> **Phát biểu vấn đề:** Tôi làm tốt việc người khác giao, nhưng thất bại ở việc tự giao (IELTS)
> vì không ai giao việc cụ thể và không ai theo dõi. App tồn tại để **đóng vai người giao việc**.

## 2. Vision và mission

- **Vision:** Mục tiêu tự đặt được làm đều đặn như việc có sếp giao — bắt đầu với IELTS 7.5.
- **Mission:** Mỗi sáng 9:30 app cho **đúng một việc tiếp theo và một nút bắt đầu**; mỗi buổi nó
  bắt **rút ra lỗi**; mỗi Chủ nhật nó cho thấy **thời gian bỏ ra có biến thành điểm hay không**.

Nguyên tắc thiết kế số 1: **"Không cần nhớ quy trình — mở app là thấy bước tiếp theo."**

## 3. Mục tiêu và thước đo

| Loại | Thước đo | Đích |
|---|---|---|
| **Kết quả chính** | IELTS overall (thi thật, tháng 3/2027) | **7.5** (vươn tới) · **7.0** (phải đạt) |
| Kết quả giữa chặng | Band các lần thi thử (bảng mục 5) | L 6.0 → 6.5 → 7.0 |
| **Lock-in (dẫn dắt)** | **Số ngày giữ khung 9:30 / 7 mỗi tuần** | ≥ 5/7 |
| Khối lượng | Giờ IELTS mỗi tuần | ~11.5 (tuần thi môn: sàn 30 phút Listening/ngày) |
| Chất lượng luyện | Số câu sai theo loại lỗi (Listening mục 7, Reading mục 7b) | loại lớn nhất giảm dần |
| Giấc ngủ | Lên giường trước 00:00 (check-in) | ≥ 5/7 |
| Phụ | Tài liệu thương vụ bao bì được manager chấp nhận | mỗi vòng góp ý ít lỗi lặp lại hơn |

Hiện trạng IELTS: **R 7.0 · L 5.5 · W 6.0 · S 6.0** (overall 6.0). 7.5 cần tổng ≥ 29.5, ví dụ
R 8.0 / L 7.5 / W 7.0 / S 7.0 → **Listening là đòn bẩy lớn nhất (+2.0).**

**Định nghĩa đếm (để mọi màn hình tính giống nhau):**
- **Giữ khung 9:30** = trong ngày có một phiên area **IELTS** bắt đầu từ **9:00 đến 10:30** và dài
  **≥ 45 phút**.
- **Đạt sàn** = tổng thời gian IELTS trong ngày **≥ 30 phút**, bất kể giờ nào.
- **Ngày đạt** = đạt sàn và không bỏ việc có hạn bên ngoài · **ngày tốt** = giữ khung 9:30.
- **Giờ IELTS mỗi tuần** = tổng phút các phiên area IELTS từ thứ 2 đến Chủ nhật.

**Quy đổi điểm thô → band** (bảng phổ biến, là **ước lượng**, luôn ghi "≈" trên màn hình). Chỉ quy
đổi khi làm đủ **40 câu**; làm 1–2 section thì hiện điểm thô và % đúng, không hiện band.
Giả định bạn thi **Academic** (Reading của General Training quy đổi khác).

| Band | Listening (/40) | Reading Academic (/40) |
|---|---|---|
| 9.0 | 39–40 | 39–40 |
| 8.5 | 37–38 | 37–38 |
| 8.0 | 35–36 | 35–36 |
| 7.5 | 32–34 | 33–34 |
| 7.0 | 30–31 | 30–32 |
| 6.5 | 26–29 | 27–29 |
| 6.0 | 23–25 | 23–26 |
| 5.5 | 18–22 | 19–22 |
| 5.0 | 16–17 | 15–18 |
| 4.5 | 13–15 | 13–14 |
| 4.0 | 10–12 | 10–12 |

Overall = trung bình 4 kỹ năng, làm tròn tới 0.5 gần nhất (x.25 lên x.5, x.75 lên số tròn kế tiếp).

**Thứ tự đề luyện:** Cam 10 → 14, trong mỗi cuốn Test 1 → 4. Listening: Section 1 → 4 (10 câu
mỗi section). Reading: Passage 1 → 3 (mặc định 13 / 13 / 14 câu, **sửa được** vì vài đề chia khác).
"Đề tiếp theo" tính **riêng cho từng kỹ năng** = phần ngay sau phần cuối cùng đã ghi của kỹ năng đó.

**Cổng quyết định 12/12:** thi thử 2 (trả tiền, ở trung tâm) dưới 6.5 overall → dời thi thật sang
tháng 5–6/2027 (phương án C). Dời vì có dữ liệu, không dời vì sợ trước.

## 4. Lịch tuần cố định (bắt đầu thứ 3, 29/09/2026)

Buổi sáng cả 7 ngày đều trống (lớp: T3 15:00 EFM, T4 12:00 AFEP, T6 12:00 BFN — mỗi buổi 3 tiếng).

| Ngày | Ra khỏi nhà | Khung IELTS | Nội dung |
|---|---|---|---|
| T2–T6 | 9:15 → Tổ Kiến | 9:30–11:00 | Listening + Reading (T2/T5) · Listening + Speaking (T3/T4/T6) |
| T7 | 9:00 → Altec | 9:30–11:00 | Listening + Reading |
| CN | 9:00 → Altec | 9:30–12:00, rồi **12:00 chốt kế hoạch tuần (10 phút)** | Writing hoặc trọn một đề |

Thức dậy 8:00 (bỏ mục tiêu 6:30). Tín hiệu bắt đầu đến từ **lịch + báo thức iPhone** (app không có
máy chủ nên không tự gửi thông báo được). Khung 9:30 **phải ra cafe** — ở nhà không tính.

## 5. Mốc học kỳ và thi thử

| Ngày | Sự kiện |
|---|---|
| 3–4/10 | Thi thử IELTS 0 — baseline, ở nhà, bấm giờ chuẩn |
| 11/10 | Midterm EFM (tuần này: chỉ sàn 30 phút Listening) |
| 25/10 | AFEP bản cá nhân + thuyết trình |
| 8/11 | AFEP bản nhóm + thuyết trình |
| 15/11 | Thi thử 1 — ở nhà (dời từ 7–8/11 vì trùng AFEP nhóm) |
| 25/11 | Final EFM + AFEP written reflection |
| 2/12 | Final BFN |
| 12–13/12 | **Thi thử 2 — trả tiền, ở trung tâm** · cổng quyết định |
| giữa T1 | Thi thử 3 — ở nhà |
| giữa T2 | **Thi thử 4 — trả tiền, ở trung tâm** |
| T3/2027 | Thi thật (IDP/BC) |

Đề luyện: **Cam 10–14** (80 section, đủ ~10 tuần). Tuỳ chọn mua 1 cuốn Cam 19 cho thi thử 1 và 3.

## 6. Luật (chốt khi đầu óc còn tỉnh)

**Ưu tiên khi việc giành nhau:**
1. Sàn IELTS: 30 phút Listening mỗi ngày, không bao giờ bằng 0.
2. Việc có hạn chót bên ngoài trong 72 giờ (trường, công ty, ngày thi).
3. Phần còn lại của khung IELTS.
4. Việc dài hạn.

- Task **gấp** (người khác đặt hạn, hạn **trong 48 giờ**) được dời khung IELTS — **dời, không xoá**:
  app hỏi "dời sang lúc nào?" và đếm số lần dời.
- Ngày giữ được 1+2 = **đạt**; giữ được 1–3 = **tốt**. Đếm ngày, không đếm chuỗi.
- **LoL là phần thưởng:** chỉ sau khi xong IELTS trong ngày, tối đa 2 ván, không vào ván mới sau 22:30.
- Buồn ngủ khi học → đi bộ 5 phút / rửa mặt / chợp mắt 15 phút, không mở LoL.
- Manhwa không mang lên giường.

## 7. Quy trình một buổi Listening (~40–45 phút)

1. Làm 1–2 section Cam, điều kiện thi, nghe một lần, chấm điểm thô.
2. Mở transcript, nghe lại chỗ sai, **phân loại từng câu sai** (hỏi theo thứ tự):

   | Câu hỏi | Loại |
   |---|---|
   | Nghe lại vẫn **không nhận ra từ đáp án**? | ① Không nghe ra |
   | Nghe ra nhưng **viết sai** (chính tả, số ít/nhiều, số liệu, quá số từ)? | ② Viết sai |
   | Viết/chọn **thông tin khác có trong bài** (bẫy, paraphrase)? | ③ Bẫy / paraphrase |
   | Không phải 3 loại trên (lỡ câu, lạc chỗ) | ④ Lạc chỗ |

3. Chép chính tả 5–10 phút một đoạn 1–2 phút **Vietnam Innovators Digest**.
4. Nghe rộng (phim, podcast) là phần thưởng, không tính giờ: xem không phụ đề trước, rồi phụ đề
   **tiếng Anh**.

Buổi chỉ tính **xong** khi tổng 4 loại lỗi = số câu sai.

## 7b. Buổi Reading

1. Làm 1–3 passage Cam, bấm giờ **20 phút mỗi passage**, chấm điểm thô.
2. Mở lại bài, **phân loại từng câu sai** bằng bộ lỗi **riêng của Reading** (hỏi theo thứ tự):

   | Câu hỏi | Loại |
   |---|---|
   | **Không kịp làm**, bỏ trống hoặc đoán bừa vì hết giờ? | Ⓐ Hết giờ |
   | **Không tìm ra đoạn** chứa đáp án (không nhận ra paraphrase)? | Ⓑ Không tìm ra chỗ |
   | Tìm đúng đoạn nhưng **hiểu sai nghĩa** (từ vựng, câu phức)? | Ⓒ Hiểu sai câu |
   | Hiểu đúng mà vẫn sai: **nhầm False / Not Given**, quá số từ, chép sai chính tả? | Ⓓ Sai logic / format |

3. Từ vựng mới gặp ở loại Ⓒ → thẻ ôn (Đợt 3 có nguồn thẻ riêng).

Giống Listening: chỉ tính **xong** khi tổng 4 loại = số câu sai. Hai bộ lỗi **không trộn**: thống kê
xu hướng lỗi hiển thị riêng Listening và Reading.

Writing/Speaking: 2 bài Writing mỗi tuần do AI chấm theo 4 tiêu chí band descriptor; Speaking ghi âm
Part 2–3 → bản chép lời → AI nhận xét. **Lỗi lặp lại → thẻ ôn.** Hiệu chỉnh độ lệch điểm AI bằng
điểm giám khảo ở thi thử 2 và 4.

## 8. Scope — build gì, theo thứ tự

Đồng hồ phiên **vẫn dùng chung cho mọi area** (Thống kê cần biết thời gian đi đâu). IELTS chỉ là
một area; khi phiên có area IELTS thì bước kết thúc có thêm phần IELTS.

**Đợt 1 — trước thi thử 0 (3/10)**
- Hôm nay: nút lớn "Bắt đầu IELTS · <đề tiếp theo>" (lối tắt chọn sẵn area IELTS) + "Khung 9:30:
  x/7 tuần này".
- Kết thúc phiên IELTS: kỹ năng, đề (tự gợi ý phần tiếp theo của kỹ năng đó), số câu đúng, 4 bộ đếm
  lỗi **theo kỹ năng** (Listening: mục 7; Reading: mục 7b; tổng phải khớp số câu sai), phút chép
  chính tả (chỉ Listening). Writing / Speaking: chỉ band AI chấm, tuỳ chọn. Nhập < 30 giây.
- Ghi kết quả thi thử: L/R điểm thô → band, W/S band, nguồn (ở nhà / trung tâm / AI).

**Đợt 2 — trước 12/10**
- Đếm ngược tới kỳ thi thử kế tiếp; thay lịch 12 tuần cũ (`protocolPhases.ts`) bằng mục 5.
- Luồng "dời khung" + đếm số lần dời.
- Tab **IELTS** thay tab Dự đoán; Dự đoán + Thí nghiệm chuyển vào Cài đặt → "Công cụ khác"
  (dữ liệu giữ nguyên, luật số 4).

**Đợt 3 — trước thi thử 1 (15/11)**
- Thống kê: đầu trang là **giờ IELTS/tuần (cột) + điểm Listening thô và band thi thử (đường)**, xu
  hướng 4 loại lỗi, số ngày giữ khung/tuần; các biểu đồ cũ giữ nguyên bên dưới.
- Chốt kế hoạch Chủ nhật (thay tổng kết tuần): nhìn lại bằng chạm → một điều chỉnh → chốt tuần tới
  (đề tiếp theo, deadline 7 ngày, tuần nhẹ nhịp).
- Thẻ ôn có nguồn: lỗi IELTS, lỗi Writing do AI chỉ ra, góp ý của manager.

**KHÔNG làm**
- Máy chủ / push notification (phá nguyên tắc dữ liệu không rời máy; iPhone giới hạn).
- Tính năng người đồng hành / chia sẻ tiến độ (chủ app muốn làm một mình).
- Phát triển thêm Dự đoán, Thí nghiệm, hình nền / YouTube.
- Chuỗi ngày (streak), huy hiệu, gamification.
- Quản lý dự án M&A (công ty đã có người giao và review).
- AI tự xếp lịch.

## 9. Việc chủ app cần tự làm

- [ ] Dọn Google Calendar theo mục 4 và 5 (làm cùng Claude, mọi xoá/tạo đều hỏi trước).
- [ ] Đặt báo thức 8:00 và thông báo 15 phút trước mỗi khung.
- [ ] Cài app vào Màn hình chính iPhone (không thanh địa chỉ; Safari không cho web khoá xoay).
- [ ] Chuẩn bị Cam 10–14 (bản giấy hoặc PDF hợp pháp) + audio.
- [ ] Đặt lịch thi thử trả tiền 12–13/12 ở trung tâm ngay khi có lịch.
- [ ] Đăng ký thi thật **sau cổng quyết định 12/12** (tránh mất phí dời lịch nếu phải chuyển sang T5–6).
