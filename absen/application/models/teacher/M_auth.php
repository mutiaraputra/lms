<?php


class M_auth extends CI_Model
{

    public function cekkodeunik($kodeunik, $nik)
    {
        return $this->db->where(['nik_guru' => $nik, 'kode_unik' => $kodeunik])
            ->get('login_guru')->num_rows();
    }
    public function getUserByNik($nik)
    {
        return $this->db->select('*')
            ->from('login_guru')->join('tabel_guru', 'tabel_guru.nik = login_guru.nik_guru')
            ->where('nik', $nik)->get()->result_array();
    }
    public function aktifkanuser($nik)
    {
        $data = [
            'is_active' => 1
        ];
        $this->db->where('nik_guru', $nik)->update('tb_guru', $data);
    }

    public function resetkodeunik($nik)
    {
        $data = [
            'kode_unik' => null
        ];
        $this->db->where('nik_guru', $nik)->update('tb_guru', $data);
    }
}
