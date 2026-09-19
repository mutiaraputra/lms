<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Kartu Absen Siswa</title>
    <style>
        body {
            font-family: Arial, sans-serif;
        }
        .title-heading {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-top: 1px;
            margin-bottom: 10px;
        }
        .card {
            border: 2px solid #000;
            padding: 2px;
            width: 100%;
            max-width: 100%;
            margin: auto;
            text-align: center;
            border-radius: 5px;
        }
        .card img {
            border-radius: 5px;
            max-width: 100%;
            height: auto;
            margin-top: 30px;
            margin-bottom: 5px;
        }
        .container {
            padding: 5px;
        }
        .title {
            color: grey;
            font-size: 14px;
            margin-bottom: 5px;
        }
        h1 {
            font-size: 18px;
            margin: 5px 0;
        }
    </style>
</head>
<body>
<h2 class="title-heading">KARTU PRESENSI</h2>
    <div class="card">
        <img src="<?= $img ?>" alt="Foto Siswa">
        <div class="container">
            <h1><?= $user['nama_siswa'] ?></h1>
            <p class="title"><?= $user['nis_siswa'] ?></p>
        </div>
    </div>
</body>
</html>
