<?php

class Kamera extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model('M_user');
        if (!$this->session->userdata('id')) {
            redirect(base_url() . 'auth');
        }
    }
    public function camera2()
    {
        $data = [
            'title' => WEBNAME . ' Absen',
            'webname' => WEBNAME,

        ];
        //  $this->load->view('templates/header', $data);
        $this->load->view('absen/siswa');
        // $this->load->view('templates/footer');
    }
    public function index()
    {
        $datauser = $this->M_user->getUserById($this->session->userdata('id'))[0];
        if ($datauser['role_id'] != 1) {
            echo 'Anda tidak diizinkan untuk akses halaman ini';
           exit;
        }
        
        $data = [
            'title' => WEBNAME . ' Absen',
            'webname' => WEBNAME,

        ];
        //  $this->load->view('templates/header', $data);
        $this->load->view('absen/kamera');
        // $this->load->view('templates/footer');
    }
}
