<?php

class Auth extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model('teacher/M_auth');
        $this->load->model('M_guru');
    }
    public function index()
    {
        if ($this->session->userdata('id_guru') && $this->session->userdata('level') == 'guru') {
            redirect(base_url() . 'teacher/dashboard');
        } else {
            $this->load->view('teacher/auth/login');
        }
    }

    public function linked_account()
    {
        $this->load->view('teacher/auth/linked');
    }
    public function linked_proccess()
    {
        if (!$this->uri->segment(4)) {
            $this->load->view('errors/custom', ['pesanerror' => 'Link verifikasi tidak valid/kadaluarsa 1']);
        } else {
            $kodeunik = $this->uri->segment(4);
            $nik = explode('=', base64_decode($kodeunik))[0];
            $tanggal = explode('=', base64_decode($kodeunik))[1];

            if ($this->M_auth->cekkodeunik($kodeunik, $nik) < 1) {
                $this->load->view('errors/custom', ['pesanerror' => 'Link verifikasi tidak valid/kadaluarsa 2']);
            } else if (date('Y-m-d') != $tanggal) {
                $this->load->view('errors/custom', ['pesanerror' => 'Link verifikasi tidak valid/kadaluarsa 3']);
            } else {
                $data = [
                    'dataguru' => $this->M_guru->dataspesifikguru($nik)[0]
                ];
                $this->load->view('teacher/auth/linked_proccess', $data);
            }
        }
    }

    public function verif_email()
    {
        if (!$this->uri->segment(4)) {

            $this->load->view('teacher/auth/verifemail');
        } else {
            $kodeunik = $this->uri->segment(4);
            // var_dump(base64_decode('=', $kodeunik));
            $nik = explode('=', base64_decode($kodeunik))[0];
            $tanggal = explode('=', base64_decode($kodeunik))[1];
            if ($this->M_auth->cekkodeunik($kodeunik, $nik) < 1) {
                $this->load->view('errors/custom', ['pesanerror' => 'Link verifikasi tidak valid/kadaluarsa 2']);
            } else if (date('Y-m-d') != $tanggal) {
                $this->load->view('errors/custom', ['pesanerror' => 'Link verifikasi tidak valid/kadaluarsa 3']);
            } else {
                $this->M_auth->aktifkanuser($nik);
                $this->M_auth->resetkodeunik($nik);
                $this->session->set_flashdata('flash', ['alert' => 'success', 'message' => 'Akun berhasil di aktifkan, silahkan login']);
                redirect(base_url('teacher/auth'));
            }
        }
    }

    public function logout()
    {
        $this->session->sess_destroy();
        $this->session->set_flashdata('message', '<div class="alert alert-success" role="alert">
       Anda Berhasil Logout !
     </div>');
        redirect('teacher/auth');
    }
}
