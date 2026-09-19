<?php
include 'config.php';
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
date_default_timezone_set("Asia/Jakarta");

$nik        = $_POST['nik'] ?? '';
$jam_absen  = $_POST['jam_absen'] ?? date("H:i:s");
$tanggal    = $_POST['tanggal_absen'] ?? date("Y-m-d");
$hari       = date("l", strtotime($tanggal));

$mapHari = [
    "Monday"    => "Senin",
    "Tuesday"   => "Selasa",
    "Wednesday" => "Rabu",
    "Thursday"  => "Kamis",
    "Friday"    => "Jumat",
    "Saturday"  => "Sabtu",
    "Sunday"    => "Minggu"
];
$hariIndo = $mapHari[$hari];

// cek jadwal guru hari ini
$sqlJadwal = "SELECT * FROM tabel_jam_absen_guru WHERE nik='$nik' AND hari='$hariIndo' LIMIT 1";
$resJadwal = $conn->query($sqlJadwal);

if ($resJadwal->num_rows == 0) {
    echo json_encode(["status" => "error", "message" => "Tidak ada jadwal untuk hari ini $nik"]);
    exit;
}
$jadwal  = $resJadwal->fetch_assoc();
$mulai   = $jadwal['mulai'];
$selesai = $jadwal['selesai'];

// cek status absen hari ini
$sqlCek = "SELECT * FROM tabel_detail_absen_guru 
           WHERE nik='$nik' AND tanggal_absen='$tanggal' 
           ORDER BY id DESC LIMIT 1";
$resCek = $conn->query($sqlCek);

$sudahMasuk = false;
$sudahKeluar = false;
if ($resCek->num_rows > 0) {
    $lastAbsen = $resCek->fetch_assoc();
    if ($lastAbsen['masuk'] == 1 && $lastAbsen['keluar'] == 0) {
        $sudahMasuk = true;
    }
    if ($lastAbsen['masuk'] == 1 && $lastAbsen['keluar'] == 1) {
        $sudahMasuk = true;
        $sudahKeluar = true;
    }
}

$masuk = 0;
$keluar = 0;
$ket = "";
$kt = "h";

// logika absen masuk
if ($jam_absen >= "05:00:00" && $jam_absen <= $selesai) {
    if (!$sudahMasuk) {
        if ($mulai == "07:00:00") {
            // ada toleransi 10 menit
            if ($jam_absen <= "07:10:00") {
                $masuk = 1;
                $ket = "Tepat Waktu (dengan toleransi)";
            } else {
                $masuk = 1;
                $telatMenit = round((strtotime($jam_absen) - strtotime("07:00:00")) / 60);
                $ket = "Terlambat $telatMenit menit";
            }
        } else {
            // tanpa toleransi
            if ($jam_absen <= $mulai) {
                $masuk = 1;
                $ket = "Tepat Waktu";
            } else {
                $masuk = 1;
                $telatMenit = round((strtotime($jam_absen) - strtotime($mulai)) / 60);
                $ket = "Terlambat $telatMenit menit";
            }
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Anda sudah absen masuk"]);
        exit;
    }
}


// logika absen keluar
if ($jam_absen >= $selesai) {
    if (!$sudahMasuk) {
        echo json_encode(["status" => "error", "message" => "Anda belum absen masuk"]);
        exit;
    }
    if ($sudahKeluar) {
        echo json_encode(["status" => "error", "message" => "Anda sudah absen keluar"]);
        exit;
    }
    $keluar = 1;
    $ket = "Pulang";
}

// simpan data
$sqlInsert = "INSERT INTO tabel_detail_absen_guru 
                (jam_absen, tanggal_absen, nik, keterangan, masuk, keluar, ket_absen)
              VALUES 
                ('$jam_absen', '$tanggal', '$nik', '$kt', '$masuk', '$keluar', '$ket')";
if ($conn->query($sqlInsert)) {
    echo json_encode([
        "status" => "success", 
        "message" => "Absen berhasil", 
        "data" => [
            "nik" => $nik,
            "jam_absen" => $jam_absen,
            "tanggal" => $tanggal,
            "masuk" => $masuk,
            "keluar" => $keluar,
            "keterangan" => $ket
        ]
    ]);
} else {
    echo json_encode(["status" => "error", "message" => "Gagal absen"]);
}
?>
