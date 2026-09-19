<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Guru</title>
    <link rel="stylesheet" type="text/css" href="<?= base_url() ?>assets/css/bootstrap.min.css">
    <link rel="stylesheet" type="text/css" href="<?= base_url() ?>assets/css/fontawesome-all.min.css">
    <link rel="stylesheet" type="text/css" href="<?= base_url() ?>assets/css/iofrm-style.css">
    <link rel="stylesheet" type="text/css" href="<?= base_url() ?>assets/css/iofrm-theme4.css">
    <style>
        body {
            background: rgba(51, 209, 110, 0.58);
        }
        .form-content {
            background: linear-gradient(to bottom, rgba(175, 238, 250, 0.31), rgba(51, 209, 110, 0.58));
        }
        .img-holder {
            background: rgba(51, 209, 110, 0.58);
        }
        .back-homepage {
            position: absolute;
            top: 20px;
            left: 20px;
            font-size: 18px;
            color: blue;
            text-decoration: none;
            display: flex;
            align-items: center;
        }
        .back-homepage i {
            margin-right: 8px;
            font-size: 20px;
        }
    </style>
</head>

<body>
    <div class="form-body">
        <div class="img-holder">
                <div class="info-holder">
                    <img src="<?= base_url() ?>assets/images/absenguru.png" alt="">
                </div>
            </div>
        <div class="row">
            <div class="form-holder">
                <div class="form-content">
                    <!-- Back to Homepage Button -->
                    <a href="../../../../lms" class="back-homepage">
                        ⬅ Kembali ke Homepage
                    </a>
                    <div class="form-items">
                        <h3 class="tulisanlogin">Login Presensi</h3>
                        <div class="kotakalert">
                            <?php if ($this->session->flashdata('flash')) : ?>
                                <div class="alert alert-<?= $this->session->flashdata('flash')['alert'] ?> alert-dismissible fade show" role="alert">
                                    <strong><?= $this->session->flashdata('flash')['alert'] ?> </strong> <?= $this->session->flashdata('flash')['message'] ?>
                                    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                                        <span aria-hidden="true">&times;</span>
                                    </button>
                                </div>
                                <?php endif; ?>
                        </div>
                        <div class="gifloading"></div>
                        <div class="kotaklogin">

                            <div class="page-links">
                                <a href="login4.html" class="active">Sebagai Guru</a>
                            </div>
                            <form>
                                <input class="form-control nomorinduk" type="number" name="username" placeholder="NIK Guru" required>
                                <span class="infonik"></span>
                                <input class="form-control password" type="password" name="password" placeholder="Password" required>
                                <span class="infopassword"></span>
                                <div class="form-button">
                                    <button id="submit" type="submit" class="ibtn buttonlogin">Login</button>
                                    <!-- <a href="forget4.html">Lupa password?</a> -->
                                    <a href="<?= base_url('teacher/auth/linked_account') ?>">Daftarkan NIK</a>
                                    <!-- <a href="<?= base_url('teacher/auth/verif_email') ?>">Aktivasi email ?</a> -->
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
    <script src="<?= base_url() ?>assets/js/jquery.min.js"></script>
    <script src="<?= base_url() ?>assets/js/popper.min.js"></script>
    <script src="<?= base_url() ?>assets/js/bootstrap.min.js"></script>
    <script src="<?= base_url() ?>assets/js/main.js"></script>
</body>

</html>
<script>
    $('.buttonlogin').click(function(e) {
        e.preventDefault();
        let nik = $('.nomorinduk').val();
        let password = $('.password').val();
        if (nik.length < 4) {
            $('.infonik').html('<small class="error-message">Nik harus 4 digit</small>');
        } else {
            $('.kotaklogin').hide();
            $('.tulisankecil').hide();
            $('.tulisanlogin').html('Memproses Login...')
            $('.gifloading').html('<img src="<?= base_url() ?>assets/img/loading.gif">');
            $.ajax({
                type: 'POST',
                url: "<?php echo base_url(); ?>ajax/login_guru",
                data: {
                    nik: nik,
                    password: password
                },
                dataType: 'json',
                process: function() {},
                success: function(data) {
                    if (data.status == false) {
                        $('.kotaklogin').show();
                        $('.tulisankecil').show();
                        $('.tulisanlogin').html('Silahkan Login')
                        $('.gifloading').html('');
                        $('.kotakalert').html(`<div class="alert alert-danger alert-dismissible fade show" role="alert">
                            <strong>Gagal!</strong>${data.data}
                            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                            </div>`);
                    } else if (data.status == true) {
                        window.location.href = data.data;
                    }
                },
                error: function() {
                    $('.kotaklogin').show();
                    $('.tulisankecil').show();
                    $('.tulisanlogin').html('Silahkan Login')
                    $('.gifloading').html('');
                    $('.kotakalert').html(`<div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <strong>Gagal!</strong> Kesalahan system!
                        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                        </div>`);
                }
            });
        }
    })
</script>