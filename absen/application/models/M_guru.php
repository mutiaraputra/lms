<?php
class M_guru extends CI_Model
{

    public function dataguru()
    {
        return  $this->db->select('*')
            ->from('tabel_guru')
            ->get()->result_array();

        // return  $this->db->get('tabel_guru')->result_array();
    }
    
    public function dataspesifikguru($nik)
    {
        return  $this->db->select('*')
            ->from('tabel_guru')
            ->where('nik', $nik)->get()->result_array();
    }
    public function inputguru($nohp)
    {
        $dataguru = [
            'id_guru' => 'GURU' . random_int(100, 999),
            'nama_guru' => $this->input->post('nama', true),
            'nik' => $this->input->post('nik', true),
            'tgl_lahir' => $this->input->post('tgl_lahir'),
            'jk' => $this->input->post('jeniskelamin', true),
            'alamat' => $this->input->post('alamat', true),
            'no_telepon' => $nohp,
            'foto' => 'default'
        ];
        $this->db->insert('tabel_guru', $dataguru);
    }

     // Fungsi sinkronisasi untuk guru
     public function syncGuru() {
        // Koneksi ke database learning
        $learning_db = $this->load->database('learning', TRUE);

        // Ambil data dari tb_guru (database learning)
        $learning_guru = $learning_db->get('tb_guru')->result_array();

        // Ambil data dari tabel_guru (database absen)
        $absen_guru = $this->db->get('tabel_guru')->result_array();

        // Sinkronisasi data (update atau insert ke tabel_guru)
        foreach ($learning_guru as $guru) {
            // Cek apakah data guru sudah ada di tabel_guru
            $exists = $this->db->get_where('tabel_guru', ['id_guru' => $guru['id_guru']])->row_array();

            if ($exists) {
                // Jika ada, update data guru
                $this->db->where('id_guru', $guru['id_guru']);
                $this->db->update('tabel_guru', [
                    'nama_guru'     => $guru['nama_guru'],
                    'nik'           => $guru['nik'],
                    'tgl_lahir'     => $guru['tgl_lahir'],
                    'jenis_kelamin' => $guru['jk'],
                    'alamat'        => $guru['alamat'],
                    'no_telepon'    => $guru['no_telepon'],
                    'gambar'        => $guru['foto'] // menyesuaikan kolom foto dengan gambar
                ]);
            } else {
                // Jika tidak ada, insert data guru
                $this->db->insert('tabel_guru', [
                    'id_guru'       => $guru['id_guru'],
                    'nama_guru'     => $guru['nama_guru'],
                    'nik'           => $guru['nik'],
                    'tgl_lahir'     => $guru['tgl_lahir'],
                    'jenis_kelamin' => $guru['jk'],
                    'alamat'        => $guru['alamat'],
                    'no_telepon'    => $guru['no_telepon'],
                    'gambar'        => $guru['foto'] // menyesuaikan kolom foto dengan gambar
                ]);
            }
        }
    }

    public function selectnohp($nomor, $nik)
    {
        return   $this->db->select('no_telepon')
            ->where('nik', $nik)->get('tabel_guru')->num_rows();
    }

    public function editguru($nomorhp)
    {
        $data = [
            'nama_guru' => $this->input->post('nama', true),
            'nik' => $this->input->post('nik'),
            'tgl_lahir' => $this->input->post('tgl_lahir'),
            'jk' => $this->input->post('jeniskelamin'),
            'alamat' => $this->input->post('alamat', true),
            'no_telepon' => $nomorhp,
        ];
        $this->db->where('id_guru', $this->input->post('id_guru'))
            ->update('tabel_guru', $data);
    }
    public function deleteguru($idguru)
    {
        $this->db->delete('tabel_guru', ['id_guru' => $idguru]);
    }

    // absen guru
    public function CekGuru($nik)
    {
        return $this->db->where('nik', $nik)
            ->get('tabel_guru')->num_rows();
    }
    // absen by guru,
    public function detailguru($nik)
    {
        return $this->db->where('nik', $nik)
            ->get('tabel_guru')->result_array();
    }
}
