<!DOCTYPE html>
<html lang="en" class="h-100">

<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Login ! User</title>
    <!-- Favicon icon -->
    <link rel="icon" type="<?= base_url('assets/'); ?>image/png" sizes="16x16" href="<?= base_url('assets/'); ?>./images/favicon.png">
    <link href="<?= base_url('assets/'); ?>./css/style.css" rel="stylesheet">
    <link href="<?= base_url('assets/'); ?>https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&family=Roboto:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(to top, rgba(175, 238, 250, 0.31), rgba(51, 209, 110, 0.58));
            color: blue;
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

<body class="h-100">
     <!-- Back to Homepage Button -->
     <a href="../../../../lms" class="back-homepage">
        <i class="fa fa-arrow-left"></i> Kembali ke Homepage
    </a>
    <div class="authincation h-100">
        <div class="container h-100">
            <div class="row justify-content-center h-100 align-items-center">
                <div class="col-md-6">
                    <div class="authincation-content">
                        <div class="row no-gutters">
                            <div class="col-xl-12">
                                <div class="auth-form">
                                    <?= $this->session->flashdata('message'); ?>
                                    <h3 class="text-center mb-4 text-black">Absensi SMK Nagara</h3>
                                    <h4 class="text-center mb-4 text-black">Login Admin</h4>
                                    <form class="user" method="POST" action=" <?php echo base_url('Auth/index'); ?>">
                                        <input type="hidden" name="<?= $this->security->get_csrf_token_name() ?>" value="<?= $this->security->get_csrf_hash() ?>">
                                        <div class="form-group">
                                            <label class="mb-1 text-red"><strong>Email</strong></label>
                                            <input type="text" name="email" class="form-control" value=" <?= set_value('email'); ?>" required>
                                            <?= form_error('email', '<small class="text-danger pl-2">', '</small>'); ?>
                                        </div>
                                        <div class="form-group">
                                            <label class="mb-1 text-red"><strong>Password</strong></label>
                                            <input type="Password" name="password1" class="form-control" required>
                                            <?= form_error('password1', '<small class="text-danger pl-2">', '</small>'); ?>
                                        </div>
                                        <div class="form-row d-flex justify-content-between mt-4 mb-2">
                                            <div class="form-group">
                                                <!-- <a class="text-dark" href="#">Lupa Password?</a>
                                                <a class="text-dark" href="<?= base_url('auth/verif_email'); ?>">Verifikasi Email</a>-->
                                            </div>
                                        </div>
                                        <div class="text-center">
                                            <button type="submit" class="btn bg-light text-red btn-block">Masuk</button>
                                        </div>
                                    </form>
                                    <div class="new-account mt-3">
                                        <p class="text-dark">Tidak Punya Akun ? Daftar <a class="text-dark" href="<?= base_url('Auth/Regisration'); ?>">Buat Akun</a></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>


    <!--**********************************
        Scripts
    ***********************************-->
    <!-- Required vendors -->
    <script src="<?= base_url('assets/'); ?>./vendor/global/global.min.js"></script>
    <script src="<?= base_url('assets/'); ?>./vendor/bootstrap-select/dist/js/bootstrap-select.min.js"></script>
    <script src="<?= base_url('assets/'); ?>./js/custom.min.js"></script>
    <script src="<?= base_url('assets/'); ?>./js/deznav-init.js"></script>

</body>

</html>