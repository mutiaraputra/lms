<?php

class Dashboard extends CI_Controller
{

    public function __construct()
    {
        parent::__construct();
        $this->load->model('teacher/M_auth');
        if (!$this->session->userdata('id_guru')) {
            redirect(base_url() . 'teacher/auth');
        }
        if ($this->session->userdata('level') != 'guru') {
            echo 'Anda tidak diizinkan untuk akses halaman ini';
            exit;
        }
    }

    // dashboard admin
    public function index()
    {
        $this->load->helper('sf_helper');

        $datauser = array_merge($this->M_auth->getUserByNik($this->session->userdata('nik'))[0], ['level' => $this->session->userdata('level')]);

        $this->load->model('M_absensi');
        $data = [
            'title' => WEBNAME . 'Guru Dashboard',
            'user' => $datauser,
            'webname' => WEBNAME,
            'cekliburnasional' => $this->M_absensi->cekliburnasional(date('Y-m-d')),
            'cekliburweekend' => $this->M_absensi->cekstatusweekend(strtolower(hari_ini()))
        ];

        $this->load->view('teacher/templates/header', $data);
        $this->load->view('teacher/dashboard/index');
        $this->load->view('teacher/templates/footer');
    }
}
