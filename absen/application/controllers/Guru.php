<?php

class Guru extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model('M_guru');
        $this->load->model('M_bantuan');
        $this->load->library('form_validation');
        if (!$this->session->userdata('id')) {
            redirect(base_url() . 'auth');
        }
    }
    public function index()
    {
        $datauser = $this->M_user->getUserById($this->session->userdata('id'))[0];
        $url = $this->uri->segment(1);
        verifikasiuser($datauser['role_id'], $url);

        $guru = $this->M_guru->dataguru();

        $this->load->helper('sf_helper');

        $data = [
            'title' => WEBNAME . 'Data Guru',
            'webname' => WEBNAME,
            'guru' => $guru,
            'user' =>  $this->M_user->getUserById($this->session->userdata('id'))[0]
        ];
        $this->load->view('templates/header', $data);
        $this->load->view('guru/index');
        $this->load->view('templates/footer');
    }

    public function add()
    {
        $data = [
            'title' => WEBNAME . 'Menu access',
            'webname' => WEBNAME,
            'kelas' => $this->M_kelas->tampilkelas(),
            'user' =>  $this->M_user->getUserById($this->session->userdata('id'))[0]
        ];
        $this->load->view('templates/header', $data);
        $this->load->view('guru/formtambahguru');
        $this->load->view('templates/footer');
    }

    public function sinkronisasi()
    {
        $this->M_guru->syncGuru();
        $this->session->set_flashdata('flash', ['alert' => 'success', 'message' => 'Data guru berhasil di sinkronkan']);
        redirect(base_url() . 'guru');
    }

    // proses input tambah guru
    public function tambahguru()
    {
        $this->form_validation->set_rules('nama', 'nama', 'required|min_length[5]|trim');
        $this->form_validation->set_rules('nis', 'nis', 'required|min_length[10]|max_length[10]|is_unique[tabel_guru.nis]', [
            'is_unique' => 'Nomor induk guru ' . $this->input->post('nis') . ' sudah ada di database'
        ]);
        if ($this->form_validation->run() != FALSE) {
            if ($this->input->post('jeniskelamin')) {
                $nomorhp = $this->M_bantuan->formatnomor($this->input->post('nomor_hp'));
                $this->M_guru->inputguru($nomorhp);
                $this->session->set_flashdata('flash', ['alert' => 'success', 'message' => 'guru Berhasil di tambah']);
            } else {
                $this->session->set_flashdata('flash', ['alert' => 'danger', 'message' => 'Jenis kelamin wajib diisi']);
            }
        } else {
            $this->session->set_flashdata('flash', ['alert' => 'danger', 'message' => validation_errors()]);
        }
        $kelas = $this->input->get('kelas');
        $jurusan = $this->input->get('jurusan');
        redirect(base_url() . 'guru/?kelas=' . $kelas . '&jurusan=' . $jurusan);
    }

    // form edit guru
    public function edit()
    {
        if ($this->input->post('nis') != FALSE) {
            $nis = $this->input->post('nis');
            $dataguru = $this->M_guru->dataspesifikguru($nis)[0];
            $data = [
                'title' => WEBNAME . 'Edit guru',
                'webname' => WEBNAME,
                'guru' => $dataguru,
                'kelas' => $this->M_kelas->tampilkelas(),
                'user' =>  $this->M_user->getUserById($this->session->userdata('id'))[0]
            ];
            $this->load->view('templates/header', $data);
            $this->load->view('guru/formeditguru');
            $this->load->view('templates/footer');
        } else {
            redirect(base_url() . 'guru');
        }
    }

    public function editguru()
    {
        $idguru = $this->input->post('id_guru');
        $nisawal = $this->M_bantuan->cekValue('nis', 'tabel_guru', 'id_guru', $idguru);
        // validasi Nis
        if ($this->input->post('nis') == $nisawal) {
            $is_unique_nis = '';
        } else {
            $is_unique_nis = '|is_unique[tabel_guru.nis]';
        }
        $this->form_validation->set_rules('nis', 'nis', 'required|trim' . $is_unique_nis, [
            'is_unique' => 'Nomor induk sudah ada di database'
        ]);
        $this->form_validation->set_rules('nama', 'Nama', 'required|trim');
        $this->form_validation->set_rules('alamat', 'alamat', 'required|trim');

        if ($this->form_validation->run() != FALSE) {
            $nomorhp = $this->M_bantuan->formatnomor($this->input->post('nomor_hp'));
            $this->M_guru->editguru($nomorhp);
            $this->session->set_flashdata('flash', ['alert' => 'success', 'message' => 'guru Berhasil di ubah']);
        } else {
            $this->session->set_flashdata('flash', ['alert' => 'danger', 'message' => validation_errors()]);
        }
        redirect(base_url() . 'guru');
    }
    public function kartuguru()
    {
        $nik =  $this->input->post('nik');
        $nama =  $this->input->post('nama');
        $datauser = array(
            'nik_guru' => $nik,
            'nama_guru' => $nama
        );
        $this->load->helper('sf_helper');
        generateQrSiswa($nik, 'guru/' . $nik . '.png');
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
        $path = './assets/qr/guru/' . $nik . '.png';
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
    }
    public function delete()
    {
        if ($this->input->post('id_guru') != FALSE) {
            $this->M_guru->deleteguru($this->input->post('id_guru'));
            $this->session->set_flashdata('flash', ['alert' => 'success', 'message' => 'guru berhasil dihapus']);
        }
        redirect(base_url() . 'guru');
    }


    // kelas
    public function kelas()
    {
        $datauser = $this->M_user->getUserById($this->session->userdata('id'))[0];
        $url = $this->uri->segment(1) . '/' . $this->uri->segment(2);
        verifikasiuser($datauser['role_id'], $url);



        $data = [
            'title' => WEBNAME . 'Kelola Kelas & Jurusan',
            'webname' => WEBNAME,
            'kelas' => $this->M_kelas->tampilkelas(),
            'jurusan' => $this->M_jurusan->tampiljurusan(),
            'user' =>  $this->M_user->getUserById($this->session->userdata('id'))[0]
        ];
        $this->load->view('templates/header', $data);
        $this->load->view('guru/kelas');
        $this->load->view('templates/footer');
    }

    public function tambahkelas()
    {
        $this->form_validation->set_rules(
            'nama_kelas',
            'Nama_kelas',
            'required|is_unique[tabel_kelas.nama_kelas]',
            [
                'is_unique' => 'nama kelas ' . $this->input->post('nama_kelas') . ' sudah ada di database'
            ]
        );
        $this->form_validation->set_rules('kelas', 'Kelas', 'required|is_unique[tabel_kelas.kelas]', [
            'is_unique' => 'Kelas ' . $this->input->post('kelas') . ' sudah ada di database'
        ]);

        if ($this->form_validation->run() == FALSE) {
            $this->session->set_flashdata('flash', ['alert' => 'danger', 'message' => validation_errors()]);
        } else {
            $this->M_kelas->inputkelas();
            $this->session->set_flashdata('flash', ['alert' => 'success', 'message' => 'Data berhasil di input']);
        }
        redirect(base_url() . 'guru/kelas');
    }


    public function hapuskelas()
    {
        $this->M_kelas->hapuskelas(base64_decode($this->uri->segment(3)));
        $this->session->set_flashdata('flash', ['alert' => 'success', 'message' => 'Kelas berhasil di hapus']);
        redirect(base_url() . 'guru/kelas');
    }

    public function editkelas()
    {
        $this->form_validation->set_rules(
            'nama_kelas',
            'Nama_kelas',
            'required'
        );
        $this->form_validation->set_rules('kelas', 'Kelas', 'required');

        if ($this->form_validation->run() == FALSE) {
            $this->session->set_flashdata('flash', ['alert' => 'danger', 'message' => validation_errors()]);
        } else {
            $this->M_kelas->editkelas();
            $this->session->set_flashdata('flash', ['alert' => 'success', 'message' => 'Data berhasil di edit']);
        }
        redirect(base_url() . 'guru/kelas');
    }

    // kelola jurusan 
    public function tambahjurusan()
    {
        $this->form_validation->set_rules('namajurusan', 'Namajurusan', 'required|min_length[3]|is_unique[tabel_jurusan.jurusan]', [
            'min_length' => 'Nama jurusan minimal 3 karakter',
            'is_unique' => 'Jurusan ' . $this->input->post('namajurusan') . ' sudah terdaftar'
        ]);
        if ($this->form_validation->run() == FALSE) {
            $this->session->set_flashdata('flash', ['alert' => 'danger', 'message' => validation_errors()]);
        } else {
            $this->M_jurusan->tambahjurusan();
            $this->session->set_flashdata('flash', ['alert' => 'success', 'message' => 'Jurusan' . $this->input->post('namajurusan') . ' berhasil di tambahkan']);
        }
        redirect(base_url() . 'guru/kelas');
    }

    public function hapusjurusan()
    {
        $this->M_jurusan->hapusjurusan(base64_decode($this->uri->segment(3)));
        $this->session->set_flashdata('flash', ['alert' => 'success', 'message' => 'Jurusan berhasil di hapus']);
        redirect(base_url() . 'guru/kelas');
    }


    public function editjurusan()
    {
        $this->form_validation->set_rules(
            'namajurusan',
            'namajurusan',
            'required|min_length[3]',
            [
                'min_length' => 'Nama jurusan minimal 3 karakter'
            ]
        );
        // $this->form_validation->set_rules('kelas', 'Kelas', 'required');
        if ($this->form_validation->run() == FALSE) {
            $this->session->set_flashdata('flash', ['alert' => 'danger', 'message' => validation_errors()]);
        } else {
            $this->M_jurusan->editjurusan();
            $this->session->set_flashdata('flash', ['alert' => 'success', 'message' => 'Data berhasil di edit']);
        }
        redirect(base_url() . 'guru/kelas');
    }
}
