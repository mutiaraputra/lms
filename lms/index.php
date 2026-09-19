<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LMS SMK Nagara</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome for Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <!-- Slick CSS -->
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css"/>
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css"/>
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js"></script>

    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(to top, rgba(175, 238, 250, 0.31), rgba(51, 209, 110, 0.58));
            color: blue;
        }
        
        .container {
            margin-top: 30px;
            align-items: center;
        }

        .menu-images img {
            width: 50px;
            height: 50px;
            object-fit: contain;
        }
        .menu-images a {
            text-decoration: none;
            color: purple;
        }
        .menu-images a:hover {
            color: #ffd700;
        }
        .header-section {
            text-align: center;
            margin-top: 50px;
            margin-bottom: 20px;
        }
        .header-section img {
            width: 350px;
            height: auto;
        }
        .header-section h1 {
            margin-top: 10px;
            font-size: 2rem;
        }
        footer {
            background-color: #222;
        }
        
        .carousel-container {
            max-width: 800px;
            padding: 30px 0;
            margin: 0 auto;
        }

        .slick-slide img {
            width: 100%;
        }

        .carousel-caption {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            text-align: center;
            background-color: rgba(0, 0, 0, 0.5);
            padding: 10px;
        }

        
        .social-buttons, .share-buttons {
            position: fixed;
            top: 30%;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .social-buttons {
            left: 10px;
        }

        .share-buttons {
            right: 10px;
        }

        .social-buttons a, .share-buttons a {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            color: white;
            border-radius: 50%;
            text-decoration: none;
            font-size: 18px;
        }

        /* Specific Colors for Social Media Buttons */
        .facebook { background-color: #3b5998; }
        .twitter { background-color: #1da1f2; }
        .instagram { background-color:#d94cb8; }
        .youtube { background-color: #ff0000; }
        .whatsapp { background-color: #25d366; }
        .tiktok { background-color: #000000; }
        .social-buttons a:hover, .share-buttons a:hover {
            opacity: 0.8;
        }

        /* Contact Section */
        .contact-section {
            background-color: #f8f9fa;
            padding: 30px 0;
        }
        
        .contact-section h2 {
            color: #333;
            font-size: 1.8rem;
            margin-bottom: 20px;
            font-weight: bold;
        }
        
        .contact-item {
            display: flex;
            align-items: center;
            gap: 15px;
            font-size: 1.1rem;
            color: #555;
            margin-bottom: 10px;
        }

        .contact-item i {
            color: #007bff;
            font-size: 1.5rem;
        }

        .map-container {
            position: relative;
            overflow: hidden;
            height: 300px;
        }

        .map-container iframe {
            width: 100%;
            height: 100%;
            border: none;
        }

        .contact-details {
            text-align: center;
            padding: 20px;
        }

        .gradient-bg {
        background: linear-gradient(to right, #006400, #90ee90); /* Hijau tua ke hijau muda */
        color: white; /* Mengubah teks menjadi putih agar kontras */
        display: inline-block;
        padding: 10px 20px;
        border-radius: 5px;
        }

    </style>
</head>
<body>
	<div class="container-fluid"></div>
	<br>
	<div class="text-center">
	<img src="gambar/logosmk.png" alt="Logo SMK Nagara">
	</div>
    <!-- Header Section with Logo and Text -->
   <div class="container-fluid text-center header-section">
    <a href="https://smknagara.id/" class="alert alert-success display-6 text-decoration-none px-5 py-2 gradient-bg">Portal SMK Nagara</a>
    </div>


    <!-- Social Media Buttons on the Left -->
    <div class="social-buttons">
        <a href="https://www.youtube.com/@stemberland8991" target="_blank" class="youtube"><i class="fab fa-youtube"></i></a>
        <a href="https://tiktok.com" target="_blank" class="tiktok"><i class="fab fa-tiktok"></i></a>
        <a href="https://www.instagram.com/smk_nagara/" target="_blank" class="instagram"><i class="fab fa-instagram"></i></a>
    </div>

    <!-- Share Buttons on the Right -->
    <div class="share-buttons">
        <a href="https://www.facebook.com/sharer/sharer.php?u=https://smknagara.id" target="_blank" class="facebook"><i class="fab fa-facebook-f"></i></a>
        <a href="https://twitter.com/intent/tweet?url=https://smknagara.id" target="_blank" class="twitter"><i class="fab fa-twitter"></i></a>
        <a href="https://wa.me/?text=https://smknagara.id" target="_blank" class="whatsapp"><i class="fab fa-whatsapp" class="instagram"></i></a>
    </div>

    <!-- Menu with Images -->
    <div class="container text-center menu-images mt-2">
        <div class="row">
            <div class="col-md-6">
                <a href="../learning/">
                    <img src="gambar/lms.png" alt="LMS">
                    <p>Learning Management System (LMS)</p>
                </a>
            </div>
            <div class="col-md-6">
                <a href="https://ujian.smknagara.id/">
                    <img src="gambar/ujian.png" alt="Ujian">
                    <p>Ujian SMK Nagara</p>
                </a>
            </div>

        </div>
    </div>


    <!-- Carousel Section -->
    <div class="container carousel-container">
        <div id="slick-carousel" class="carousel">
            <div>
                <img src="gambar/c1.png" alt="Image 1">
            </div>
            <div>
                <img src="gambar/c2.png" alt="Image 2">
            </div>
            <div>
                <img src="gambar/c3.png" alt="Image 3">
            </div>
        </div>
    </div>

    <!-- Menu Aplikasi Siswa Below Carousel -->
    <div class="container text-center menu-images mt-2">
        <div class="row">
            <div class="col-md-4">
                <a href="../absen/">
                    <img src="gambar/cam.png" alt="Ujian">
                    <p>Kelola Presensi</p>
                </a>
            </div>
            <div class="col-md-4">
                <a href="../absen/?jenis=guru">
                    <img src="gambar/pregur.svg" alt="Absen Guru">
                    <p>Absen Guru</p>
                </a>
            </div>
            <div class="col-md-4">
                <a href="../absen/?jenis=siswa">
                    <img src="gambar/presis.png" alt="Absen Siswa">
                    <p>Absen Siswa</p>
                </a>
            </div>
        </div>
    </div>


    <!-- Contact Section -->
    <section class="contact-section">
        <div class="container">
           
            <div class="row">
                <div class="col-md-4 contact-details">
                    <div class="contact-item">
                        <i class="fas fa-phone"></i>
                        <span>+62 (351) 4487225</span>
                    </div>
                    <div class="contact-item">
                        <i class="fas fa-envelope"></i>
                        <span>smknagara1@gmail.com</span>
                    </div>
                    <div class="contact-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Jl. Raya Kedunggalar-Jogorogo Km.06</span>
                    </div>
                </div>
                <div class="col-md-8">
                    <div class="map-container">
                    <iframe src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d247.2583321537278!2d111.27989411367268!3d-7.45049986165255!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sid!2sid!4v1731322150302!5m2!1sid!2sid" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                    </div>
                </div>
            </div>
        </div>
    </section>
    <!-- Footer -->
    <footer class="bg-dark text-white text-center py-4 mt-5">
        <p>&copy; Developed By SMK Nagara. 2024.</p>
    </footer>

    <!-- Bootstrap JS and Slick Carousel Initialization -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    <script type="text/javascript">
        $(document).ready(function(){
            $('#slick-carousel').slick({
                dots: true,
                infinite: true,
                speed: 500,
                slidesToShow: 1,
                slidesToScroll: 1,
                autoplay: true,
                autoplaySpeed: 2500,
                prevArrow: '<button type="button" class="slick-prev">Previous</button>',
                nextArrow: '<button type="button" class="slick-next">Next</button>'
            });
        });
    </script>

</body>
</html>
