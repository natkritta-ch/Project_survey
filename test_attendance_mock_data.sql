-- =========================================================================
-- ชุดคำสั่ง SQL: จำลองข้อมูลการเข้าเรียน & เข้าแถวครบวงจร (แก้ไข Foreign Key ปลอดภัย 100%)
-- เป้าหมาย: ทดสอบ นายปัญญาวุธ เวียงคำ (69301090016) และระดับชั้น ปวส.1
-- ครอบคลุม: สัปดาห์ปัจจุบัน (19 - 25 ต.ค. 2569) + สัปดาห์ย้อนหลัง + ครูที่ปรึกษา + หัวหน้าแผนก
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. ค้นหา ID ของ นายปัญญาวุธ เวียงคำ (69301090016)
SET @student_id = (SELECT `id` FROM `user` WHERE `username` = '69301090016' OR `name` LIKE '%ปัญญาวุธ%' LIMIT 1);

-- หากยังไม่มี ให้สร้างขึ้นมาอัตโนมัติ
INSERT INTO `user` (`id`, `name`, `username`, `password`, `role`, `level`, `nickname`, `phone`, `bloodType`, `gender`, `email`, `parentCode`, `createdAt`, `updatedAt`)
SELECT 'std-panyawut-01', 'นายปัญญาวุธ เวียงคำ', '69301090016', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', 'STUDENT', 'ปวส.1', 'วุธ', '098-787-1992', 'A', 'ชาย', 'Miller969999@gmail.com', 'P-9234-FCF7', NOW(3), NOW(3)
WHERE @student_id IS NULL;

SET @student_id = (SELECT `id` FROM `user` WHERE `username` = '69301090016' OR `name` LIKE '%ปัญญาวุธ%' LIMIT 1);

-- 2. ค้นหา ID ของอาจารย์ ทวี ปวงจันทร์ โดยตรง
SET @teacher_id = (SELECT `id` FROM `user` WHERE `name` LIKE '%ทวี%' OR `username` = 'tawee' LIMIT 1);

INSERT INTO `user` (`id`, `name`, `username`, `password`, `role`, `phone`, `createdAt`, `updatedAt`)
SELECT 'teacher-tawee-01', 'ทวี ปวงจันทร์', 'tawee', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', 'TEACHER', '081-999-8877', NOW(3), NOW(3)
WHERE @teacher_id IS NULL;

SET @teacher_id = (SELECT `id` FROM `user` WHERE `name` LIKE '%ทวี%' OR `username` = 'tawee' LIMIT 1);

-- 3. กำหนดภาคเรียนปัจจุบันเป็น ปีการศึกษา 2569 ภาคเรียนที่ 1
INSERT INTO `termconfig` (`id`, `academicYear`, `term`, `startDate`, `endDate`, `isCurrent`)
VALUES ('term-2569-1', '2569', '1', '2026-05-15 00:00:00', '2026-10-31 23:59:59', 1)
ON DUPLICATE KEY UPDATE `isCurrent` = 1, `startDate` = '2026-05-15 00:00:00', `endDate` = '2026-10-31 23:59:59';

-- 4. แต่งตั้งครูที่ปรึกษาประจำชั้น ปวส.1 ปี 2569
INSERT INTO `classroom_advisor` (`id`, `academicYear`, `level`, `primaryAdvisorId`, `createdAt`, `updatedAt`)
VALUES ('adv-pws1-2569', '2569', 'ปวส.1', @teacher_id, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `primaryAdvisorId` = @teacher_id, `updatedAt` = NOW(3);

-- 5. ค้นหา ID จริงของรายวิชาในระบบ (ดึงจาก code เพื่อป้องกัน Foreign Key หลุด)
SET @sub_mobile   = (SELECT `id` FROM `subject` WHERE `code` LIKE '%30105-2001%' OR `name` LIKE '%อุปกรณ์พกพา%' LIMIT 1);
SET @sub_network  = (SELECT `id` FROM `subject` WHERE `code` LIKE '%30105-2002%' OR `name` LIKE '%เครือข่าย%' LIMIT 1);
SET @sub_english  = (SELECT `id` FROM `subject` WHERE `code` LIKE '%30000-1201%' OR `name` LIKE '%ภาษาอังกฤษ%' LIMIT 1);
SET @sub_digital  = (SELECT `id` FROM `subject` WHERE `code` LIKE '%30000-1501%' OR `name` LIKE '%สังคมไทย%' LIMIT 1);

-- หากยังไม่มีวิชาใดในระบบ ให้เพิ่มเข้าไปด้วย UUID()
INSERT INTO `subject` (`id`, `code`, `name`, `level`, `group`, `room`, `academicYear`, `term`, `teacherId`, `lateThresholdMin`)
SELECT UUID(), '30105-2001', 'การพัฒนาโปรแกรมบนอุปกรณ์พกพา', 'ปวส.1', 'ก.1,2', '421', '2569', '1', @teacher_id, 15
WHERE @sub_mobile IS NULL;

INSERT INTO `subject` (`id`, `code`, `name`, `level`, `group`, `room`, `academicYear`, `term`, `teacherId`, `lateThresholdMin`)
SELECT UUID(), '30105-2002', 'ระบบเครือข่ายคอมพิวเตอร์และความปลอดภัย', 'ปวส.1', 'ก.1,2', '422', '2569', '1', @teacher_id, 15
WHERE @sub_network IS NULL;

INSERT INTO `subject` (`id`, `code`, `name`, `level`, `group`, `room`, `academicYear`, `term`, `teacherId`, `lateThresholdMin`)
SELECT UUID(), '30000-1201', 'ภาษาอังกฤษเพื่อการสื่อสารในการทำงาน', 'ปวส.1', 'ก.1,2', '211', '2569', '1', @teacher_id, 15
WHERE @sub_english IS NULL;

INSERT INTO `subject` (`id`, `code`, `name`, `level`, `group`, `room`, `academicYear`, `term`, `teacherId`, `lateThresholdMin`)
SELECT UUID(), '30000-1501', 'สังคมไทยยุคดิจิทัล', 'ปวส.1', 'ก.1,2', '315', '2569', '1', @teacher_id, 15
WHERE @sub_digital IS NULL;

-- อัปเดตตัวแปรให้ชี้ไปยัง ID จริงของแต่ละวิชาอย่างแน่นอน 100%
SET @sub_mobile   = (SELECT `id` FROM `subject` WHERE `code` LIKE '%30105-2001%' OR `name` LIKE '%อุปกรณ์พกพา%' LIMIT 1);
SET @sub_network  = (SELECT `id` FROM `subject` WHERE `code` LIKE '%30105-2002%' OR `name` LIKE '%เครือข่าย%' LIMIT 1);
SET @sub_english  = (SELECT `id` FROM `subject` WHERE `code` LIKE '%30000-1201%' OR `name` LIKE '%ภาษาอังกฤษ%' LIMIT 1);
SET @sub_digital  = (SELECT `id` FROM `subject` WHERE `code` LIKE '%30000-1501%' OR `name` LIKE '%สังคมไทย%' LIMIT 1);

-- แผนสำรอง: หากวิชาใดยังว่าง ให้ดึงวิชาแรกของ ปวส.1 มาแทน ป้องกัน Foreign Key Error
SET @sub_fallback = (SELECT `id` FROM `subject` WHERE `level` = 'ปวส.1' AND `deletedAt` IS NULL LIMIT 1);
SET @sub_mobile   = COALESCE(@sub_mobile, @sub_fallback);
SET @sub_network  = COALESCE(@sub_network, @sub_fallback);
SET @sub_english  = COALESCE(@sub_english, @sub_fallback);
SET @sub_digital  = COALESCE(@sub_digital, @sub_fallback);

-- 6. เพิ่มตารางเรียน (Schedule) โดยใช้ ID จริงจากตัวแปร (ไม่สร้างซ้ำหากมีอยู่แล้ว)
INSERT INTO `schedule` (`id`, `subjectId`, `dayOfWeek`, `startTime`, `endTime`, `deletedAt`)
SELECT UUID(), @sub_mobile, 1, '08:30', '11:30', NULL
WHERE @sub_mobile IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `schedule` WHERE `subjectId` = @sub_mobile AND `dayOfWeek` = 1 AND `deletedAt` IS NULL);

INSERT INTO `schedule` (`id`, `subjectId`, `dayOfWeek`, `startTime`, `endTime`, `deletedAt`)
SELECT UUID(), @sub_network, 2, '08:30', '11:30', NULL
WHERE @sub_network IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `schedule` WHERE `subjectId` = @sub_network AND `dayOfWeek` = 2 AND `deletedAt` IS NULL);

INSERT INTO `schedule` (`id`, `subjectId`, `dayOfWeek`, `startTime`, `endTime`, `deletedAt`)
SELECT UUID(), @sub_english, 3, '08:30', '10:30', NULL
WHERE @sub_english IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `schedule` WHERE `subjectId` = @sub_english AND `dayOfWeek` = 3 AND `deletedAt` IS NULL);

INSERT INTO `schedule` (`id`, `subjectId`, `dayOfWeek`, `startTime`, `endTime`, `deletedAt`)
SELECT UUID(), @sub_digital, 4, '08:30', '10:30', NULL
WHERE @sub_digital IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `schedule` WHERE `subjectId` = @sub_digital AND `dayOfWeek` = 4 AND `deletedAt` IS NULL);

INSERT INTO `schedule` (`id`, `subjectId`, `dayOfWeek`, `startTime`, `endTime`, `deletedAt`)
SELECT UUID(), @sub_mobile, 5, '13:00', '16:00', NULL
WHERE @sub_mobile IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `schedule` WHERE `subjectId` = @sub_mobile AND `dayOfWeek` = 5 AND `deletedAt` IS NULL);

-- 7. เพิ่มคลาสสอนชดเชยวันเสาร์ (24 ต.ค. 2569) เพื่อทดสอบฟังก์ชันคลาสสอนชดเชย
INSERT INTO `makeup_class` (`id`, `subjectId`, `date`, `startTime`, `endTime`, `remark`, `deletedAt`, `createdAt`)
SELECT UUID(), @sub_english, '2026-10-24', '09:00', '11:00', 'สอนชดเชยคาบวันหยุดนักขัตฤกษ์', NULL, NOW(3)
WHERE @sub_english IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `makeup_class` WHERE `subjectId` = @sub_english AND `date` = '2026-10-24' AND `deletedAt` IS NULL);

-- 8. ล้างข้อมูลการเช็คชื่อเดิมเฉพาะของ นายปัญญาวุธ เวียงคำ
DELETE FROM `attendance` WHERE `studentId` = @student_id;

-- =========================================================================
-- 9. เพิ่มข้อมูลการเช็คชื่อของ "นายปัญญาวุธ เวียงคำ" (@student_id)
-- =========================================================================

-- -------------------------------------------------------------------------
-- [สัปดาห์ปัจจุบัน: 19 ต.ค. - 25 ต.ค. 2569]
-- ผลลัพธ์ในหน้าจอ: มาเรียน 3 คาบ, ขาด 1 คาบ (แถบเตือนสีแดง), ลา 1 คาบ, เข้าแถว 4 วัน
-- -------------------------------------------------------------------------

-- วันจันทร์ 19 ต.ค. 2569
INSERT INTO `attendance` (`id`, `studentId`, `subjectId`, `type`, `status`, `timestamp`) VALUES
(UUID(), @student_id, NULL,         'assembly', 'LATE',           '2026-10-19 07:55:20'),
(UUID(), @student_id, @sub_mobile,  'class',    'PRESENT',        '2026-10-19 08:35:10');

-- วันอังคาร 20 ต.ค. 2569
INSERT INTO `attendance` (`id`, `studentId`, `subjectId`, `type`, `status`, `timestamp`) VALUES
(UUID(), @student_id, NULL,         'assembly', 'PRESENT',        '2026-10-20 07:45:15'),
(UUID(), @student_id, @sub_network, 'class',    'PRESENT',        '2026-10-20 08:32:40');

-- วันพุธ 21 ต.ค. 2569 (ขาดเรียนวิชาภาษาอังกฤษ 🔴 -> แจ้งเตือนสีแดงในหน้าสรุปรายสัปดาห์!)
INSERT INTO `attendance` (`id`, `studentId`, `subjectId`, `type`, `status`, `timestamp`) VALUES
(UUID(), @student_id, NULL,         'assembly', 'PRESENT',        '2026-10-21 07:42:10'),
(UUID(), @student_id, @sub_english, 'class',    'ABSENT',         '2026-10-21 08:30:00');

-- วันพฤหัสบดี 22 ต.ค. 2569 (วันนี้! -> Live Status หน้าแรกจะขึ้น ✓ สแกนสำเร็จแล้ว)
INSERT INTO `attendance` (`id`, `studentId`, `subjectId`, `type`, `status`, `timestamp`) VALUES
(UUID(), @student_id, NULL,         'assembly', 'PRESENT',        '2026-10-22 07:40:50'),
(UUID(), @student_id, @sub_digital, 'class',    'PRESENT',        '2026-10-22 08:38:25');

-- วันศุกร์ 23 ต.ค. 2569 (ลากิจ 🔵)
INSERT INTO `attendance` (`id`, `studentId`, `subjectId`, `type`, `status`, `timestamp`) VALUES
(UUID(), @student_id, NULL,         'assembly', 'LEAVE_PERSONAL', '2026-10-23 07:40:00'),
(UUID(), @student_id, @sub_mobile,  'class',    'LEAVE_PERSONAL', '2026-10-23 13:05:00');

-- -------------------------------------------------------------------------
-- [สัปดาห์ก่อนหน้า: 12 ต.ค. - 16 ต.ค. 2569]
-- (ทดสอบการกดปุ่ม [◀ สัปดาห์ก่อนหน้า])
-- -------------------------------------------------------------------------
INSERT INTO `attendance` (`id`, `studentId`, `subjectId`, `type`, `status`, `timestamp`) VALUES
-- จันทร์ 12 ต.ค.
(UUID(), @student_id, NULL,         'assembly', 'PRESENT', '2026-10-12 07:44:10'),
(UUID(), @student_id, @sub_mobile,  'class',    'PRESENT', '2026-10-12 08:35:00'),
-- อังคาร 13 ต.ค.
(UUID(), @student_id, NULL,         'assembly', 'PRESENT', '2026-10-13 07:46:20'),
(UUID(), @student_id, @sub_network, 'class',    'PRESENT', '2026-10-13 08:32:15'),
-- พุธ 14 ต.ค.
(UUID(), @student_id, NULL,         'assembly', 'PRESENT', '2026-10-14 07:48:00'),
(UUID(), @student_id, @sub_english, 'class',    'PRESENT', '2026-10-14 08:31:00'),
-- พฤหัสบดี 15 ต.ค. (ขาดเข้าแถว 🔴 / มาสายวิชาสังคมไทย 🟠)
(UUID(), @student_id, NULL,         'assembly', 'ABSENT',  '2026-10-15 08:30:00'),
(UUID(), @student_id, @sub_digital, 'class',    'LATE',    '2026-10-15 08:50:30'),
-- ศุกร์ 16 ต.ค.
(UUID(), @student_id, NULL,         'assembly', 'PRESENT', '2026-10-16 07:43:10'),
(UUID(), @student_id, @sub_mobile,  'class',    'PRESENT', '2026-10-16 13:10:00');

-- -------------------------------------------------------------------------
-- [สัปดาห์แรก: 5 ต.ค. - 9 ต.ค. 2569]
-- (ทดสอบการดูย้อนหลังทั้งหมดทั้งภาคเรียน)
-- -------------------------------------------------------------------------
INSERT INTO `attendance` (`id`, `studentId`, `subjectId`, `type`, `status`, `timestamp`) VALUES
(UUID(), @student_id, NULL,         'assembly', 'PRESENT', '2026-10-05 07:45:00'),
(UUID(), @student_id, @sub_mobile,  'class',    'PRESENT', '2026-10-05 08:35:00'),
(UUID(), @student_id, NULL,         'assembly', 'PRESENT', '2026-10-06 07:44:00'),
(UUID(), @student_id, @sub_network, 'class',    'PRESENT', '2026-10-06 08:36:00'),
(UUID(), @student_id, NULL,         'assembly', 'PRESENT', '2026-10-07 07:42:00'),
(UUID(), @student_id, @sub_english, 'class',    'PRESENT', '2026-10-07 08:33:00'),
(UUID(), @student_id, NULL,         'assembly', 'PRESENT', '2026-10-08 07:46:00'),
(UUID(), @student_id, @sub_digital, 'class',    'PRESENT', '2026-10-08 08:35:00'),
(UUID(), @student_id, NULL,         'assembly', 'PRESENT', '2026-10-09 07:45:00'),
(UUID(), @student_id, @sub_mobile,  'class',    'PRESENT', '2026-10-09 13:05:00');

SET FOREIGN_KEY_CHECKS = 1;

