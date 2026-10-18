-- --------------------------------------------------------
-- Host:                         localhost
-- Server version:               PostgreSQL 15.15, compiled by Visual C++ build 1944, 64-bit
-- Server OS:                    
-- HeidiSQL Version:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES  */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Dumping data for table public.audit_log: 144 rows
DELETE FROM "audit_log";
/*!40000 ALTER TABLE "audit_log" DISABLE KEYS */;
INSERT INTO "audit_log" ("id", "waktu", "user", "aksi", "sheet", "record_id", "detail") VALUES
	(1, '2026-10-17 07:33:51+04', 'tehsuf@gmail.com', 'LOGIN', 'Users', 'USR-0001', 'admin'),
	(2, '2026-10-16 19:28:25+04', 'tehsuf@gmail.com', 'CREATE', 'Investors', 'INV-0001', 'Abu Daffa'),
	(3, '2026-10-16 19:28:57+04', 'tehsuf@gmail.com', 'CREATE', 'Investors', 'INV-0002', 'Abu Rayyan'),
	(4, '2026-10-16 19:29:30+04', 'tehsuf@gmail.com', 'CREATE', 'Investors', 'INV-0003', 'Abu Ahyar'),
	(5, '2026-10-16 19:30:13+04', 'tehsuf@gmail.com', 'CREATE', 'ThirdParties', 'TP-0001', 'JIT'),
	(6, '2026-10-16 19:32:05+04', 'tehsuf@gmail.com', 'CREATE', 'Projects', 'PRJ-0001', 'Pembuatan Dapur MBG di Kp. Sawah, Tangerang'),
	(7, '2026-10-16 19:34:58+04', 'tehsuf@gmail.com', 'CREATE', 'CapitalTransactions', 'CT-0001', 'Setor 150000000'),
	(8, '2026-10-16 19:35:22+04', 'tehsuf@gmail.com', 'CREATE', 'CapitalTransactions', 'CT-0002', 'Setor 200000000'),
	(9, '2026-10-16 19:35:56+04', 'tehsuf@gmail.com', 'CREATE', 'CapitalTransactions', 'CT-0003', 'Setor 150000000'),
	(10, '2026-10-16 19:36:38+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectFunding', 'PF-0001', '150000000'),
	(11, '2026-10-16 19:37:05+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectFunding', 'PF-0002', '200000000'),
	(12, '2026-10-16 19:37:28+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectFunding', 'PF-0003', '150000000'),
	(13, '2026-10-16 19:38:27+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectTransactions', 'PT-0001', 'Pendapatan 100000000'),
	(14, '2026-10-16 19:39:54+04', 'tehsuf@gmail.com', 'DISTRIBUTE', 'Projects', 'PRJ-0001', 'Laba 100000000'),
	(15, '2026-10-16 21:07:35+04', 'tehsuf@gmail.com', 'CLOSE', 'Projects', 'PRJ-0001', 'Pembuatan Dapur MBG di Kp. Sawah, Tangerang'),
	(16, '2026-10-16 21:13:15+04', 'tehsuf@gmail.com', 'CREATE', 'CapitalTransactions', 'CT-0004', 'Setor 200000000'),
	(17, '2026-10-16 21:13:47+04', 'tehsuf@gmail.com', 'CREATE', 'CapitalTransactions', 'CT-0005', 'Setor 300000000'),
	(18, '2026-10-16 21:14:17+04', 'tehsuf@gmail.com', 'CREATE', 'CapitalTransactions', 'CT-0006', 'Setor 400000000'),
	(19, '2026-10-16 21:19:08+04', 'tehsuf@gmail.com', 'CREATE', 'Projects', 'PRJ-0002', 'Shutdown Decoking & Grade Change, PT.Sulfindo'),
	(20, '2026-10-16 21:20:13+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectFunding', 'PF-0004', '200000000'),
	(21, '2026-10-16 21:21:10+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectFunding', 'PF-0005', '300000000'),
	(22, '2026-10-16 21:22:05+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectFunding', 'PF-0006', '400000000'),
	(23, '2026-10-16 21:23:21+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectTransactions', 'PT-0002', 'Pendapatan 20032472'),
	(24, '2026-10-16 21:32:15+04', 'tehsuf@gmail.com', 'UPDATE', 'Projects', 'PRJ-0002', 'Akumulasi Project di PT.Sulfindo & PT.CAPC Periode 2024/2025'),
	(25, '2026-10-16 21:34:20+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectTransactions', 'PT-0003', 'Pendapatan 22243856'),
	(26, '2026-10-16 21:34:47+04', 'tehsuf@gmail.com', 'DELETE', 'ProjectTransactions', 'PT-0002', ''),
	(27, '2026-10-16 21:35:24+04', 'tehsuf@gmail.com', 'DISTRIBUTE', 'Projects', 'PRJ-0002', 'Laba 22243856'),
	(28, '2026-10-16 21:39:21+04', 'tehsuf@gmail.com', 'CREATE', 'Projects', 'PRJ-0003', 'Repair Asphalt Foundation, PT.CAPC'),
	(29, '2026-10-16 21:41:37+04', 'tehsuf@gmail.com', 'CREATE', 'Projects', 'PRJ-0004', 'Additional Motor 75 Kw Dermaga Jetty2, PT.Multimas'),
	(30, '2026-10-16 21:42:42+04', 'tehsuf@gmail.com', 'CREATE', 'Projects', 'PRJ-0005', 'Repair Annular Plate & Asphalt Tank, PT.CAPC'),
	(31, '2026-10-16 21:44:25+04', 'tehsuf@gmail.com', 'CLOSE', 'Projects', 'PRJ-0002', 'Akumulasi Project di PT.Sulfindo & PT.CAPC Periode 2024/2025'),
	(32, '2026-10-16 21:45:25+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectFunding', 'PF-0007', '400000000'),
	(33, '2026-10-16 21:46:16+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectFunding', 'PF-0008', '300000000'),
	(34, '2026-10-16 21:46:46+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectFunding', 'PF-0009', '200000000'),
	(35, '2026-10-16 21:47:44+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectTransactions', 'PT-0004', 'Pendapatan 244042410'),
	(36, '2026-10-16 21:48:21+04', 'tehsuf@gmail.com', 'DISTRIBUTE', 'Projects', 'PRJ-0003', 'Laba 244042410'),
	(37, '2026-10-16 21:48:44+04', 'tehsuf@gmail.com', 'CLOSE', 'Projects', 'PRJ-0003', 'Repair Asphalt Foundation, PT.CAPC'),
	(38, '2026-10-16 21:59:37+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectFunding', 'PF-0010', '300000000'),
	(39, '2026-10-16 22:00:12+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectFunding', 'PF-0011', '400000000'),
	(40, '2026-10-16 22:00:39+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectFunding', 'PF-0012', '200000000'),
	(41, '2026-10-16 22:01:45+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectTransactions', 'PT-0005', 'Pendapatan 5406800'),
	(42, '2026-10-16 22:02:15+04', 'tehsuf@gmail.com', 'DISTRIBUTE', 'Projects', 'PRJ-0004', 'Laba 5406800'),
	(43, '2026-10-16 22:02:50+04', 'tehsuf@gmail.com', 'CLOSE', 'Projects', 'PRJ-0004', 'Additional Motor 75 Kw Dermaga Jetty2, PT.Multimas'),
	(44, '2026-10-16 22:42:26+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectFunding', 'PF-0013', '400000000'),
	(45, '2026-10-16 22:42:58+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectFunding', 'PF-0014', '300000000'),
	(46, '2026-10-16 22:45:52+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectTransactions', 'PT-0006', 'Pendapatan 29198777'),
	(47, '2026-10-16 22:48:31+04', 'tehsuf@gmail.com', 'CREATE', 'ProjectTransactions', 'PT-0007', 'Biaya 95723058'),
	(48, '2026-10-16 22:49:59+04', 'tehsuf@gmail.com', 'DELETE', 'ProjectTransactions', 'PT-0007', ''),
	(49, '2026-10-16 22:50:41+04', 'tehsuf@gmail.com', 'DISTRIBUTE', 'Projects', 'PRJ-0005', 'Laba 29198777'),
	(50, '2026-10-16 22:51:38+04', 'tehsuf@gmail.com', 'CLOSE', 'Projects', 'PRJ-0005', 'Repair Annular Plate & Asphalt Tank, PT.CAPC'),
	(51, '2026-10-17 06:44:05+04', 'anon', 'CREATE', 'Projects', 'PRJ-0006', 'ShutDown UIC'),
	(52, '2026-10-17 06:45:08+04', 'anon', 'CREATE', 'ProjectFunding', 'PF-0016', '150000000'),
	(53, '2026-10-17 06:45:40+04', 'anon', 'CREATE', 'ProjectFunding', 'PF-0017', '225000000'),
	(54, '2026-10-17 06:46:11+04', 'anon', 'CREATE', 'ProjectFunding', 'PF-0018', '225000000'),
	(55, '2026-10-17 06:47:11+04', 'anon', 'CREATE', 'ProjectTransactions', 'PT-0007', 'Pendapatan 48985024'),
	(56, '2026-10-17 06:47:57+04', 'anon', 'DISTRIBUTE', 'Projects', 'PRJ-0006', 'Laba 48985024'),
	(57, '2026-10-17 07:09:47+04', 'anon', 'CREATE', 'Projects', 'PRJ-0007', 'contoh'),
	(58, '2026-10-17 07:10:39+04', 'anon', 'CREATE', 'ProjectFunding', 'PF-0019', '30000000'),
	(59, '2026-10-17 07:11:09+04', 'anon', 'CREATE', 'ProjectFunding', 'PF-0020', '300000000'),
	(60, '2026-10-17 07:37:33+04', 'tehsuf@gmail.com', 'CHANGE_PASSWORD', 'Users', 'USR-0001', 'admin'),
	(61, '2026-10-17 07:41:24+04', 'tehsuf@gmail.com', 'CREATE', 'Investors', 'INV-0004', 'pak_nazar'),
	(62, '2026-10-17 07:42:27+04', 'tehsuf@gmail.com', 'CREATE', 'Users', 'USR-0002', 'emhazed'),
	(63, '2026-10-17 07:44:07+04', 'tehsuf@gmail.com', 'LOGOUT', 'Users', 'USR-0001', 'admin'),
	(64, '2026-10-17 07:44:19+04', 'tehsuf@gmail.com', 'LOGIN', 'Users', 'USR-0002', 'emhazed'),
	(65, '2026-10-17 07:44:54+04', 'tehsuf@gmail.com', 'DELETE', 'Investors', 'INV-0004', ''),
	(66, '2026-10-17 08:12:08+04', 'tehsuf@gmail.com', 'LOGOUT', 'Users', 'USR-0002', 'emhazed'),
	(67, '2026-10-17 08:12:18+04', 'tehsuf@gmail.com', 'LOGIN', 'Users', 'USR-0001', 'admin'),
	(68, '2026-10-17 08:13:18+04', 'tehsuf@gmail.com', 'CREATE', 'Users', 'USR-0003', 'inv-0001'),
	(69, '2026-10-17 08:25:45+04', 'tehsuf@gmail.com', 'LOGIN', 'Users', 'USR-0001', 'admin'),
	(70, '2026-10-17 08:27:27+04', 'tehsuf@gmail.com', 'CREATE', 'Investors', 'INV-0004', 'hero'),
	(71, '2026-10-17 08:32:57+04', 'tehsuf@gmail.com', 'DELETE', 'Users', 'USR-0003', 'inv-0001'),
	(72, '2026-10-17 08:42:07+04', 'tehsuf@gmail.com', 'LOGIN', 'Users', 'USR-0001', 'admin'),
	(73, '2026-10-17 08:45:30+04', 'tehsuf@gmail.com', 'CREATE', 'Users', 'USR-0003', 'abu_daffa'),
	(74, '2026-10-17 08:45:39+04', 'tehsuf@gmail.com', 'DELETE', 'Users', 'USR-0002', 'emhazed'),
	(75, '2026-10-17 08:46:48+04', 'tehsuf@gmail.com', 'CREATE', 'Users', 'USR-0004', 'adjit'),
	(76, '2026-10-17 09:09:47+04', 'tehsuf@gmail.com', 'CREATE', 'Users', 'USR-0005', 'jit'),
	(77, '2026-10-17 09:10:28+04', 'tehsuf@gmail.com', 'DELETE', 'Investors', 'INV-0004', ''),
	(78, '2026-10-17 09:10:58+04', 'tehsuf@gmail.com', 'LOGOUT', 'Users', 'USR-0001', 'admin'),
	(79, '2026-10-17 09:11:09+04', 'tehsuf@gmail.com', 'LOGIN', 'Users', 'USR-0005', 'jit'),
	(80, '2026-10-17 09:12:24+04', 'tehsuf@gmail.com', 'LOGOUT', 'Users', 'USR-0005', 'jit'),
	(81, '2026-10-17 09:16:42+04', 'tehsuf@gmail.com', 'LOGOUT', 'Users', 'USR-0001', 'admin'),
	(82, '2026-10-17 09:16:51+04', 'tehsuf@gmail.com', 'LOGIN', 'Users', 'USR-0003', 'abu_daffa'),
	(83, '2026-10-17 09:24:59+04', 'tehsuf@gmail.com', 'LOGOUT', 'Users', 'USR-0003', 'abu_daffa'),
	(84, '2026-10-17 09:25:15+04', 'tehsuf@gmail.com', 'LOGIN', 'Users', 'USR-0004', 'adjit'),
	(85, '2026-10-17 09:26:35+04', 'tehsuf@gmail.com', 'DELETE', 'Projects', 'PRJ-0007', ''),
	(86, '2026-10-17 09:27:29+04', 'tehsuf@gmail.com', 'LOGOUT', 'Users', 'USR-0004', 'adjit'),
	(87, '2026-10-17 09:27:43+04', 'tehsuf@gmail.com', 'LOGIN', 'Users', 'USR-0003', 'abu_daffa'),
	(88, '2026-10-17 09:29:17+04', 'tehsuf@gmail.com', 'LOGOUT', 'Users', 'USR-0003', 'abu_daffa'),
	(89, '2026-10-17 10:01:49+04', 'tehsuf@gmail.com', 'LOGIN', 'Users', 'USR-0003', 'abu_daffa'),
	(90, '2026-10-17 10:02:15+04', 'tehsuf@gmail.com', 'LOGOUT', 'Users', 'USR-0003', 'abu_daffa'),
	(91, '2026-10-17 10:02:27+04', 'tehsuf@gmail.com', 'LOGIN', 'Users', 'USR-0001', 'admin'),
	(92, '2026-10-17 10:04:19+04', 'tehsuf@gmail.com', 'CHANGE_PASSWORD', 'Users', 'USR-0001', 'admin'),
	(93, '2026-10-17 10:05:05+04', 'tehsuf@gmail.com', 'CREATE', 'Users', 'USR-0006', 'abu_ahyar'),
	(94, '2026-10-17 10:05:31+04', 'tehsuf@gmail.com', 'CREATE', 'Users', 'USR-0007', 'abu_rayyan'),
	(95, '2026-10-17 10:54:27+04', 'anon', 'LOGIN', 'Users', 'USR-0007', 'abu_rayyan'),
	(96, '2026-10-17 11:26:26+04', 'anon', 'LOGIN', 'Users', 'USR-0003', 'abu_daffa'),
	(97, '2026-10-17 13:03:53+04', 'anon', 'LOGOUT', 'Users', 'USR-0007', 'abu_rayyan'),
	(98, '2026-10-17 13:04:45+04', 'anon', 'LOGIN', 'Users', 'USR-0005', 'jit'),
	(99, '2026-10-17 13:05:35+04', 'anon', 'LOGOUT', 'Users', 'USR-0005', 'jit'),
	(100, '2026-10-17 13:06:07+04', 'anon', 'LOGIN', 'Users', 'USR-0001', 'admin'),
	(101, '2026-10-17 13:09:41+04', 'anon', 'LOGOUT', 'Users', 'USR-0001', 'admin'),
	(102, '2026-10-17 17:52:28.614733+04', 'adjit', 'LOGIN', 'Users', 'USR-0004', '2026-10-17 20:52:28 | adjit'),
	(103, '2026-10-17 17:53:33.921049+04', 'adjit', 'LOGOUT', 'Users', 'USR-0004', '2026-10-17 20:53:33 | adjit'),
	(104, '2026-10-17 17:53:41.085995+04', 'abu_ahyar', 'LOGIN', 'Users', 'USR-0006', '2026-10-17 20:53:41 | abu_ahyar'),
	(105, '2026-10-17 17:54:19.564582+04', 'abu_ahyar', 'LOGOUT', 'Users', 'USR-0006', '2026-10-17 20:54:19 | abu_ahyar'),
	(106, '2026-10-17 17:54:24.956932+04', 'jit', 'LOGIN', 'Users', 'USR-0005', '2026-10-17 20:54:24 | jit'),
	(107, '2026-10-17 17:55:19.173193+04', 'jit', 'LOGOUT', 'Users', 'USR-0005', '2026-10-17 20:55:19 | jit'),
	(108, '2026-10-17 17:55:30.740059+04', 'adjit', 'LOGIN', 'Users', 'USR-0004', '2026-10-17 20:55:30 | adjit'),
	(109, '2026-10-17 19:31:10.512434+04', 'adjit', 'LOGOUT', 'Users', 'USR-0004', '2026-10-17 22:31:10 | adjit'),
	(110, '2026-10-17 19:31:15.73284+04', 'jit', 'LOGIN', 'Users', 'USR-0005', '2026-10-17 22:31:15 | jit'),
	(111, '2026-10-17 20:01:09.822114+04', 'jit', 'LOGOUT', 'Users', 'USR-0005', '2026-10-17 23:01:09 | jit'),
	(112, '2026-10-17 20:01:20.525543+04', 'adjit', 'LOGIN', 'Users', 'USR-0004', '2026-10-17 23:01:20 | adjit'),
	(113, '2026-10-17 20:40:23.961102+04', 'adjit', 'LOGOUT', 'Users', 'USR-0004', '2026-10-17 23:40:23 | adjit'),
	(114, '2026-10-17 20:40:37.424821+04', 'jit', 'LOGIN', 'Users', 'USR-0005', '2026-10-17 23:40:37 | jit'),
	(115, '2026-10-17 20:55:22.014555+04', 'jit', 'CREATE', 'Projects', 'PRJ-0007', '2026-10-17 23:55:22 | [Dummy] Shutdown job for Reactor R-400, PT.CAPC'),
	(116, '2026-10-17 20:57:29.146253+04', 'jit', 'CREATE', 'Projects', 'PRJ-0008', '2026-10-17 23:57:29 | Repair Annular Plate & Asphalt Tank PPU, PT.CAPC'),
	(117, '2026-10-17 21:21:06.300814+04', 'jit', 'CREATE', 'ProjectLedger', '2', '2026-10-18 00:21:06 | Kredit 40525475'),
	(118, '2026-10-17 21:21:40.353402+04', 'jit', 'CREATE', 'ProjectLedger', '3', '2026-10-18 00:21:40 | Kredit 450000'),
	(119, '2026-10-17 21:22:17.631526+04', 'jit', 'CREATE', 'ProjectLedger', '4', '2026-10-18 00:22:17 | Kredit 6852583'),
	(120, '2026-10-17 21:22:42.542733+04', 'jit', 'CREATE', 'ProjectLedger', '5', '2026-10-18 00:22:42 | Kredit 18135000'),
	(121, '2026-10-17 21:23:13.173814+04', 'jit', 'CREATE', 'ProjectLedger', '6', '2026-10-18 00:23:13 | Kredit 10000000'),
	(122, '2026-10-17 21:23:53.56635+04', 'jit', 'CREATE', 'ProjectLedger', '7', '2026-10-18 00:23:53 | Debet 152000000'),
	(123, '2026-10-17 21:24:20.244212+04', 'jit', 'CREATE', 'ProjectLedger', '8', '2026-10-18 00:24:20 | Debet 16720000'),
	(124, '2026-10-17 21:24:51.721665+04', 'jit', 'CREATE', 'ProjectLedger', '9', '2026-10-18 00:24:51 | Kredit 16720000'),
	(125, '2026-10-17 21:25:12.880835+04', 'jit', 'CREATE', 'ProjectLedger', '10', '2026-10-18 00:25:12 | Debet 3040000'),
	(126, '2026-10-17 21:25:25.282752+04', 'jit', 'UPDATE', 'ProjectLedger', '10', '2026-10-18 00:25:25 | Kredit 3040000'),
	(127, '2026-10-17 21:48:15.521955+04', 'jit', 'LOGOUT', 'Users', 'USR-0005', '2026-10-18 00:48:15 | jit'),
	(128, '2026-10-17 21:48:22.174834+04', 'adjit', 'LOGIN', 'Users', 'USR-0004', '2026-10-18 00:48:22 | adjit'),
	(129, '2026-10-17 21:51:55.3734+04', 'adjit', 'LOGOUT', 'Users', 'USR-0004', '2026-10-18 00:51:55 | adjit'),
	(130, '2026-10-17 21:52:27.8853+04', 'abu_rayyan', 'LOGIN', 'Users', 'USR-0007', '2026-10-18 00:52:27 | abu_rayyan'),
	(131, '2026-10-17 22:11:08.704837+04', 'abu_rayyan', 'LOGOUT', 'Users', 'USR-0007', '2026-10-18 01:11:08 | abu_rayyan'),
	(132, '2026-10-17 22:11:16.861618+04', 'adjit', 'LOGIN', 'Users', 'USR-0004', '2026-10-18 01:11:16 | adjit'),
	(133, '2026-10-17 22:12:12.344606+04', 'adjit', 'LOGOUT', 'Users', 'USR-0004', '2026-10-18 01:12:12 | adjit'),
	(134, '2026-10-17 22:12:18.172701+04', 'jit', 'LOGIN', 'Users', 'USR-0005', '2026-10-18 01:12:18 | jit'),
	(135, '2026-10-17 22:18:54.393997+04', 'jit', 'LOGOUT', 'Users', 'USR-0005', '2026-10-18 01:18:54 | jit'),
	(136, '2026-10-17 22:19:02.047037+04', 'adjit', 'LOGIN', 'Users', 'USR-0004', '2026-10-18 01:19:02 | adjit'),
	(137, '2026-10-17 22:24:06.196539+04', 'adjit', 'CREATE', 'ProjectFunding', 'PF-0019', '2026-10-18 01:24:06 | 30000000'),
	(138, '2026-10-17 22:24:52.390903+04', 'adjit', 'DELETE', 'ProjectFunding', 'PF-0019', '2026-10-18 01:24:52 | '),
	(139, '2026-10-18 08:10:14.250208+04', 'abu_daffa', 'LOGIN', 'Users', 'USR-0003', '2026-10-18 11:10:14 | abu_daffa'),
	(140, '2026-10-18 08:10:17.956795+04', 'abu_daffa', 'LOGOUT', 'Users', 'USR-0003', '2026-10-18 11:10:17 | abu_daffa'),
	(141, '2026-10-18 08:11:44.886419+04', 'abu_ahyar', 'LOGIN', 'Users', 'USR-0006', '2026-10-18 11:11:44 | abu_ahyar'),
	(142, '2026-10-18 08:11:46.784021+04', 'abu_ahyar', 'LOGOUT', 'Users', 'USR-0006', '2026-10-18 11:11:46 | abu_ahyar'),
	(143, '2026-10-18 08:13:03.02167+04', 'admin', 'LOGIN', 'Users', 'USR-0001', '2026-10-18 11:13:03 | admin'),
	(144, '2026-10-18 08:13:30.784968+04', 'admin', 'LOGOUT', 'Users', 'USR-0001', '2026-10-18 11:13:30 | admin');
/*!40000 ALTER TABLE "audit_log" ENABLE KEYS */;

-- Dumping data for table public.capital_transactions: 6 rows
DELETE FROM "capital_transactions";
/*!40000 ALTER TABLE "capital_transactions" DISABLE KEYS */;
INSERT INTO "capital_transactions" ("id", "tanggal", "investor_id", "tipe", "jumlah", "catatan", "created_at") VALUES
	('CT-0001', '2026-04-01', 'INV-0001', 'Setor', 150000000, '', '2026-10-17 17:52:03.00405+04'),
	('CT-0002', '2026-04-01', 'INV-0002', 'Setor', 225000000, '', '2026-10-17 17:52:03.00405+04'),
	('CT-0003', '2026-04-01', 'INV-0003', 'Setor', 225000000, '', '2026-10-17 17:52:03.00405+04'),
	('CT-0004', '2024-08-01', 'INV-0003', 'Setor', 200000000, '', '2026-10-17 17:52:03.00405+04'),
	('CT-0005', '2024-08-01', 'INV-0001', 'Setor', 300000000, '', '2026-10-17 17:52:03.00405+04'),
	('CT-0006', '2024-08-01', 'INV-0002', 'Setor', 400000000, '', '2026-10-17 17:52:03.00405+04');
/*!40000 ALTER TABLE "capital_transactions" ENABLE KEYS */;

-- Dumping data for table public.counters: 8 rows
DELETE FROM "counters";
/*!40000 ALTER TABLE "counters" DISABLE KEYS */;
INSERT INTO "counters" ("name", "value") VALUES
	('Users', 7),
	('Investors', 3),
	('ThirdParties', 1),
	('CapitalTransactions', 6),
	('ProjectTransactions', 7),
	('ProfitDistributions', 18),
	('Projects', 8),
	('ProjectFunding', 19);
/*!40000 ALTER TABLE "counters" ENABLE KEYS */;

-- Dumping data for table public.investors: 3 rows
DELETE FROM "investors";
/*!40000 ALTER TABLE "investors" DISABLE KEYS */;
INSERT INTO "investors" ("id", "nama", "kontak", "rekening", "status", "tanggal_daftar", "catatan", "created_at") VALUES
	('INV-0001', 'Abu Daffa', '8780123456', '13000123456', 'Aktif', '2026-10-16', '', '2026-10-17 17:52:02.997454+04'),
	('INV-0002', 'Abu Rayyan', '8780789456', '1300789456', 'Aktif', '2026-10-16', '', '2026-10-17 17:52:02.997454+04'),
	('INV-0003', 'Abu Ahyar', '8780159357', '13000159357', 'Aktif', '2026-10-16', '', '2026-10-17 17:52:02.997454+04');
/*!40000 ALTER TABLE "investors" ENABLE KEYS */;

-- Dumping data for table public.login_attempts: 1 rows
DELETE FROM "login_attempts";
/*!40000 ALTER TABLE "login_attempts" DISABLE KEYS */;
INSERT INTO "login_attempts" ("username", "count", "last_attempt_at", "locked_until") VALUES
	('jiy', 1, '2026-10-17 20:40:29.249+04', NULL);
/*!40000 ALTER TABLE "login_attempts" ENABLE KEYS */;

-- Dumping data for table public.profit_distributions: 18 rows
DELETE FROM "profit_distributions";
/*!40000 ALTER TABLE "profit_distributions" DISABLE KEYS */;
INSERT INTO "profit_distributions" ("id", "project_id", "investor_id", "porsi", "jumlah_laba", "tanggal", "catatan", "created_at") VALUES
	('PD-0001', 'PRJ-0001', 'INV-0001', 30.0000, 30000000, '2026-10-16', 'Bagi hasil proyek Pembuatan Dapur MBG di Kp. Sawah, Tangerang', '2026-10-17 17:52:03.012422+04'),
	('PD-0002', 'PRJ-0001', 'INV-0002', 40.0000, 40000000, '2026-10-16', 'Bagi hasil proyek Pembuatan Dapur MBG di Kp. Sawah, Tangerang', '2026-10-17 17:52:03.012422+04'),
	('PD-0003', 'PRJ-0001', 'INV-0003', 30.0000, 30000000, '2026-10-16', 'Bagi hasil proyek Pembuatan Dapur MBG di Kp. Sawah, Tangerang', '2026-10-17 17:52:03.012422+04'),
	('PD-0004', 'PRJ-0002', 'INV-0003', 22.2222, 4943079, '2026-10-16', 'Bagi hasil proyek Akumulasi Project di PT.Sulfindo & PT.CAPC Periode 2024/2025', '2026-10-17 17:52:03.012422+04'),
	('PD-0005', 'PRJ-0002', 'INV-0001', 33.3333, 7414619, '2026-10-16', 'Bagi hasil proyek Akumulasi Project di PT.Sulfindo & PT.CAPC Periode 2024/2025', '2026-10-17 17:52:03.012422+04'),
	('PD-0006', 'PRJ-0002', 'INV-0002', 44.4444, 9886158, '2026-10-16', 'Bagi hasil proyek Akumulasi Project di PT.Sulfindo & PT.CAPC Periode 2024/2025', '2026-10-17 17:52:03.012422+04'),
	('PD-0007', 'PRJ-0003', 'INV-0002', 44.4444, 108463293, '2026-10-16', 'Bagi hasil proyek Repair Asphalt Foundation, PT.CAPC', '2026-10-17 17:52:03.012422+04'),
	('PD-0008', 'PRJ-0003', 'INV-0001', 33.3333, 81347470, '2026-10-16', 'Bagi hasil proyek Repair Asphalt Foundation, PT.CAPC', '2026-10-17 17:52:03.012422+04'),
	('PD-0009', 'PRJ-0003', 'INV-0003', 22.2222, 54231647, '2026-10-16', 'Bagi hasil proyek Repair Asphalt Foundation, PT.CAPC', '2026-10-17 17:52:03.012422+04'),
	('PD-0010', 'PRJ-0004', 'INV-0001', 33.3333, 1802267, '2026-10-16', 'Bagi hasil proyek Additional Motor 75 Kw Dermaga Jetty2, PT.Multimas', '2026-10-17 17:52:03.012422+04'),
	('PD-0011', 'PRJ-0004', 'INV-0002', 44.4444, 2403022, '2026-10-16', 'Bagi hasil proyek Additional Motor 75 Kw Dermaga Jetty2, PT.Multimas', '2026-10-17 17:52:03.012422+04'),
	('PD-0012', 'PRJ-0004', 'INV-0003', 22.2222, 1201511, '2026-10-16', 'Bagi hasil proyek Additional Motor 75 Kw Dermaga Jetty2, PT.Multimas', '2026-10-17 17:52:03.012422+04'),
	('PD-0013', 'PRJ-0005', 'INV-0002', 44.4444, 12977234, '2026-10-16', 'Bagi hasil proyek Repair Annular Plate & Asphalt Tank, PT.CAPC', '2026-10-17 17:52:03.012422+04'),
	('PD-0014', 'PRJ-0005', 'INV-0001', 33.3333, 9732926, '2026-10-16', 'Bagi hasil proyek Repair Annular Plate & Asphalt Tank, PT.CAPC', '2026-10-17 17:52:03.012422+04'),
	('PD-0015', 'PRJ-0005', 'INV-0003', 22.2222, 6488617, '2026-10-16', 'Bagi hasil proyek Repair Annular Plate & Asphalt Tank, PT.CAPC', '2026-10-17 17:52:03.012422+04'),
	('PD-0016', 'PRJ-0006', 'INV-0001', 25.0000, 12246256, '2026-10-17', 'Bagi hasil proyek ShutDown UIC', '2026-10-17 17:52:03.012422+04'),
	('PD-0017', 'PRJ-0006', 'INV-0002', 37.5000, 18369384, '2026-10-17', 'Bagi hasil proyek ShutDown UIC', '2026-10-17 17:52:03.012422+04'),
	('PD-0018', 'PRJ-0006', 'INV-0003', 37.5000, 18369384, '2026-10-17', 'Bagi hasil proyek ShutDown UIC', '2026-10-17 17:52:03.012422+04');
/*!40000 ALTER TABLE "profit_distributions" ENABLE KEYS */;

-- Dumping data for table public.projects: 8 rows
DELETE FROM "projects";
/*!40000 ALTER TABLE "projects" DISABLE KEYS */;
INSERT INTO "projects" ("id", "nama", "pihak_ketiga_id", "tanggal_mulai", "tanggal_selesai_rencana", "tanggal_selesai_aktual", "status", "catatan", "created_at") VALUES
	('PRJ-0001', '(DUMMY) Pembuatan Dapur MBG di Kp. Sawah, Tangerang', 'TP-0001', '2026-10-18', '2027-04-18', '2026-10-16', 'Ditutup', '**--Dummy Project--**', '2026-10-17 17:52:03.000827+04'),
	('PRJ-0002', 'Akumulasi Project di PT.Sulfindo & PT.CAPC Periode 2024/2025', 'TP-0001', '2024-08-03', '2025-07-30', '2026-10-16', 'Ditutup', '', '2026-10-17 17:52:03.000827+04'),
	('PRJ-0003', 'Repair Asphalt Foundation, PT.CAPC', 'TP-0001', '2025-07-17', '2025-10-20', '2026-10-16', 'Ditutup', '', '2026-10-17 17:52:03.000827+04'),
	('PRJ-0004', 'Additional Motor 75 Kw Dermaga Jetty2, PT.Multimas', 'TP-0001', '2025-07-02', '2025-08-27', '2026-10-16', 'Ditutup', '', '2026-10-17 17:52:03.000827+04'),
	('PRJ-0005', 'Repair Annular Plate & Asphalt Tank, PT.CAPC', 'TP-0001', '2026-01-29', '2026-03-27', '2026-10-16', 'Ditutup', '', '2026-10-17 17:52:03.000827+04'),
	('PRJ-0006', 'ShutDown UIC', 'TP-0001', '2026-05-01', '2026-07-31', NULL, 'Selesai', '', '2026-10-17 17:52:03.000827+04'),
	('PRJ-0007', '[Dummy] Shutdown job for Reactor R-400, PT.CAPC', 'TP-0001', '2026-10-24', '2026-11-23', NULL, 'Draft', '', '2026-10-17 20:55:22.005986+04'),
	('PRJ-0008', 'Repair Annular Plate & Asphalt Tank PPU, PT.CAPC', 'TP-0001', '2026-01-29', '2026-03-27', NULL, 'Berjalan', '', '2026-10-17 20:57:29.144833+04');
/*!40000 ALTER TABLE "projects" ENABLE KEYS */;

-- Dumping data for table public.project_funding: 18 rows
DELETE FROM "project_funding";
/*!40000 ALTER TABLE "project_funding" DISABLE KEYS */;
INSERT INTO "project_funding" ("id", "project_id", "investor_id", "jumlah", "tanggal", "status", "created_at") VALUES
	('PF-0001', 'PRJ-0001', 'INV-0001', 150000000, '2026-10-15', 'Dibebaskan', '2026-10-17 17:52:03.006794+04'),
	('PF-0002', 'PRJ-0001', 'INV-0002', 200000000, '2026-10-15', 'Dibebaskan', '2026-10-17 17:52:03.006794+04'),
	('PF-0003', 'PRJ-0001', 'INV-0003', 150000000, '2026-10-15', 'Dibebaskan', '2026-10-17 17:52:03.006794+04'),
	('PF-0004', 'PRJ-0002', 'INV-0003', 200000000, '2024-08-01', 'Dibebaskan', '2026-10-17 17:52:03.006794+04'),
	('PF-0005', 'PRJ-0002', 'INV-0001', 300000000, '2024-08-01', 'Dibebaskan', '2026-10-17 17:52:03.006794+04'),
	('PF-0006', 'PRJ-0002', 'INV-0002', 400000000, '2024-08-01', 'Dibebaskan', '2026-10-17 17:52:03.006794+04'),
	('PF-0007', 'PRJ-0003', 'INV-0002', 400000000, '2025-07-12', 'Dibebaskan', '2026-10-17 17:52:03.006794+04'),
	('PF-0008', 'PRJ-0003', 'INV-0001', 300000000, '2025-07-12', 'Dibebaskan', '2026-10-17 17:52:03.006794+04'),
	('PF-0009', 'PRJ-0003', 'INV-0003', 200000000, '2025-07-12', 'Dibebaskan', '2026-10-17 17:52:03.006794+04'),
	('PF-0010', 'PRJ-0004', 'INV-0001', 300000000, '2026-07-01', 'Dibebaskan', '2026-10-17 17:52:03.006794+04'),
	('PF-0011', 'PRJ-0004', 'INV-0002', 400000000, '2026-07-01', 'Dibebaskan', '2026-10-17 17:52:03.006794+04'),
	('PF-0012', 'PRJ-0004', 'INV-0003', 200000000, '2026-07-01', 'Dibebaskan', '2026-10-17 17:52:03.006794+04'),
	('PF-0013', 'PRJ-0005', 'INV-0002', 400000000, '2026-01-01', 'Dibebaskan', '2026-10-17 17:52:03.006794+04'),
	('PF-0014', 'PRJ-0005', 'INV-0001', 300000000, '2026-01-01', 'Dibebaskan', '2026-10-17 17:52:03.006794+04'),
	('PF-0015', 'PRJ-0005', 'INV-0003', 200000000, '2026-01-01', 'Dibebaskan', '2026-10-17 17:52:03.006794+04'),
	('PF-0016', 'PRJ-0006', 'INV-0001', 150000000, '2026-10-17', 'Aktif', '2026-10-17 17:52:03.006794+04'),
	('PF-0017', 'PRJ-0006', 'INV-0002', 225000000, '2026-10-17', 'Aktif', '2026-10-17 17:52:03.006794+04'),
	('PF-0018', 'PRJ-0006', 'INV-0003', 225000000, '2026-10-17', 'Aktif', '2026-10-17 17:52:03.006794+04');
/*!40000 ALTER TABLE "project_funding" ENABLE KEYS */;

-- Dumping data for table public.project_ledgers: 9 rows
DELETE FROM "project_ledgers";
/*!40000 ALTER TABLE "project_ledgers" DISABLE KEYS */;
INSERT INTO "project_ledgers" ("id", "project_id", "tanggal", "jenis", "nominal", "keterangan", "created_at", "deskripsi") VALUES
	(2, 'PRJ-0008', '2026-01-29', 'Kredit', 40525475, '', '2026-10-17 21:21:06.291571+04', 'Operasional CAP Per. January - March 2026'),
	(3, 'PRJ-0008', '2026-03-26', 'Kredit', 450000, '', '2026-10-17 21:21:40.351624+04', 'PPE CAP Per. January - March 2026'),
	(4, 'PRJ-0008', '2026-03-05', 'Kredit', 6852583, '', '2026-10-17 21:22:17.630031+04', 'THR Repair Annular Plate & Asphalt Tank PPU Per. March 2026'),
	(5, 'PRJ-0008', '2026-03-17', 'Kredit', 18135000, '', '2026-10-17 21:22:42.54125+04', 'Gaji Repair Annular Plate & Asphalt Tank PPU Per. 21 February 2026 - 13 March 2026'),
	(6, 'PRJ-0008', '2026-03-27', 'Kredit', 10000000, '', '2026-10-17 21:23:13.172449+04', 'Biaya Staff JIT'),
	(7, 'PRJ-0008', '2026-03-27', 'Debet', 152000000, '', '2026-10-17 21:23:53.564726+04', 'Inv.  Repair Annular Plate & Asphalt Tank PPU'),
	(8, 'PRJ-0008', '2026-03-27', 'Debet', 16720000, '', '2026-10-17 21:24:20.241938+04', 'PPN 12% (Inv.  Repair Annular Plate & Asphalt Tank PPU)'),
	(9, 'PRJ-0008', '2026-03-27', 'Kredit', 16720000, '', '2026-10-17 21:24:51.720127+04', 'PPN 12% (Inv. Repair Annular Plate & Asphalt Tank PPU)'),
	(10, 'PRJ-0008', '2026-03-27', 'Kredit', 3040000, '', '2026-10-17 21:25:12.879204+04', 'PPH 23 2% ( Repair Annular Plate & Asphalt Tank PPU)');
/*!40000 ALTER TABLE "project_ledgers" ENABLE KEYS */;

-- Dumping data for table public.project_transactions: 6 rows
DELETE FROM "project_transactions";
/*!40000 ALTER TABLE "project_transactions" DISABLE KEYS */;
INSERT INTO "project_transactions" ("id", "project_id", "tanggal", "tipe", "jumlah", "keterangan", "created_at") VALUES
	('PT-0001', 'PRJ-0001', '2026-10-16', 'Pendapatan', 100000000, 'Profit setelah 6 bulan', '2026-10-17 17:52:03.009571+04'),
	('PT-0003', 'PRJ-0002', '2025-07-30', 'Pendapatan', 22243856, 'Sharing Profit 40%', '2026-10-17 17:52:03.009571+04'),
	('PT-0004', 'PRJ-0003', '2026-10-16', 'Pendapatan', 244042410, 'Sharing Profit 40%', '2026-10-17 17:52:03.009571+04'),
	('PT-0005', 'PRJ-0004', '2026-08-30', 'Pendapatan', 5406800, 'Sharing Profit 40%', '2026-10-17 17:52:03.009571+04'),
	('PT-0006', 'PRJ-0005', '2026-03-30', 'Pendapatan', 29198777, 'Sharing Profit 40%', '2026-10-17 17:52:03.009571+04'),
	('PT-0007', 'PRJ-0006', '2026-10-17', 'Pendapatan', 48985024, 'profit dari proyek', '2026-10-17 17:52:03.009571+04');
/*!40000 ALTER TABLE "project_transactions" ENABLE KEYS */;

-- Dumping data for table public.sessions: 0 rows
DELETE FROM "sessions";
/*!40000 ALTER TABLE "sessions" DISABLE KEYS */;
/*!40000 ALTER TABLE "sessions" ENABLE KEYS */;

-- Dumping data for table public.third_parties: 1 rows
DELETE FROM "third_parties";
/*!40000 ALTER TABLE "third_parties" DISABLE KEYS */;
INSERT INTO "third_parties" ("id", "nama", "kontak", "catatan", "created_at") VALUES
	('TP-0001', 'JIT', '8123456789', 'Serang, Banten', '2026-10-17 17:52:02.999201+04');
/*!40000 ALTER TABLE "third_parties" ENABLE KEYS */;

-- Dumping data for table public.users: 6 rows
DELETE FROM "users";
/*!40000 ALTER TABLE "users" DISABLE KEYS */;
INSERT INTO "users" ("id", "username", "password_hash", "salt", "hash_algo", "nama", "role", "investor_id", "third_party_id", "status", "tanggal_dibuat", "last_login", "catatan", "created_at", "updated_at") VALUES
	('USR-0007', 'abu_rayyan', '$2a$10$NrtjnHeUCI..qtNyYb.gpewzs.rI17M4U/IWH7gLp0tkaWinH9K/C', '', 'bcrypt', 'Abu Rayyan', 'investor', 'INV-0002', NULL, 'Aktif', '2026-10-17', '2026-10-17 21:52:27.815+04', '', '2026-10-17 17:52:02.988317+04', '2026-10-17 17:52:02.988317+04'),
	('USR-0005', 'jit', '$2a$10$xn5f4kjWqKV/akS4UpqJc.Vibm.BUIOAby9QGJwJbAcpB/K0c4IZ.', '', 'bcrypt', 'PT.JIT', 'client', NULL, 'TP-0001', 'Aktif', '2026-10-17', '2026-10-17 22:12:18.167+04', '', '2026-10-17 17:52:02.988317+04', '2026-10-17 17:52:02.988317+04'),
	('USR-0004', 'adjit', '$2a$10$BqQELp3RWuH79//wi3N0xeF32HrlikAYEPBNwOSablspSwAuHDHCy', '', 'bcrypt', 'AdjitPro Opr', 'operator', NULL, NULL, 'Aktif', '2026-10-17', '2026-10-17 22:19:02.035+04', '', '2026-10-17 17:52:02.988317+04', '2026-10-17 17:52:02.988317+04'),
	('USR-0003', 'abu_daffa', '$2a$10$ugbixjuTetakvRxgKUvjte2sFxGOmm0hQivbeIvu81hJCbcw/cqd6', '', 'bcrypt', 'Abu Daffa', 'investor', 'INV-0001', NULL, 'Aktif', '2026-10-17', '2026-10-18 08:10:14.173+04', '', '2026-10-17 17:52:02.988317+04', '2026-10-17 17:52:02.988317+04'),
	('USR-0006', 'abu_ahyar', '$2a$10$Qr8cl2ssE3kDpP5Mm9w2x.qlK7NQPCR5n6UunZkG7dc2H5e4Z28mC', '', 'bcrypt', 'Abu Ahyar', 'investor', 'INV-0003', NULL, 'Aktif', '2026-10-17', '2026-10-18 08:11:44.872+04', '', '2026-10-17 17:52:02.988317+04', '2026-10-17 17:52:02.988317+04'),
	('USR-0001', 'admin', '$2a$10$Qr8cl2ssE3kDpP5Mm9w2x.qlK7NQPCR5n6UunZkG7dc2H5e4Z28mC', '', 'bcrypt', 'Administrator', 'admin', NULL, NULL, 'Aktif', '2026-10-17', '2026-10-18 08:13:03.014+04', '', '2026-10-17 17:50:59.852045+04', '2026-10-17 17:50:59.852045+04');
/*!40000 ALTER TABLE "users" ENABLE KEYS */;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
