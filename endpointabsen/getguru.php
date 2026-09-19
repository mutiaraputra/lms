<?php
include 'config.php';
header('Content-Type: application/json');

// Query data guru
$sql = "SELECT id_guru, nama_guru FROM tabel_guru ORDER BY nama_guru ASC";
$result = $conn->query($sql);

$guru = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $guru[] = $row;
    }
}

echo json_encode(["status" => "success", "data" => $guru]);

$conn->close();
?>
