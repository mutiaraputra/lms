<?php
include 'config.php';
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
date_default_timezone_set("Asia/Jakarta");

if (isset($_REQUEST['nik'])) {
	$nik       = $_REQUEST['nik'] ?? '';
	$jam_absen = $_REQUEST['jam_absen'] ?? date("H:i:s");
	$tanggal   = $_REQUEST['tanggal_absen'] ?? date("Y-m-d");
	$hari      = date("l", strtotime($tanggal));
} else {
    echo json_encode(["status" => "error", "message" => "Nik kosong"]);
    exit;
}

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
$masuk = 0;
$keluar = 0;
$ket = "";
$kt = "h";
// cek jadwal guru hari ini
$sqlJadwal = "SELECT * FROM tabel_jam_absen_guru WHERE nik='$nik' AND hari='$hariIndo' LIMIT 1";
$resJadwal = $conn->query($sqlJadwal);

if ($resJadwal->num_rows == 0) {
	$ket = "Cek lagi jadwal Anda";
    echo json_encode([
                "status" => "error", 
                "message" => "Jadwal tidak ada", 
                "data" => [
                    "nik" => $nik,
                    "jam_absen" => $jam_absen,
                    "tanggal" => $tanggal,
                    "masuk" => $masuk,
                    "keluar" => $keluar,
                    "keterangan" => $ket
                ]
            ]);
    exit;
}
$jadwal  = $resJadwal->fetch_assoc();
$mulai   = $jadwal['mulai'];
$selesai = $jadwal['selesai'];

// cek status absen hari ini
$sqlCek = "SELECT * FROM tabel_detail_absen_guru 
           WHERE nik='$nik' AND tanggal_absen='$tanggal' 
           ORDER BY id_detail DESC LIMIT 1";
$resCek = $conn->query($sqlCek);

$sudahMasuk = false;
$sudahKeluar = false;
$idAbsen = null;

if ($resCek->num_rows > 0) {
    $lastAbsen = $resCek->fetch_assoc();
    $idAbsen = $lastAbsen['id_detail'];

    if ($lastAbsen['masuk'] == 1 && $lastAbsen['keluar'] == 0) {
        $sudahMasuk = true;
    }
    if ($lastAbsen['masuk'] == 1 && $lastAbsen['keluar'] == 1) {
        $sudahMasuk = true;
        $sudahKeluar = true;
    }
}

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

        // simpan data baru (absen masuk)
        $sqlInsert = "INSERT INTO tabel_detail_absen_guru 
                        (jam_absen, tanggal_absen, nik, keterangan, masuk, keluar, ket_absen)
                      VALUES 
                        ('$jam_absen', '$tanggal', '$nik', '$kt', '$masuk', '$keluar', '$ket')";
        if ($conn->query($sqlInsert)) {
            echo json_encode([
                "status" => "success", 
                "message" => "Absen masuk berhasil", 
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
			$ket = "Cek koneksi server atau database";
			echo json_encode([
			"status" => "error", 
			"message" => "Absen masuk gagal", 
			"data" => [
				"nik" => $nik,
				"jam_absen" => $jam_absen,
				"tanggal" => $tanggal,
				"masuk" => $masuk,
				"keluar" => $keluar,
				"keterangan" => $ket
				]
			]);
        }
        exit;
    }
}

// logika absen keluar (UPDATE record yg sama)
if ($jam_absen >= $selesai) {
    if (!$sudahMasuk) {
        $ket = "Cek jadwal Anda dan pastikan sudah Absen masuk";
			echo json_encode([
			"status" => "error", 
			"message" => "Anda belum Absen masuk!", 
			"data" => [
				"nik" => $nik,
				"jam_absen" => $jam_absen,
				"tanggal" => $tanggal,
				"masuk" => $masuk,
				"keluar" => $keluar,
				"keterangan" => $ket
				]
			]);
        exit;
    }
    if ($sudahKeluar) {
        $ket = "Apakah Anda lupa tadi?";
			echo json_encode([
			"status" => "error", 
			"message" => "Anda sudah Absen keluar!", 
			"data" => [
				"nik" => $nik,
				"jam_absen" => $jam_absen,
				"tanggal" => $tanggal,
				"masuk" => $masuk,
				"keluar" => $keluar,
				"keterangan" => $ket
				]
			]);
        exit;
    }

    $keluar = 1;

    $sqlUpdate = "UPDATE tabel_detail_absen_guru 
                  SET keluar=1 WHERE id_detail='$idAbsen'";
    if ($conn->query($sqlUpdate)) {
		$ket = "Cek koneksi server atau database";
        echo json_encode([
            "status" => "success", 
            "message" => "Absen keluar berhasil", 
            "data" => [
                "nik" => $nik,
                "jam_absen" => $jam_absen,
                "tanggal" => $tanggal,
                "masuk" => 1,
                "keluar" => $keluar,
                "keterangan" => $ket
            ]
        ]);
    } else {
        $ket = "Cek koneksi server atau database";
			echo json_encode([
			"status" => "error", 
			"message" => "Absen keluar gagal", 
			"data" => [
				"nik" => $nik,
				"jam_absen" => $jam_absen,
				"tanggal" => $tanggal,
				"masuk" => $masuk,
				"keluar" => $keluar,
				"keterangan" => $ket
				]
			]);
    }
    exit;
}

$ket = "Cek waktu server atau database";
	echo json_encode([
	"status" => "error", 
	"message" => "Jam Absen tidak valid", 
	"data" => [
		"nik" => $nik,
		"jam_absen" => $jam_absen,
		"tanggal" => $tanggal,
		"masuk" => $masuk,
		"keluar" => $keluar,
		"keterangan" => $ket
		]
	]);
?>
