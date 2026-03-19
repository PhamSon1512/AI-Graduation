# 📚 HƯỚNG DẪN SỬ DỤNG HỆ THỐNG AI EXAM

> Tài liệu này giúp người dùng mới hiểu rõ vai trò, chức năng và cách sử dụng từng tính năng trong hệ thống AI Exam - Hệ thống thi trắc nghiệm thông minh ứng dụng AI.

---

## 📋 MỤC LỤC

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Các vai trò trong hệ thống](#2-các-vai-trò-trong-hệ-thống)
3. [Hướng dẫn cho Giáo viên (Teacher)](#3-hướng-dẫn-cho-giáo-viên-teacher)
4. [Hướng dẫn cho Học sinh (Student)](#4-hướng-dẫn-cho-học-sinh-student)
5. [Hướng dẫn cho Quản trị viên (Admin)](#5-hướng-dẫn-cho-quản-trị-viên-admin)

---

## 1. TỔNG QUAN HỆ THỐNG

**AI Exam** là hệ thống thi trắc nghiệm thông minh với các tính năng chính:

- **AI OCR**: Trích xuất câu hỏi từ ảnh/PDF/Word đề thi
- **AI Sinh đề**: Tự động tạo đề thi theo cấu hình
- **AI Gia sư**: Giải thích câu hỏi, phân tích điểm mạnh/yếu
- **Quản lý lớp học**: Giáo viên tạo lớp, học sinh đăng ký
- **Bài tập & Thi thử**: Giao bài tập, làm bài trực tuyến
- **Luyện tập**: Học sinh tự luyện theo chuyên đề

---

## 2. CÁC VAI TRÒ TRONG HỆ THỐNG

| Vai trò | Mô tả | Quyền chính |
|---------|-------|-------------|
| **Teacher** | Giáo viên | Tạo đề thi, quản lý lớp, giao bài tập, duyệt học sinh |
| **Student** | Học sinh | Làm bài, luyện tập, xem phân tích AI |
| **Admin** | Quản trị viên | Quản lý toàn hệ thống, duyệt đề thi |

---

## 3. HƯỚNG DẪN CHO GIÁO VIÊN (TEACHER)

### 3.1. Đăng nhập & Cập nhật thông tin

#### Đăng nhập
1. Mở trang chủ → Click **"Đăng nhập"**
2. Nhập **Email** và **Mật khẩu**
3. Click **"Đăng nhập"**
4. Hệ thống chuyển đến **Dashboard**

#### Cập nhật thông tin cá nhân
1. Đăng nhập → Click **Avatar** (góc phải) → **"Tài khoản"** hoặc **"Cài đặt"**
2. Chỉnh sửa **Họ tên**
3. Click **"Lưu thay đổi"**

#### Đổi mật khẩu
1. Đăng nhập → **Avatar** → **"Đổi mật khẩu"**
2. Nhập **Mật khẩu hiện tại**
3. Nhập **Mật khẩu mới** và **Xác nhận mật khẩu**
4. Click **"Đổi mật khẩu"**

---

### 3.2. Quản lý môn học (Đăng ký môn dạy)

**Mục đích:** Giáo viên đăng ký môn học mà mình sẽ dạy để tạo đề thi, lớp học.

1. Đăng nhập → Sidebar **"Quản lý môn học"** hoặc **"Môn học của tôi"**
2. Xem danh sách môn đã đăng ký
3. Click **"Đăng ký môn mới"** (nếu có)
4. Chọn môn học (VD: Vật Lý 12) → Click **"Xác nhận"**
5. Để hủy: Click **"Hủy đăng ký"** bên cạnh môn học

---

### 3.3. Quản lý đề thi

#### 3.3.1. Xem danh sách đề thi
1. Đăng nhập → Sidebar **"Quản lý đề thi"** hoặc **"Đề thi"**
2. Xem danh sách đề thi (đã tạo, đang chờ duyệt, đã duyệt)
3. Lọc theo môn học, trạng thái (nếu có) → Click **"Lọc"**

#### 3.3.2. Tạo đề thi mới

**Cách 1: Tạo đề trống rồi thêm câu hỏi**
1. **"Quản lý đề thi"** → Click **"Tạo đề mới"**
2. Nhập **Mã đề** (VD: VL12-001), **Tiêu đề**, **Mô tả** (tùy chọn)
3. Chọn **Môn học**
4. Nhập **Thời gian làm bài** (phút)
5. Click **"Tạo đề"**
6. Chuyển sang màn hình chi tiết đề → Thêm câu hỏi (xem mục 3.4)

**Cách 2: Tạo đề từ AI (AI sinh đề)**
1. **"Quản lý đề thi"** → Click **"Tạo đề mới"**
2. Chọn tab **"Tạo đề bằng AI"**
3. Chọn **Môn học**, **Số câu hỏi**
4. Cấu hình phân bổ theo **Bloom level** (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao)
5. Cấu hình phân bổ theo **Chuyên đề** (nếu có)
6. Click **"AI sinh đề"**
7. Xem và chỉnh sửa câu hỏi (nếu cần)
8. Click **"Lưu đề"**

**Cách 3: Tạo đề từ OCR (ảnh/PDF/Word)**
1. **"Quản lý đề thi"** → Click **"Tạo đề mới"**
2. Chọn tab **"Nhập đề từ file"**
3. Nhập **Mã đề**, **Tiêu đề**, **Môn học**
4. Click **"Upload file"** → Chọn ảnh (JPG, PNG) hoặc PDF, Word
5. Có thể chọn **nhiều file** (tối đa 10 file)
6. Click **"Trích xuất"** → AI sẽ tự động đọc và trích xuất câu hỏi
7. Xem kết quả → Chỉnh sửa câu hỏi sai (nếu có)
8. Click **"Duyệt tất cả"** hoặc **"Lưu từng câu"**
9. Click **"Lưu vào đề thi"**

---

### 3.4. Thêm câu hỏi vào đề thi

#### 3.4.1. Thêm câu hỏi thủ công
1. Vào **Chi tiết đề thi** (click vào 1 đề)
2. Click **"Thêm câu hỏi"**
3. Chọn **"Thêm thủ công"**
4. Nhập **Nội dung câu hỏi** (HTML/LaTeX)
5. Nhập **Đáp án A, B, C, D**
6. Chọn **Đáp án đúng**
7. Chọn **Chuyên đề**, **Mức độ Bloom**
8. Nhập **Lời giải** (tùy chọn)
9. Click **"Lưu câu hỏi"**

#### 3.4.2. Thêm câu hỏi từ ngân hàng
1. **Chi tiết đề thi** → Click **"Thêm câu hỏi"**
2. Chọn **"Chọn từ ngân hàng"**
3. Lọc theo môn, chuyên đề, Bloom level
4. Tick chọn các câu cần thêm
5. Click **"Thêm vào đề"**

#### 3.4.3. Import từ Excel
1. **Chi tiết đề thi** → Click **"Import Excel"**
2. Tải **Template mẫu** (nếu chưa có)
3. Điền câu hỏi theo template
4. Upload file Excel → Click **"Import"**
5. Kiểm tra và xác nhận

#### 3.4.4. Thêm câu hỏi ngẫu nhiên
1. **Chi tiết đề thi** → Click **"Thêm câu ngẫu nhiên"**
2. Chọn **Số câu hỏi**
3. Cấu hình phân bổ theo Bloom level, chuyên đề
4. Click **"Lấy câu hỏi"**
5. Xem danh sách → Click **"Thêm vào đề"**

---

### 3.5. Gửi đề thi duyệt

1. **Chi tiết đề thi** → Kiểm tra đủ câu hỏi
2. Click **"Gửi duyệt"** hoặc **"Submit for approval"**
3. Đề chuyển sang trạng thái **Chờ duyệt**
4. Admin sẽ duyệt hoặc từ chối

---

### 3.6. Quản lý lớp học

#### 3.6.1. Tạo lớp mới
1. Sidebar **"Quản lý lớp"** → Click **"Tạo lớp mới"**
2. Nhập **Tên lớp** (VD: Lớp 12A1 - Vật Lý)
3. Nhập **Mã lớp** (VD: 12A1-VL)
4. Chọn **Môn học**
5. Nhập **Năm học** (tùy chọn)
6. Click **"Tạo lớp"**

#### 3.6.2. Thêm học sinh vào lớp
1. Vào **Chi tiết lớp** → Tab **"Học sinh"**
2. Click **"Thêm học sinh"**
3. **Cách 1:** Tìm theo tên/email → Tick chọn → **"Thêm"**
4. **Cách 2:** Nhập danh sách email (nếu có tính năng)

#### 3.6.3. Duyệt học sinh đăng ký
1. Sidebar **"Yêu cầu đăng ký"** hoặc **"Enrollments"**
2. Xem danh sách học sinh **chờ duyệt**
3. Với mỗi yêu cầu: Click **"Duyệt"** hoặc **"Từ chối"**

#### 3.6.4. Xem kết quả lớp
1. **Chi tiết lớp** → Tab **"Kết quả"** hoặc **"Báo cáo"**
2. Xem danh sách bài tập, điểm trung bình
3. Xem phân tích AI theo lớp (nếu có)

---

### 3.7. Giao bài tập / Thi thử

#### 3.7.1. Giao bài tập cố định (đề có sẵn)
1. Click **"Giao bài tập"** hoặc **"Assignments"**
2. Click **"Tạo bài tập mới"**
3. Chọn **Lớp**
4. Chọn **Loại:** Đề cố định
5. Chọn **Đề thi** (đã được duyệt)
6. Nhập **Tiêu đề**, **Mô tả**
7. Chọn **Hạn nộp** (deadline)
8. Nhập **Thời gian làm bài** (phút)
9. Click **"Giao bài"**

#### 3.7.2. Giao bài tập ngẫu nhiên (AI mix đề)
1. **"Tạo bài tập mới"**
2. Chọn **Lớp**
3. Chọn **Loại:** Đề ngẫu nhiên
4. Cấu hình: Chọn **Môn học**, **Số câu**, phân bổ Bloom level
5. Nhập **Tiêu đề**, **Hạn nộp**, **Thời gian**
6. Click **"Giao bài"**

#### 3.7.3. Xem tiến độ làm bài
1. **Chi tiết bài tập** → Tab **"Tiến độ"**
2. Xem danh sách học sinh: Đã làm / Chưa làm
3. Xem điểm từng học sinh

---

### 3.8. Quản lý ngân hàng câu hỏi

#### 3.8.1. Xem danh sách câu hỏi
1. Sidebar **"Ngân hàng câu hỏi"**
2. Lọc theo môn, chuyên đề, Bloom level
3. Tìm kiếm theo nội dung

#### 3.8.2. Xem thống kê
1. **"Ngân hàng câu hỏi"** → Tab **"Thống kê"**
2. Xem tổng số câu, phân bổ theo chuyên đề, Bloom level

#### 3.8.3. AI tạo lời giải cho câu hỏi
1. Vào **Chi tiết câu hỏi**
2. Nếu chưa có lời giải → Click **"AI tạo lời giải"**
3. Chờ AI xử lý → Xem và chỉnh sửa (nếu cần)
4. Click **"Lưu"**

---

### 3.9. Tạo câu hỏi bằng AI

1. **"Ngân hàng câu hỏi"** → Click **"Tạo câu hỏi bằng AI"**
2. Chọn **Môn học**, **Chuyên đề**, **Mức độ Bloom**
3. Nhập **Số câu** cần tạo
4. (Tùy chọn) Nhập **Gợi ý** hoặc **Ngữ cảnh**
5. Click **"AI sinh câu hỏi"**
6. Xem kết quả → Chỉnh sửa → Lưu vào ngân hàng

---

### 3.10. Phân tích AI (Class Analysis)

1. **Chi tiết lớp** → Tab **"Phân tích AI"**
2. Xem báo cáo: Điểm mạnh/yếu của lớp
3. Xem đề xuất ôn tập cho từng chuyên đề

---

## 4. HƯỚNG DẪN CHO HỌC SINH (STUDENT)

### 4.1. Đăng nhập & Cập nhật thông tin

#### Đăng ký tài khoản
1. Trang chủ → **"Đăng ký"**
2. Nhập **Email**, **Mật khẩu**, **Họ tên**
3. Chọn **Vai trò:** Học sinh
4. Nhập **Tên lớp** (VD: 12A1)
5. Click **"Đăng ký"**

#### Đăng nhập
1. Trang chủ → **"Đăng nhập"**
2. Nhập **Email**, **Mật khẩu**
3. Click **"Đăng nhập"**

#### Cập nhật thông tin cá nhân
1. **Avatar** → **"Tài khoản"**
2. Chỉnh sửa **Họ tên**, **Tên lớp**
3. Click **"Lưu"**

---

### 4.2. Đăng ký lớp học

1. Sidebar **"Lớp học"** hoặc **"Tìm lớp"**
2. Tìm lớp theo tên (VD: "Lớp 12A1 - Vật Lý")
3. Click **"Đăng ký"**
4. Nhập **Tên lớp** (mã lớp) nếu có
5. Click **"Gửi yêu cầu"**
6. Chờ giáo viên duyệt
7. Xem trạng thái tại **"Lớp của tôi"** (pending / active)

---

### 4.3. Xem bài tập được giao

1. Sidebar **"Bài tập"** hoặc **"Assignments"**
2. Xem danh sách bài tập của các lớp đã tham gia
3. Lọc theo lớp, trạng thái (Chưa làm / Đã làm)
4. Mỗi bài hiển thị: Tiêu đề, Hạn nộp, Thời gian làm bài

---

### 4.4. Làm bài tập

1. **"Bài tập"** → Chọn bài **chưa làm**
2. Click **"Bắt đầu làm"**
3. Đọc thời gian làm bài
4. Click **"Bắt đầu"**
5. Làm lần lượt từng câu → Chọn đáp án A/B/C/D
6. Có thể **Đánh dấu** câu chưa chắc để xem lại
7. Click **"Nộp bài"** khi hoàn thành (hoặc hết giờ)
8. Xác nhận **"Nộp bài"**
9. Xem **Kết quả** ngay sau khi nộp

---

### 4.5. Xem kết quả bài làm

1. **"Bài tập"** → Chọn bài **đã làm**
2. Click **"Xem kết quả"**
3. Xem: Điểm, Số câu đúng/sai, Thời gian làm
4. Xem chi tiết từng câu: Đáp án đúng, Đáp án của bạn
5. Xem **Lời giải** (nếu có)

---

### 4.6. Luyện tập (Practice)

**Mục đích:** Tự luyện theo môn học, chuyên đề mà không cần bài tập từ giáo viên.

1. Sidebar **"Luyện tập"**
2. Chọn **Môn học**
3. (Tùy chọn) Chọn **Chuyên đề** cụ thể
4. Chọn **Số câu** (VD: 20)
5. Click **"Bắt đầu luyện"**
6. Làm bài tương tự làm bài tập
7. Click **"Nộp bài"**
8. Xem kết quả

#### Xem lịch sử luyện tập
1. **"Luyện tập"** → Tab **"Lịch sử"**
2. Xem các phiên đã làm: Ngày, Môn, Điểm

---

### 4.7. AI Gia sư (Giải thích câu hỏi)

1. Khi xem **Kết quả** hoặc **Lời giải** một câu hỏi
2. Click **"AI giải thích"** hoặc **"Hỏi AI"**
3. AI sẽ giải thích chi tiết câu hỏi đó
4. (Tùy chọn) Click **"Giải từng bước"** để xem lời giải từng bước

---

### 4.8. Phân tích AI cá nhân

1. Sidebar **"Phân tích của tôi"** hoặc **"AI Analysis"**
2. Xem **Điểm mạnh** (chuyên đề làm tốt)
3. Xem **Điểm yếu** (chuyên đề cần ôn)
4. Xem **Dự đoán điểm** (nếu có)
5. Xem **Lộ trình học** AI đề xuất

---

### 4.9. Lộ trình học (Study Plan)

1. **"Phân tích của tôi"** → Tab **"Lộ trình học"**
2. Xem lộ trình AI tạo dựa trên kết quả làm bài
3. Cập nhật lộ trình (nếu có nút **"Chỉnh sửa"**)

---

## 5. HƯỚNG DẪN CHO QUẢN TRỊ VIÊN (ADMIN)

### 5.1. Quản lý người dùng

1. Sidebar **"Quản lý người dùng"** hoặc **"Users"**
2. Xem danh sách Teacher, Student
3. Lọc theo vai trò, trạng thái
4. **Thêm user:** Click **"Thêm người dùng"** → Điền thông tin
5. **Sửa user:** Click vào user → Chỉnh sửa → Lưu
6. **Khóa/Kích hoạt:** Toggle **"Hoạt động"**

---

### 5.2. Duyệt đề thi

1. Sidebar **"Duyệt đề thi"** hoặc **"Pending Exams"**
2. Xem danh sách đề **chờ duyệt**
3. Click vào đề → Xem chi tiết câu hỏi
4. Click **"Duyệt"** hoặc **"Từ chối"**
5. Nếu từ chối: Nhập **Lý do từ chối**

---

### 5.3. Quản lý môn học & Chuyên đề

1. **"Quản lý môn học"** (cấp hệ thống)
2. Thêm/Sửa/Xóa môn học
3. Quản lý **Chuyên đề** (Topic) trong từng môn

---

### 5.4. Quản lý lớp học (toàn hệ thống)

1. **"Quản lý lớp"** → Xem tất cả lớp
2. Có thể xóa lớp, chuyển giáo viên (tùy tính năng)

---

## 📌 LƯU Ý CHUNG

- **Quên mật khẩu:** Trang đăng nhập → **"Quên mật khẩu"** → Nhập email → Kiểm tra email → Click link reset
- **Đăng xuất:** Avatar → **"Đăng xuất"**
- **Hỗ trợ:** Liên hệ admin hoặc xem mục FAQ (nếu có)

---

*Tài liệu được tạo dựa trên cấu trúc API và database của hệ thống AI Exam. Giao diện thực tế có thể khác tùy phiên bản frontend.*
