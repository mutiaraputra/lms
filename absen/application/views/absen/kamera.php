<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Absen</title>
    <!-- Favicon icon -->
    <link rel="icon" type="image/png" sizes="16x16" href="<?= base_url(); ?>assets/images/favicon.png">
    <link rel="stylesheet" href="<?= base_url(); ?>assets/vendor/chartist/css/chartist.min.css">
    <link href="<?= base_url(); ?>assets/vendor/bootstrap-select/dist/css/bootstrap-select.min.css" rel="stylesheet">
    <link href="<?= base_url(); ?>assets/vendor/owl-carousel/owl.carousel.css" rel="stylesheet">
    <link type="text/css" href="<?= base_url(); ?>assets/css/style.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&family=Roboto:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
    <!-- Datatable -->
    <link href="<?= base_url(); ?>assets/vendor/datatables/css/jquery.dataTables.min.css" rel="stylesheet">
    <script src="https://code.jquery.com/jquery-3.6.0.slim.js" integrity="sha256-HwWONEZrpuoh951cQD1ov2HUK5zA5DwJ1DNUXaM6FsY=" crossorigin="anonymous"></script>

    <style>
        .btn-absen {
            width: 100%;
            padding: 30px;
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
            border-radius: 10px;
        }
        .btn-absen-guru {
            background-color: #5cb85c;
            color: white;
        }
        .btn-absen-siswa {
            background-color: #337ab7;
            color: white;
        }
        .btn-absen:hover {
            opacity: 0.9;
        }
        .container-custom {
            max-width: 500px;
            margin-top: 50px;
            margin-bottom: 500px;
        }
        .footer {
        text-align: center;
        padding: 10px;
        }

    </style>
</head>

<body>
<div class="container container-custom">
    <h2 class="text-center">Tampilkan Kamera</h2>
    <a href="<?= base_url('Cameraguru') ?>" class="btn btn-absen btn-absen-guru">Absen Guru <span>&#x1F4F7;</span></a>
    <a href="<?= base_url('Camera') ?>" class="btn btn-absen btn-absen-siswa">Absen Siswa <span>&#x1F4F7;</span></button>
</div>

</body>
</html>