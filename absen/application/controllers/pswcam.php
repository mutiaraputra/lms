<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Pswcam extends CI_Controller {

    public function index() {
        $this->load->view('absen/pswcam_view.php'); // Load tampilan form password
    }

    public function authenticate() {
        $input_password = $this->input->post('password');
        $correct_password = 'Lms2024'; // Ganti dengan password yang diinginkan

        if ($input_password === $correct_password) {
            $this->session->set_userdata('authenticated', true);
            redirect('Camera');
        } else {
            $data['error'] = "Password salah. Coba lagi.";
            $this->load->view('absen/pswcam_view.php', $data);
        }
    }
}
