<?php
// Koneksi ke database
$servername = "localhost";
$username = "root"; // Sesuaikan dengan username database Anda
$password = "";     // Sesuaikan dengan password database Anda
$dbname = "learning"; // Sesuaikan dengan nama database Anda

// Membuat koneksi
$conn = new mysqli($servername, $username, $password, $dbname);

// Memeriksa koneksi
if ($conn->connect_error) {
    die("Koneksi gagal: " . $conn->connect_error);
}

// Data username dan password
$username = 'adm';
$password = 'adm2024';

// Meng-hash password menggunakan SHA-1
$hashed_password = sha1($password);

// Query untuk menyimpan data ke dalam tabel tb_admin
$sql = "INSERT INTO tb_admin (username, password) VALUES ('$username', '$hashed_password')";

// Menjalankan query
if ($conn->query($sql) === TRUE) {
    echo "Data berhasil disimpan ke dalam tabel tb_admin.";
} else {
    echo "Error: " . $sql . "<br>" . $conn->error;
}

// Menutup koneksi
$conn->close();
?>
