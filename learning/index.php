
<?php 
session_start();
include 'config/db.php';
$oke = mysqli_query($con,"select * from tb_sekolah where id_sekolah='1'");
$oke1 = mysqli_fetch_array($oke);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>LMS SMK Nagara</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!--===============================================================================================-->
    <link rel="shortcut icon" type="image/png" href="vendor/images/favicon.png"/>
    <!--===============================================================================================-->
    <link rel="stylesheet" type="text/css" href="vendor/login/vendor/bootstrap/css/bootstrap.min.css">
    <!--===============================================================================================-->
    <link rel="stylesheet" type="text/css" href="vendor/login/fonts/font-awesome-4.7.0/css/font-awesome.min.css">
    <!--===============================================================================================-->
    <link rel="stylesheet" type="text/css" href="vendor/login/fonts/iconic/css/material-design-iconic-font.min.css">
    <!--===============================================================================================-->
    <link rel="stylesheet" type="text/css" href="vendor/login/vendor/animate/animate.css">
    <!--===============================================================================================-->
    <link rel="stylesheet" type="text/css" href="vendor/login/vendor/css-hamburgers/hamburgers.min.css">
    <!--===============================================================================================-->
    <link rel="stylesheet" type="text/css" href="vendor/login/vendor/animsition/css/animsition.min.css">
    <!--===============================================================================================-->
    <link rel="stylesheet" type="text/css" href="vendor/login/vendor/select2/select2.min.css">
    <!--===============================================================================================-->
    <link rel="stylesheet" type="text/css" href="vendor/login/vendor/daterangepicker/daterangepicker.css">
    <!--===============================================================================================-->
    <link rel="stylesheet" type="text/css" href="vendor/login/css/util.css">
    <link rel="stylesheet" type="text/css" href="vendor/login/css/main.css">
    <style>
        body {
            background: linear-gradient(to top, rgba(175, 238, 250, 0.31), rgba(51, 209, 110, 0.58));
        }
        /* Custom styles for the two-column layout */
        .login-container {
            display: flex;
            height: 100vh;
        }
        .login-left {
            background-image: url('vendor/images/siswa.png'); /* Replace with your actual image */
            background-size: cover;
            background-position: center;
            width: 50%;
        }
        .login-right {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 50%;
            padding: 20px;
        }
        .login-form {
            width: 100%;
            max-width: 400px;
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
<div class="login-container">
    <div class="login-left"></div> <!-- Image section -->

    <div class="login-right">
        <!-- User's added code -->
        <div class="limiter">
            <div class="container-login100" style="background-image: url('vendor/login/images/');">
                <div class="wrap-login100 p-l-55 p-r-55 p-t-170 p-b-54">
                    <!-- Back to Homepage Button -->
     <a href="../../../../lms" class="back-homepage">
        <i class="fa fa-arrow-left"></i> Kembali ke Homepage
    </a>
                    <br>
                    <center><img src="vendor/images/favicon.png" alt="" height="100" width="100"></center>
                    <br>
                    <form method="post" action="" class="login100-form validate-form">
                        <span class="login100-form-title p-b-49">
                            E-Learning
                        </span>
                        <div class="wrap-input100 validate-input m-b-23" data-validate="Username is required">
                            <span for="nis" class="label-input100">Username</span>
                            <input class="input100" type="text" name="username" placeholder="Type your username">
                            <span class="focus-input100" data-symbol="&#xf206;"></span>
                        </div>
                        <div class="wrap-input100 validate-input m-b-23" data-validate="Password is required">
                            <span for="Password" class="label-input100">Password</span>
                            <input class="input100" type="password" name="password" placeholder="Type your password">
                            <span class="focus-input100" data-symbol="&#xf190;"></span>
                        </div>
                        <div class="wrap-input100 validate-input" data-validate="Password is required">
                            <span class="label-input100">User</span>
                            <select name="level" class="form-control" required style="background-color: #212121;border-radius: 7px;color: #fff;font-weight: bold;">
                                <option value="">-- Pilih Level --</option>
                                <option value="1"> Guru </option>
                                <option value="2"> Siswa </option>
                                <option value="3"> Admin </option>
                            </select>
                        </div>
                        <div class="text-right p-t-8 p-b-31">
                            <a href="https://wa.me/6281385094206">Forgot password?</a>
                        </div>
                        <div class="container-login100-form-btn m-b-23">
                            <div class="wrap-login100-form-btn">
                                <div class="login100-form-bgbtn"></div>
                                <button value="LOGIN" name="Login" type="submit" class="login100-form-btn">Login</button>
                            </div>
                        </div>
                        <div class="container-login100-form-btn">
                            <div class="wrap-login100-form-btn">
                                <div class="login100-form-bgbtn"></div>
                                <button value="daftar_elearning" type="submit" class="login100-form-btn" onclick="window.location.href='Home/Registrasion.php'">Daftar Akun Siswa?</button>
                            </div>
                        </div>
                    </form>
                    <?php
                    // PHP validation and login logic (unchanged from the original)

  if($_SERVER['REQUEST_METHOD']=='POST'){
   $email = trim(mysqli_real_escape_string($con, $_POST['username']));
   $pass = sha1($_POST['password']); 
   $level = $_POST['level'];

  if ($level =='1') {
      $sql = mysqli_query($con,"SELECT * FROM tb_guru WHERE email='$email' AND password='$pass' AND status='Y' ") or die(mysqli_error($con)) ;
      $data = mysqli_fetch_array($sql);
      $id = $data [0];
      $cek = mysqli_num_rows($sql);

	// Replace with PDO or at least parameterized queries
	$stmt = $con->prepare("SELECT * FROM tb_guru WHERE email=? AND password=? AND status='Y'");
	$stmt->bind_param("ss", $email, $pass);
	$stmt->execute();
	$result = $stmt->get_result();

      if ($cek >0 ){
      $_SESSION['Guru'] = $id;
      $_SESSION['upload_gambar']= TRUE;
      
              echo "
              <script type='text/javascript'>
              setTimeout(function () {
              swal({
             title: 'Sukses',
              text:  'Login Berhasil..',
              type: 'success',
              timer: 3000,
              showConfirmButton: true
              });     
              },10);  
              window.setTimeout(function(){ 
              window.location.replace('Guru/index.php');
              } ,3000);   
              </script>";
             
      }else{
          echo "
          <script type='text/javascript'>
          setTimeout(function () {
          swal({
          title: 'Error',
           text:  'User ID / Password Salah Atau Belum Dikonfirmasi Oleh Admin !',
          type: 'error',
          timer: 3000,
          showConfirmButton: true
          });     
          },10);  
          window.setTimeout(function(){ 
          window.location.replace('?pages=login');
          } ,3000);   
          </script>";
      }

  } elseif ($level =='2') { 
    $sql = mysqli_query($con,"SELECT * FROM tb_siswa WHERE nis='$email' AND password='$pass' AND aktif='Y' ") or die(mysqli_error($con)) ;
      $data = mysqli_fetch_array($sql);
      $id = $data [0];
      $cek = mysqli_num_rows($sql);

      if ($cek >0 ){

      $_SESSION['Siswa'] = $id;
      $_SESSION['username']     = $data['nis'];
      $_SESSION['namalengkap']  = $data['nama_siswa'];
      $_SESSION['password']     = $data['password'];
      $_SESSION['nis']          = $data['nis'];
      $_SESSION['id_siswa']          = $data['id_siswa'];
      $_SESSION['kelas']        = $data['id_kelas'];
      $_SESSION['jurusan']        = $data['id_jurusan'];
       $_SESSION['tingkat']        = $data['tingkat'];
      mysqli_query($con,"UPDATE tb_siswa SET status='Online' WHERE id_siswa='$data[id_siswa]'");
             echo "
              <script type='text/javascript'>
              setTimeout(function () {
              swal({
              title: 'Sukses',
              text:  'Login Berhasil..',
              type: 'success',
              timer: 3000,
              showConfirmButton: true
              });     
              },10);  
              window.setTimeout(function(){ 
              window.location.replace('Siswa/index.php');
              } ,3000);   
              </script>";           
      }else{
               echo "
          <script type='text/javascript'>
          setTimeout(function () {
          swal({
          title: 'MAAF !',
          text:  'User ID / Password Salah Atau Belum Dikonfirmasi Oleh Admin !',
          type: 'error',
          timer: 3000,
          showConfirmButton: true
          });     
          },10);  
          window.setTimeout(function(){ 
          window.location.replace('?pages=login');
          } ,3000);   
          </script>";

      }

}elseif ($level =='3') {
  $sql = mysqli_query($con,"SELECT * FROM tb_admin WHERE username='$email' AND password='$pass' AND aktif='Y' ") or die(mysqli_error($con)) ;
  $data = mysqli_fetch_array($sql);
  $id = $data [0];
  $cek = mysqli_num_rows($sql);

  if ($cek >0 ){
  $_SESSION['Admin'] = $id;
  $_SESSION['upload_gambar']= TRUE;
  
          echo "
          <script type='text/javascript'>
          setTimeout(function () {
          swal({
          title: 'Admin',
          text:  'Login Berhasil..',
          type: 'success',
          timer: 3000,
          showConfirmButton: true
          });     
          },10);  
          window.setTimeout(function(){ 
          window.location.replace('Admin/index.php');
          } ,3000);   
          </script>";
         
  }else{
      echo "
      <script type='text/javascript'>
      setTimeout(function () {
      swal({
      title: 'Gagal',
       text:  'User ID / Password Salah Atau Belum Dikonfirmasi Oleh Admin !',
      type: 'error',
      timer: 3000,
      showConfirmButton: true
      });     
      },10);  
      window.setTimeout(function(){ 
      window.location.replace('?pages=login');
      } ,3000);   
      </script>";
  }
}
}
?>
                    
                </div>
            </div>
        </div>
    </div> <!-- Form section -->
</div>
<div id="dropDownSelect1"></div>
<!--===============================================================================================-->
<script src="vendor/login/vendor/jquery/jquery-3.2.1.min.js"></script>
<!--===============================================================================================-->
<script src="vendor/login/vendor/animsition/js/animsition.min.js"></script>
<!--===============================================================================================-->
<script src="vendor/login/vendor/bootstrap/js/popper.js"></script>
<script src="vendor/login/vendor/bootstrap/js/bootstrap.min.js"></script>
<!--===============================================================================================-->
<script src="vendor/login/vendor/select2/select2.min.js"></script>
<!--===============================================================================================-->
<script src="vendor/login/vendor/daterangepicker/moment.min.js"></script>
<script src="vendor/login/vendor/daterangepicker/daterangepicker.js"></script>
<!--===============================================================================================-->
<script src="vendor/login/vendor/countdowntime/countdowntime.js"></script>
<script src="vendor/login/js/main.js"></script>

</body>
</html>