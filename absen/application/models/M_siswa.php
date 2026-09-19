<?php
class M_siswa extends CI_Model
{

    public function datasiswa()
    {
        return  $this->db->select('*')
            ->from('tabel_siswa')
            ->join('tabel_kelas', 'tabel_kelas.id_kelas = tabel_siswa.kode_kelas')
            ->get()->result_array();

        // return  $this->db->get('tabel_siswa')->result_array();
    }
    public function datasiswaByKelas($idkelas, $idjurusan)
    {
        $where = [
            'kode_kelas' => $idkelas
        ];
        return  $this->db->select('*')
            ->from('tabel_siswa')
            ->join('tabel_kelas', 'tabel_kelas.id_kelas = tabel_siswa.kode_kelas')
            ->where($where)
            ->get()->result_array();
        // return $this->db->where($where)->get('tabel_siswa')->result_array();

    }
    public function dataspesifiksiswa($nis)
    {
        return  $this->db->select('*')
            ->from('tabel_siswa')
            ->join('tabel_kelas', 'tabel_kelas.id_kelas = tabel_siswa.kode_kelas')
            ->where('nis', $nis)->get()->result_array();
    }
    public function inputsiswa($nohp)
    {
        $datasiswa = [
            'id_siswa' => 'SISWA' . random_int(100, 999),
            'nama_siswa' => $this->input->post('nama', true),
            'nis' => $this->input->post('nis', true),
            'tgl_lahir' => $this->input->post('tgl_lahir'),
            'jenis_kelamin' => $this->input->post('jeniskelamin', true),
            'alamat' => $this->input->post('alamat', true),
            'no_telepon' => $nohp,
            'kode_jurusan' => 'default',
            'kode_kelas' => $this->input->post('kelas', true),
            'gambar' => 'default'
        ];
        $this->db->insert('tabel_siswa', $datasiswa);
    }

    public function selectnohp($nomor, $nis)
    {
        return   $this->db->select('no_telepon')
            ->where('nis', $nis)->get('tabel_siswa')->num_rows();
    }

    public function editsiswa($nomorhp)
    {
        $data = [
            'nama_siswa' => $this->input->post('nama', true),
            'nis' => $this->input->post('nis'),
            'tgl_lahir' => $this->input->post('tgl_lahir'),
            'jenis_kelamin' => $this->input->post('jeniskelamin'),
            'alamat' => $this->input->post('alamat', true),
            'no_telepon' => $nomorhp,
            'kode_kelas' => $this->input->post('kelas')

        ];
        $this->db->where('id_siswa', $this->input->post('id_siswa'))
            ->update('tabel_siswa', $data);
    }
    public function deletesiswa($idsiswa)
    {
        $this->db->delete('tabel_siswa', ['id_siswa' => $idsiswa]);
    }

    // absen siswa
    public function CekSiswa($nis)
    {
        return $this->db->where('nis', $nis)
            ->get('tabel_siswa')->num_rows();
    }
    // absen by siswa,
    public function detailsiswa($nis)
    {
        return $this->db->where('nis', $nis)
            ->get('tabel_siswa')->result_array();
    }

    //

    public function DataSiswaByKelasDanJurusan()
    {
        $query = $this->db->query("SELECT DISTINCT kode_kelas FROM tabel_siswa ORDER BY kode_kelas ASC");
        $result = $query->result_array();
        return $result;
    }

    public function sinkron_data()
    {
    // Koneksi ke database 'learning'
    $learning_db = $this->load->database('learning', TRUE); // Asumsi konfigurasi 'learning' ada di database.php

    // Ambil data dari tabel 'tb_siswa' di database 'learning'
    $query_learning = $learning_db->select('id_siswa, nis, nama_siswa, tgl_lahir, jk, alamat, no_telepon, id_kelas, id_jurusan, foto')
    ->from('tb_siswa')
    ->get()->result_array();

    // Ambil data dari tabel 'tabel_siswa' di database 'absen'
    $query_absen = $this->db->select('id_siswa, nis, nama_siswa, tgl_lahir, jenis_kelamin, alamat, no_telepon, kode_kelas, kode_jurusan, gambar')
    ->from('tabel_siswa')
    ->get()->result_array();

    // Convert data absen ke array associative berdasarkan id_siswa
    $data_absen = [];
    foreach ($query_absen as $row) {
        $data_absen[$row['id_siswa']] = $row;
    }

    // Sinkronisasi: menambah data yang ada di learning tapi belum ada di absen
    foreach ($query_learning as $row_learning) {
        if (!isset($data_absen[$row_learning['id_siswa']])) {
            $insert_data = [
                'id_siswa' => $row_learning['id_siswa'],
                'nis' => $row_learning['nis'],
                'nama_siswa' => $row_learning['nama_siswa'],
                'tgl_lahir' => $row_learning['tgl_lahir'],
                'jenis_kelamin' => $row_learning['jk'],
                'alamat' => $row_learning['alamat'],
                'no_telepon' => $row_learning['no_telepon'],
                'kode_kelas' => $row_learning['id_kelas'],
                'kode_jurusan' => $row_learning['id_jurusan'],
                'gambar' => $row_learning['foto']
            ];
            $this->db->insert('tabel_siswa', $insert_data);
        }
    }

    // Sinkronisasi: menghapus data yang ada di absen tapi tidak ada di learning
    foreach ($data_absen as $id_siswa => $row_absen) {
        $exists_in_learning = array_filter($query_learning, function($row_learning) use ($id_siswa) {
            return $row_learning['id_siswa'] == $id_siswa;
        });

        if (empty($exists_in_learning)) {
            $this->db->where('id_siswa', $id_siswa)->delete('tabel_siswa');
        }
    }
    }

    public function syncKelas() {
        // Koneksi ke database learning
        $learning_db = $this->load->database('learning', TRUE);

        // Ambil data dari tb_master_kelas (database learning)
        $learning_kelas = $learning_db->get('tb_master_kelas')->result_array();

        // Ambil data dari tabel_kelas (database absen)
        $absen_kelas = $this->db->get('tabel_kelas')->result_array();

        // Sinkronisasi data (update atau insert ke tabel_kelas)
        foreach ($learning_kelas as $kelas) {
            $exists = $this->db->get_where('tabel_kelas', ['id_kelas' => $kelas['id_kelas']])->row_array();

            if ($exists) {
                // Jika ada, update
                $this->db->where('id_kelas', $kelas['id_kelas']);
                $this->db->update('tabel_kelas', [
                    'nama_kelas' => $kelas['nama_kelas'],
                    'kelas' => $kelas['kelas']
                ]);
            } else {
                // Jika tidak ada, insert
                $this->db->insert('tabel_kelas', [
                    'id_kelas' => $kelas['id_kelas'],
                    'nama_kelas' => $kelas['nama_kelas'],
                    'kelas' => $kelas['kelas']
                ]);
            }
        }
    }
    public function syncJurusan() {
        // Koneksi ke database learning
        $learning_db = $this->load->database('learning', TRUE);

        // Ambil data dari tb_master_jurusan (database learning)
        $learning_jurusan = $learning_db->get('tb_master_jurusan')->result_array();

        // Ambil data dari tabel_jurusan (database absen)
        $absen_jurusan = $this->db->get('tabel_jurusan')->result_array();

        // Sinkronisasi data (update atau insert ke tabel_jurusan)
        foreach ($learning_jurusan as $jurusan) {
            $exists = $this->db->get_where('tabel_jurusan', ['id_jurusan' => $jurusan['id_jurusan']])->row_array();

            if ($exists) {
                // Jika ada, update
                $this->db->where('id_jurusan', $jurusan['id_jurusan']);
                $this->db->update('tabel_jurusan', [
                    'jurusan' => $jurusan['jurusan']
                ]);
            } else {
                // Jika tidak ada, insert
                $this->db->insert('tabel_jurusan', [
                    'id_jurusan' => $jurusan['id_jurusan'],
                    'jurusan' => $jurusan['jurusan']
                ]);
            }
        }
    }


}
