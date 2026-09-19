<?php
$host = "localhost";
$user = "root";
$password = "K34m4n4n!";
$dbname = "absen";

$conn = new mysqli($host, $user, $password, $dbname);
if ($conn->connect_error) {
    die(json_encode(["success" => false, "message" => "Koneksi gagal: " . $conn->connect_error]));
}
?>
