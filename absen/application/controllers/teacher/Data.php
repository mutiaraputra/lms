<?php

class Data extends CI_Controller
{

    public function __construct()
    {
        parent::__construct();
        $this->load->model('teacher/M_auth');
        $this->load->model('M_guru');
        $this->load->model('teacher/M_data');
        if (!$this->session->userdata('id_guru')) {
            redirect(base_url() . 'teacher/auth');
        }
        if ($this->session->userdata('level') != 'guru') {
            echo 'Anda tidak diizinkan untuk akses halaman ini';
            exit;
        }
    }

    // dashboard admin
    public function absen()
    {
        $this->load->helper('sf_helper');
        $datauser = array_merge($this->M_auth->getUserByNik($this->session->userdata('nik'))[0], ['level' => $this->session->userdata('level')]);

        $this->load->model('M_absensi');

        $data = [
            'title' => WEBNAME . 'Guru Dashboard',
            'user' => $datauser,
            'webname' => WEBNAME,
            'guru' => $this->M_guru->dataspesifikguru($datauser['nik'])
        ];

        $this->load->view('teacher/templates/header', $data);
        $this->load->view('teacher/data/absen');
        $this->load->view('teacher/templates/footer');
    }

    public function libur()
    {
        $this->load->helper('sf_helper');
        $datauser = array_merge($this->M_auth->getUserByNik($this->session->userdata('nik'))[0], ['level' => $this->session->userdata('level')]);

        $datalibur = $this->M_data->datalibur();
        $data = [
            'title' => WEBNAME . 'Guru Dashboard',
            'user' => $datauser,
            'webname' => WEBNAME,
            'datalibur' => $datalibur
        ];

        $this->load->view('teacher/templates/header', $data);
        $this->load->view('teacher/data/libur');
        $this->load->view('teacher/templates/footer');
    }

    public function cetak_kartu()
    {
        $datauser = array_merge($this->M_auth->getUserByNik($this->session->userdata('nik'))[0], ['level' => $this->session->userdata('level')]);
        $this->load->helper('sf_helper');
        generateQrSiswa($datauser['nik_guru'], 'guru/' . $datauser['nik_guru'] . '.png');
        function encode_img_base64($img_path = false, $img_type = 'png')
        {
            if ($img_path) {
                //convert image into Binary data
                $img_data = fopen($img_path, 'rb');
                $img_size = filesize($img_path);
                $binary_image = fread($img_data, $img_size);
                fclose($img_data);

                //Build the src string to place inside your img tag
                $img_src = "data:image/" . $img_type . ";base64," . str_replace("\n", "", base64_encode($binary_image));

                return $img_src;
            }

            return false;
        }
        $path = './assets/qr/guru/' . $datauser['nik_guru'] . '.png';
        $img = encode_img_base64($path);
        $data = [
            'user' => $datauser,
            'webname' => WEBNAME,
            'img' => $img
        ];
        $this->load->library('pdf');
        $customPaper = array(0, 0, 300, 500); // Custom paper size
        $this->pdf->setPaper('A6', 'portrait');
        $this->pdf->filename = "Kartu Absen - " . $data['user']['nama_guru'] . ".pdf";
        $this->pdf->load_view('teacher/data/kartuabsen', $data);
        //   $this->load->view('guru/data/kartuabsen',$data);
    }


    // profile / pengaturan akun
    public function profile()
    {
        $this->load->helper('sf_helper');
        $datauser = array_merge($this->M_auth->getUserByNik($this->session->userdata('nik'))[0], ['level' => $this->session->userdata('level')]);
        $dataakun = $this->M_data->dataakunguru($this->session->userdata('nik'))[0];

        $data = [
            'title' => WEBNAME . 'Guru Dashboard',
            'user' => $datauser,
            'webname' => WEBNAME,
            'dataakun' => $dataakun
        ];

        $this->load->view('teacher/templates/header', $data);
        $this->load->view('teacher/data/profile');
        $this->load->view('teacher/templates/footer');
    }
}
